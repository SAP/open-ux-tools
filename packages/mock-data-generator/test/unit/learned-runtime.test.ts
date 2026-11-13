import { createRequire } from 'node:module';
import {
    createLearnedRuntime,
    parseSftConfiguration,
    type LearnedComponentFactories
} from '../../src/model/learned-runtime.js';
import type { PackagedModelManifest } from '../../src/model/packaged-models.js';
import type { VerifiedModelArtifacts } from '../../src/model/runtime-artifacts.js';
import type { SemanticClassifier, SftCandidateRelevanceVerifier, SftGenerator } from '../../src/types.js';
import { SHIPPED_SFT_GENERATION_CONFIG } from './sft-prompt-template.js';

const file = (role: string, path: string, checksum: string) => ({
    role,
    path,
    bytes: 1,
    sha256: checksum.repeat(64)
});

function manifest(): PackagedModelManifest {
    return {
        formatVersion: 1,
        bundleId: 'runtime-test',
        revision: '1'.repeat(40),
        runtime: { package: 'onnxruntime-node', version: '1.24.3' },
        datasets: [],
        components: [
            {
                id: 'classifier',
                kind: 'classifier',
                version: '1.0.0',
                fingerprint: 'a'.repeat(64),
                files: [
                    file('encoder', 'classifier/model.onnx', '1'),
                    file('vocabulary', 'classifier/vocab.txt', '2'),
                    file('classifier-head', 'classifier/head.json', '3')
                ],
                contract: { inputFormat: 'v3', inputs: ['input_ids'], outputs: ['last_hidden_state'] },
                license: 'Apache-2.0',
                modelCard: 'https://example.invalid/card'
            },
            {
                id: 'sft',
                kind: 'sft',
                version: '1.0.0',
                fingerprint: 'b'.repeat(64),
                files: [
                    file('model', 'sft/model.onnx', '4'),
                    file('tokenizer', 'sft/tokenizer.json', '5'),
                    file('generation-config', 'sft/manifest.json', '6')
                ],
                contract: { inputFormat: 'row-object-v1', inputs: ['input_ids'], outputs: ['logits'] },
                license: 'Apache-2.0',
                modelCard: 'https://example.invalid/card'
            }
        ]
    };
}

const cache: VerifiedModelArtifacts = {
    ready: true,
    failures: [],
    files: new Map([
        [
            'classifier',
            new Map([
                ['encoder', '/cache/classifier/model.onnx'],
                ['vocabulary', '/cache/classifier/vocab.txt'],
                ['classifier-head', '/cache/classifier/head.json']
            ])
        ],
        [
            'sft',
            new Map([
                ['model', '/cache/sft/model.onnx'],
                ['tokenizer', '/cache/sft/tokenizer.json'],
                ['generation-config', '/cache/sft/manifest.json']
            ])
        ]
    ])
};

describe('learned runtime composition', () => {
    test('loads classifier and SFT independently and disposes both', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'classifier',
            classify: jest.fn()
        };
        const sft: SftGenerator = { fingerprint: 'sft', generate: jest.fn() };
        const disposeClassifier = jest.fn(async () => undefined);
        const disposeSft = jest.fn(async () => undefined);
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(async () => ({ value: classifier, dispose: disposeClassifier })),
            sft: jest.fn(async () => ({ value: sft, dispose: disposeSft }))
        };

        const result = await createLearnedRuntime(manifest(), cache, factories);

        expect(result.runtime).toEqual({ classifier, sft });
        expect(result.diagnostics).toEqual([]);
        await result.dispose();
        expect(disposeClassifier).toHaveBeenCalledTimes(1);
        expect(disposeSft).toHaveBeenCalledTimes(1);
    });

    test('forwards a qualified verifier from the shared classifier encoder runtime', async () => {
        const classifier: SemanticClassifier = { fingerprint: 'classifier', classify: jest.fn() };
        const candidateVerifier: SftCandidateRelevanceVerifier = {
            fingerprint: 'qualified-relevance',
            verifyBatch: jest.fn(async () => [true])
        };
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(async () => ({ value: classifier, candidateVerifier })),
            sft: jest.fn(async () => ({ value: { fingerprint: 'sft', generate: jest.fn() } }))
        };

        const result = await createLearnedRuntime(manifest(), cache, factories);

        expect(result.runtime.candidateVerifier).toBe(candidateVerifier);
    });

    test('degrades a failed classifier without losing a usable SFT runtime', async () => {
        const sft: SftGenerator = { fingerprint: 'sft', generate: jest.fn() };
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(async () => {
                throw new Error('unsupported classifier runtime');
            }),
            sft: jest.fn(async () => ({ value: sft }))
        };

        const result = await createLearnedRuntime(manifest(), cache, factories);

        expect(result.runtime).toEqual({ sft });
        expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'CLASSIFIER_RUNTIME_UNAVAILABLE', componentId: 'classifier' })
        ]);
    });

    test('does not call component factories for an unverified cache', async () => {
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(),
            sft: jest.fn()
        };
        const result = await createLearnedRuntime(
            manifest(),
            {
                ready: false,
                files: new Map(),
                failures: [{ componentId: 'classifier', role: 'encoder', reason: 'missing' }]
            },
            factories
        );

        expect(result.runtime).toEqual({});
        expect(result.diagnostics[0]?.code).toBe('MODEL_CACHE_UNAVAILABLE');
        expect(factories.classifier).not.toHaveBeenCalled();
        expect(factories.sft).not.toHaveBeenCalled();
    });

    test('loads a fully verified component when another cache component is unavailable', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'classifier',
            classify: jest.fn()
        };
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(async () => ({ value: classifier })),
            sft: jest.fn()
        };

        const result = await createLearnedRuntime(
            manifest(),
            {
                ready: false,
                files: new Map([['classifier', cache.files.get('classifier')!]]),
                failures: [{ componentId: 'sft', role: 'model', reason: 'missing' }]
            },
            factories
        );

        expect(result.runtime).toEqual({ classifier });
        expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'SFT_RUNTIME_UNAVAILABLE', componentId: 'sft' })
        ]);
        expect(factories.classifier).toHaveBeenCalledTimes(1);
        expect(factories.sft).not.toHaveBeenCalled();
    });

    test('rejects components that require a different installed ONNX runtime', async () => {
        const incompatible: PackagedModelManifest = {
            ...manifest(),
            runtime: { package: 'onnxruntime-node', version: '1.24.2' }
        };
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(),
            sft: jest.fn()
        };

        const result = await createLearnedRuntime(incompatible, cache, factories);

        expect(result.runtime).toEqual({});
        expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'CLASSIFIER_RUNTIME_UNAVAILABLE', componentId: 'classifier' }),
            expect.objectContaining({ code: 'SFT_RUNTIME_UNAVAILABLE', componentId: 'sft' })
        ]);
        expect(factories.classifier).not.toHaveBeenCalled();
        expect(factories.sft).not.toHaveBeenCalled();
    });

    test('names the required and the installed ONNX runtime version in each component diagnostic', async () => {
        // Given a manifest that requires a runtime version other than the installed one
        const installed = (createRequire(import.meta.url)('onnxruntime-node/package.json') as { version: string })
            .version;
        const incompatible: PackagedModelManifest = {
            ...manifest(),
            runtime: { package: 'onnxruntime-node', version: '0.0.1' }
        };
        // When the learned runtime loads
        const result = await createLearnedRuntime(incompatible, cache, { classifier: jest.fn(), sft: jest.fn() });
        // Then every component reports the version it requires and the version found
        expect(result.diagnostics.map(({ cause }) => cause)).toEqual([
            `onnxruntime-node 0.0.1 is required by model component classifier; found ${installed}`,
            `onnxruntime-node 0.0.1 is required by model component sft; found ${installed}`
        ]);
    });
});

describe('SFT generation config', () => {
    const config = {
        numHiddenLayers: 30,
        numKeyValueHeads: 3,
        hiddenSize: 576,
        numAttentionHeads: 9,
        samplingOptions: {
            temperature: 0.6,
            topP: 0.9,
            repetitionPenalty: 1.15,
            noRepeatNgramSize: 4,
            maxNewTokens: 300
        },
        promptTemplate: SHIPPED_SFT_GENERATION_CONFIG.promptTemplate
    };

    it('uses spaced separators unless the artifact declares compact ones', () => {
        expect(parseSftConfiguration(config)).toMatchObject({ jsonSeparators: 'spaced' });
        expect(parseSftConfiguration({ ...config, runtimeContract: 2, jsonSeparators: 'compact' })).toMatchObject({
            jsonSeparators: 'compact'
        });
    });

    it('accepts and ignores the sampling keys the runtime does not apply', () => {
        expect(parseSftConfiguration(config).samplingOptions).toEqual({
            temperature: 0.6,
            topP: 0.9,
            repetitionPenalty: 1.15
        });
    });

    it('rejects an unsupported prompt or runtime contract and an unknown separator style', () => {
        expect(() => parseSftConfiguration({ ...config, promptContractVersion: 2 })).toThrow('prompt contract');
        expect(() => parseSftConfiguration({ ...config, runtimeContract: 1 })).toThrow('runtime contract');
        expect(() => parseSftConfiguration({ ...config, jsonSeparators: 'any' })).toThrow('separators');
    });

    it('requires the prompt template and parses it strictly', () => {
        // Given the shipped prompt template and defective variants of it
        const template = SHIPPED_SFT_GENERATION_CONFIG.promptTemplate as Record<string, unknown>;
        const { promptTemplate: _omitted, ...withoutTemplate } = config;
        // When each variant is parsed, Then every defect is rejected with what was expected
        expect(() => parseSftConfiguration(withoutTemplate)).toThrow('SFT promptTemplate must be an object');
        expect(() => parseSftConfiguration({ ...config, promptTemplate: { ...template, extra: 1 } })).toThrow(
            'unexpected keys: extra'
        );
        expect(() => parseSftConfiguration({ ...config, promptTemplate: { ...template, systemPrompt: '' } })).toThrow(
            'systemPrompt must be a non-empty string'
        );
        expect(() => parseSftConfiguration({ ...config, promptTemplate: { ...template, exampleRow: {} } })).toThrow(
            'exampleRow must not be empty'
        );
        expect(() =>
            parseSftConfiguration({ ...config, promptTemplate: { ...template, exampleRow: { Amount: [1] } } })
        ).toThrow('exampleRow.Amount must be a string or a finite number');
        expect(() =>
            parseSftConfiguration({ ...config, promptTemplate: { ...template, exampleRow: { '1': 'x' } } })
        ).toThrow('exampleRow keys must be non-numeric names');
        expect(() =>
            parseSftConfiguration({
                ...config,
                promptTemplate: { ...template, chatMarkers: { turnStart: '<|im_start|>' } }
            })
        ).toThrow('chatMarkers.turnEnd must be a non-empty string');
    });
});
