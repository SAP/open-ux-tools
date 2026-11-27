import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as embeddingClassifier from '../../src/model/embedding-classifier.js';
import { parsePackagedModelManifest, verifyPackagedModels } from '../../src/model/packaged-models.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT } from '../../src/semantics/field-context.js';
import type { EmbeddingClassifierHead } from '../../src/model/embedding-classifier.js';

const release = jest.fn(async () => undefined);
const createSession = jest.fn(async () => ({ run: jest.fn(), release }));
jest.unstable_mockModule('onnxruntime-node', () => ({
    InferenceSession: { create: createSession },
    Tensor: class {}
}));
jest.unstable_mockModule(fileURLToPath(new URL('../../src/model/embedding-classifier.ts', import.meta.url)), () => ({
    ...embeddingClassifier,
    createEmbeddingSemanticClassifier: () => {
        throw new TypeError('synthetic classifier construction failure');
    }
}));
const { createLearnedRuntime } = await import('../../src/index.js');

const sha256 = (content: string): string => createHash('sha256').update(content).digest('hex');

describe('learned runtime native resource release', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-runtime-release-'));
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('releases the encoder session when the classifier fails after the encoder loaded', async () => {
        // Given verified classifier artifacts whose classifier construction fails after the encoder session exists
        const encoder = 'synthetic encoder bytes';
        const vocabulary = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'email'].join('\n');
        const head: EmbeddingClassifierHead = {
            model: 'synthetic-release',
            dim: 2,
            labels: ['unknown', 'email'],
            coef: [
                [0, 0],
                [0, 0]
            ],
            intercept: [10, 0],
            inputFormat: 'v3',
            maxWordPieceTokens: 64,
            encoderSha256: sha256(encoder),
            tokenizerSha256: sha256(vocabulary),
            serializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            registryFingerprint: packagedRoleRegistry().fingerprint,
            abstentionLabels: ['unknown'],
            roleCalibration: { email: 0.5 },
            familyCalibration: { contact: 0.5 },
            calibration: {
                temperature: 1,
                routeConfidenceThreshold: 0.5,
                annotationOverrideThreshold: 0.99,
                conformalQuantile: 0.9,
                coverage: 0.9,
                ece: { before: 0, after: 0 },
                source: 'synthetic release fixture'
            }
        };
        const artifacts = [
            { role: 'encoder', path: 'encoder.onnx', content: encoder },
            { role: 'vocabulary', path: 'vocab.txt', content: vocabulary },
            { role: 'classifier-head', path: 'head.json', content: JSON.stringify(head) }
        ];
        await Promise.all(artifacts.map(({ path, content }) => writeFile(join(directory, path), content)));
        const packaged = parsePackagedModelManifest({
            formatVersion: 1,
            bundleId: 'synthetic-release',
            revision: '2'.repeat(64),
            runtime: { package: 'onnxruntime-node', version: '1.24.3' },
            components: [
                {
                    id: 'classifier',
                    kind: 'classifier',
                    version: 'synthetic',
                    fingerprint: sha256(JSON.stringify(head)),
                    license: 'Apache-2.0',
                    modelCard: 'https://example.invalid/synthetic-classifier',
                    contract: { inputFormat: 'v3', inputs: ['input_ids'], outputs: ['last_hidden_state'] },
                    files: artifacts.map(({ role, path, content }) => ({
                        role,
                        path,
                        bytes: Buffer.byteLength(content),
                        sha256: sha256(content)
                    }))
                }
            ]
        });
        const cache = await verifyPackagedModels(directory, packaged);

        // When the learned runtime loads
        const handle = await createLearnedRuntime(packaged, cache);

        // Then the classifier is reported unavailable with the cause and its encoder session was released
        expect(handle.runtime.classifier).toBeUndefined();
        expect(handle.diagnostics).toEqual([
            expect.objectContaining({
                code: 'CLASSIFIER_RUNTIME_UNAVAILABLE',
                cause: 'synthetic classifier construction failure'
            })
        ]);
        expect(createSession).toHaveBeenCalledTimes(1);
        expect(release).toHaveBeenCalledTimes(1);
        await handle.dispose();
    });
});
