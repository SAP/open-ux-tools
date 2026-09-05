import { createLearnedRuntime, type LearnedComponentFactories } from '../../src/model/learned-runtime.js';
import { parseModelManifest, type ModelManifest } from '../../src/model/manifest.js';
import type { VerifiedModelCache } from '../../src/model/model-cache.js';
import type { SemanticClassifier, SftGenerator } from '../../src/types.js';

const file = (role: string, path: string, checksum: string) => ({
    role,
    path,
    bytes: 1,
    sha256: checksum.repeat(64),
    url: `https://example.invalid/${path}`
});

function manifest(): ModelManifest {
    return parseModelManifest({
        formatVersion: 1,
        bundleId: 'runtime-test',
        revision: '1'.repeat(40),
        lifecycle: 'development',
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
                runtime: {
                    backend: 'onnx',
                    package: 'onnxruntime-node',
                    version: '1.24.3',
                    inputs: ['input_ids'],
                    outputs: ['last_hidden_state'],
                    outputFormat: 'embedding-classifier-v2'
                },
                license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                modelCardUrl: 'https://example.invalid/card'
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
                runtime: {
                    backend: 'onnx',
                    package: 'onnxruntime-node',
                    version: '1.24.3',
                    inputs: ['input_ids'],
                    outputs: ['logits'],
                    outputFormat: 'row-object-v1'
                },
                license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                modelCardUrl: 'https://example.invalid/card'
            }
        ]
    });
}

function releaseManifest(): ModelManifest {
    const candidate = JSON.parse(JSON.stringify(manifest())) as any;
    candidate.formatVersion = 2;
    candidate.runtimes = [
        {
            id: `onnxruntime-node-${process.platform}-${process.arch}`,
            package: 'onnxruntime-node',
            version: '1.24.3',
            platform: process.platform,
            architecture: process.arch,
            fingerprint: 'c'.repeat(64),
            entry: `runtime/${process.platform}-${process.arch}/index.cjs`,
            files: [file('entry', `runtime/${process.platform}-${process.arch}/index.cjs`, '7')],
            license: { name: 'MIT', url: 'https://example.invalid/runtime-license' },
            sourceUrl: 'https://example.invalid/runtime-source',
            sbomUrl: 'https://example.invalid/runtime-sbom'
        }
    ];
    return parseModelManifest(candidate);
}

const cache: VerifiedModelCache = {
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
        const incompatible = JSON.parse(JSON.stringify(manifest())) as any;
        incompatible.components.forEach((component: any) => (component.runtime.version = '1.24.2'));
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(),
            sft: jest.fn()
        };

        const result = await createLearnedRuntime(parseModelManifest(incompatible), cache, factories);

        expect(result.runtime).toEqual({});
        expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'CLASSIFIER_RUNTIME_UNAVAILABLE', componentId: 'classifier' }),
            expect.objectContaining({ code: 'SFT_RUNTIME_UNAVAILABLE', componentId: 'sft' })
        ]);
        expect(factories.classifier).not.toHaveBeenCalled();
        expect(factories.sft).not.toHaveBeenCalled();
    });

    test('passes the verified platform runtime entry to both learned component factories', async () => {
        const classifier: SemanticClassifier = { fingerprint: 'classifier', classify: jest.fn() };
        const sft: SftGenerator = { fingerprint: 'sft', generate: jest.fn() };
        const classifierFactory = jest.fn(
            async (
                _component: ModelManifest['components'][number],
                _files: ReadonlyMap<string, string>,
                runtime: Parameters<LearnedComponentFactories['classifier']>[2]
            ) => ({ value: classifier, runtime })
        );
        const sftFactory = jest.fn(
            async (
                _component: ModelManifest['components'][number],
                _files: ReadonlyMap<string, string>,
                runtime: Parameters<LearnedComponentFactories['sft']>[2]
            ) => ({ value: sft, runtime })
        );
        const runtimeCache = {
            ...cache,
            runtime: {
                id: `onnxruntime-node-${process.platform}-${process.arch}`,
                package: 'onnxruntime-node' as const,
                version: '1.24.3',
                fingerprint: 'c'.repeat(64),
                entry: '/cache/runtime/index.cjs',
                files: new Map([['entry', '/cache/runtime/index.cjs']])
            }
        };

        const result = await createLearnedRuntime(releaseManifest(), runtimeCache, {
            classifier: classifierFactory,
            sft: sftFactory
        });

        expect(result.runtime).toEqual({ classifier, sft });
        expect(classifierFactory).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'classifier' }),
            cache.files.get('classifier'),
            {
                package: 'onnxruntime-node',
                version: '1.24.3',
                fingerprint: 'c'.repeat(64),
                specifier: expect.stringMatching(/^file:/u)
            }
        );
        expect(sftFactory).toHaveBeenCalledWith(expect.objectContaining({ kind: 'sft' }), cache.files.get('sft'), {
            package: 'onnxruntime-node',
            version: '1.24.3',
            fingerprint: 'c'.repeat(64),
            specifier: expect.stringMatching(/^file:/u)
        });
    });

    test('does not fall back to an application-installed runtime for a release manifest with no verified runtime', async () => {
        const factories: LearnedComponentFactories = {
            classifier: jest.fn(),
            sft: jest.fn()
        };

        const result = await createLearnedRuntime(releaseManifest(), cache, factories);

        expect(result.runtime).toEqual({});
        expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'CLASSIFIER_RUNTIME_UNAVAILABLE', componentId: 'classifier' }),
            expect.objectContaining({ code: 'SFT_RUNTIME_UNAVAILABLE', componentId: 'sft' })
        ]);
        expect(factories.classifier).not.toHaveBeenCalled();
        expect(factories.sft).not.toHaveBeenCalled();
    });
});
