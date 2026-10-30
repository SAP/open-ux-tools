import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLearnedRuntime } from '../../src/index.js';
import { createLearnedRuntime as createModelLearnedRuntime } from '../../src/model/learned-runtime.js';
import {
    parsePackagedModelManifest,
    verifyPackagedModels,
    type PackagedModelManifest
} from '../../src/model/packaged-models.js';
import { packagedBanks, conceptValueBank } from '../../src/semantics/bank-store.js';
import { packagedRoleRegistry } from '../../src/semantics/role-registry.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, serializeFieldContextV3 } from '../../src/semantics/field-context.js';
import type { VerifiedModelArtifacts } from '../../src/model/runtime-artifacts.js';
import type { EmbeddingClassifierHead } from '../../src/model/embedding-classifier.js';
import type { OnnxTensorLike } from '../../src/model/minilm-runtime.js';

const run = jest.fn(async (feeds: Readonly<Record<string, OnnxTensorLike>>) => {
    const sequenceLength = feeds.input_ids?.dims[1] ?? 0;
    return {
        'last_hidden_state': {
            data: new Float32Array(sequenceLength * 2).fill(1),
            dims: [1, sequenceLength, 2]
        }
    };
});
const release = jest.fn(async () => undefined);
const createSession = jest.fn(async () => ({ run, release }));

jest.unstable_mockModule('onnxruntime-node', () => ({
    InferenceSession: { create: createSession },
    Tensor: class {
        constructor(
            readonly type: 'int64',
            readonly data: BigInt64Array,
            readonly dims: ReadonlyArray<number>
        ) {}
    }
}));

const concepts = [...packagedBanks().store.banks.values()].filter((bank) => bank.kind === 'concept');
const sha256 = (content: string) => createHash('sha256').update(content).digest('hex');

/**
 * Independently authored artifacts exercise the real loader; the native encoder is deterministic.
 *
 * @param directory temporary artifact directory
 * @returns the runtime manifest and its verified artifacts
 */
async function syntheticClassifier(
    directory: string
): Promise<{ manifest: PackagedModelManifest; cache: VerifiedModelArtifacts }> {
    const encoder = 'synthetic encoder bytes; inference uses the test ONNX backend';
    const vocabulary = ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'email', 'contact'].join('\n');
    const head: EmbeddingClassifierHead = {
        model: 'synthetic-concept-loader',
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
            source: 'synthetic loader fixture'
        }
    };
    const prototypes = Buffer.alloc(concepts.length * head.dim * 4);
    concepts.forEach((_, index) => prototypes.writeFloatLE(1, index * head.dim * 4));
    const artifacts = [
        { role: 'encoder', path: 'encoder.onnx', content: encoder },
        { role: 'vocabulary', path: 'vocab.txt', content: vocabulary },
        { role: 'classifier-head', path: 'head.json', content: JSON.stringify(head) },
        {
            role: 'concept-head',
            path: 'concept-head.json',
            content: JSON.stringify({
                format: 'mockgen-concept-head',
                version: 2,
                dim: head.dim,
                encoderSha256: head.encoderSha256,
                tokenizerSha256: head.tokenizerSha256,
                serializerFingerprint: head.serializerFingerprint,
                thresholds: { similarity: 0.8, margin: 0.05 },
                concepts: concepts.map(({ id }) => ({ id })),
                prototypes: prototypes.toString('base64')
            })
        }
    ];
    await Promise.all(artifacts.map(({ path, content }) => writeFile(join(directory, path), content)));
    const packaged = parsePackagedModelManifest({
        formatVersion: 1,
        bundleId: 'synthetic-concept-loader',
        revision: '1'.repeat(64),
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
    const verification = await verifyPackagedModels(directory, packaged);
    expect(verification.ready).toBe(true);
    expect(verification.failures).toEqual([]);
    return {
        manifest: packaged,
        cache: verification
    };
}

describe('concept head loading from the value-bank store', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-synthetic-concept-loader-'));
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('given a synthetic classifier, when it loads, then every concept reads its values from the store', async () => {
        const { manifest, cache } = await syntheticClassifier(directory);
        const handle = await createLearnedRuntime(manifest, cache);
        try {
            expect(handle.diagnostics).toEqual([]);
            expect(concepts.length).toBeGreaterThan(0);
            for (const concept of concepts) {
                const loaded = handle.runtime.classifier?.conceptBank?.(concept.id);
                const bank = conceptValueBank(packagedBanks().store, concept.id);
                expect(loaded).toBeDefined();
                expect(loaded?.values).toBe(bank?.values);
                expect(loaded?.pairs).toBe(bank?.pairs);
                expect(loaded?.range).toBe(bank?.range);
            }
            expect(createSession).toHaveBeenCalledWith(
                cache.files.get('classifier')?.get('encoder'),
                expect.any(Object)
            );
        } finally {
            await handle.dispose();
        }
        expect(release).toHaveBeenCalledTimes(1);
    });

    it('given a contract without value banks, when the concept head loads, then the classifier is unavailable', async () => {
        const { manifest, cache } = await syntheticClassifier(directory);
        // The full v3 contract except the value banks, so only the missing banks can fail the load.
        const handle = await createModelLearnedRuntime(manifest, cache, undefined, {
            serializeV3Input: serializeFieldContextV3,
            v3Roles: packagedRoleRegistry().roles,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        });
        try {
            expect(handle.runtime.classifier).toBeUndefined();
            expect(handle.diagnostics.map(({ code }) => code)).toEqual(['CLASSIFIER_RUNTIME_UNAVAILABLE']);
            expect(createSession).not.toHaveBeenCalled();
        } finally {
            await handle.dispose();
        }
    });
});
