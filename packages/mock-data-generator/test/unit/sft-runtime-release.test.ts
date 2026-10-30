import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as causalSession from '../../src/model/causal-onnx-session.js';
import * as sftRuntime from '../../src/model/sft-runtime.js';
import * as smolTokenizer from '../../src/model/smollm-tokenizer.js';
import type { PackagedModelManifest } from '../../src/model/packaged-models.js';

// The prompt texts of the shipped SFT artifact, read as data so this file imports no runtime module before its mocks.
const shippedPromptTemplate: unknown = (
    JSON.parse(readFileSync(new URL('../../resources/models/sft/generation-config.json', import.meta.url), 'utf8')) as {
        promptTemplate: unknown;
    }
).promptTemplate;
const disposeSession = jest.fn(async () => undefined);
const sourceModule = (path: string): string => fileURLToPath(new URL(`../../src/model/${path}`, import.meta.url));
jest.unstable_mockModule(sourceModule('causal-onnx-session.ts'), () => ({
    ...causalSession,
    createCausalOnnxBackend: () => ({}),
    createCausalOnnxSession: async () => ({ dispose: disposeSession })
}));
jest.unstable_mockModule(sourceModule('smollm-tokenizer.ts'), () => ({
    ...smolTokenizer,
    createSmolLm2Tokenizer: () => ({})
}));
jest.unstable_mockModule(sourceModule('sft-runtime.ts'), () => ({
    ...sftRuntime,
    createRowGenerator: () => {
        throw new TypeError('synthetic SFT generator failure');
    }
}));
const { createLearnedRuntime } = await import('../../src/model/learned-runtime.js');

const runtimeVersion = (createRequire(import.meta.url)('onnxruntime-node/package.json') as { version: string }).version;

describe('SFT runtime native resource release', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-sft-release-'));
        disposeSession.mockClear();
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('releases the causal session when the generator cannot be built around it', async () => {
        // Given a verified SFT component whose generator construction fails after its session was created
        const configuration = {
            numHiddenLayers: 1,
            numKeyValueHeads: 1,
            hiddenSize: 2,
            numAttentionHeads: 1,
            samplingOptions: { temperature: 1, topP: 1, repetitionPenalty: 1 },
            promptTemplate: shippedPromptTemplate
        };
        await writeFile(join(directory, 'generation-config.json'), JSON.stringify(configuration));
        await writeFile(join(directory, 'tokenizer.json'), '{}');
        const manifest: PackagedModelManifest = {
            formatVersion: 1,
            bundleId: 'sft-release',
            revision: '3'.repeat(40),
            runtime: { package: 'onnxruntime-node', version: runtimeVersion },
            datasets: [],
            components: [
                {
                    id: 'sft',
                    kind: 'sft',
                    version: '1.0.0',
                    fingerprint: 'b'.repeat(64),
                    files: [],
                    contract: { inputFormat: 'row-object-v1', inputs: ['input_ids'], outputs: ['logits'] },
                    license: 'Apache-2.0',
                    modelCard: 'https://example.invalid/card'
                }
            ]
        };
        const files = new Map([
            ['model', join(directory, 'model.onnx')],
            ['tokenizer', join(directory, 'tokenizer.json')],
            ['generation-config', join(directory, 'generation-config.json')]
        ]);

        // When the learned runtime loads
        const handle = await createLearnedRuntime(manifest, {
            ready: true,
            failures: [],
            files: new Map([['sft', files]])
        });

        // Then SFT is unavailable with the cause and its native session was released
        expect(handle.runtime.sft).toBeUndefined();
        expect(handle.diagnostics).toEqual([
            expect.objectContaining({ code: 'SFT_RUNTIME_UNAVAILABLE', cause: 'synthetic SFT generator failure' })
        ]);
        expect(disposeSession).toHaveBeenCalledTimes(1);
        await handle.dispose();
    });
});
