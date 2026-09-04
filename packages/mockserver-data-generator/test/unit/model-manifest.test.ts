import { parseModelManifest } from '../../src/model/manifest.js';

const sha = (character: string): string => character.repeat(64);

function validManifest(): unknown {
    return {
        formatVersion: 1,
        bundleId: 'sap-ux-mockgen-preview',
        revision: '1'.repeat(40),
        lifecycle: 'preview',
        components: [
            {
                id: 'semantic-classifier',
                kind: 'classifier',
                version: '1.0.0',
                fingerprint: sha('a'),
                files: [
                    {
                        role: 'encoder',
                        path: 'classifier/model_int8.onnx',
                        bytes: 123,
                        sha256: sha('b'),
                        url: `https://models.example.invalid/${'1'.repeat(40)}/model_int8.onnx`
                    }
                ],
                runtime: {
                    backend: 'onnx',
                    package: 'onnxruntime-node',
                    version: '1.24.3',
                    inputs: ['input_ids', 'attention_mask', 'token_type_ids'],
                    outputs: ['last_hidden_state'],
                    outputFormat: 'embedding-classifier-v2'
                },
                license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                modelCardUrl: 'https://example.invalid/model-card'
            },
            {
                id: 'sft-generator',
                kind: 'sft',
                version: '1.0.0',
                fingerprint: sha('c'),
                files: [
                    {
                        role: 'model',
                        path: 'sft/model_int8.onnx',
                        bytes: 456,
                        sha256: sha('d'),
                        url: `https://models.example.invalid/${'1'.repeat(40)}/model_int8.onnx`
                    }
                ],
                runtime: {
                    backend: 'onnx',
                    package: 'onnxruntime-node',
                    version: '1.24.3',
                    inputs: ['input_ids', 'attention_mask', 'past_key_values'],
                    outputs: ['logits', 'present'],
                    outputFormat: 'row-object-v1'
                },
                license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                modelCardUrl: 'https://example.invalid/model-card'
            }
        ]
    };
}

describe('model manifest', () => {
    test('accepts independently versioned classifier and SFT artifacts', () => {
        const manifest = parseModelManifest(validManifest());

        expect(manifest.components.map(({ kind, version }) => ({ kind, version }))).toEqual([
            { kind: 'classifier', version: '1.0.0' },
            { kind: 'sft', version: '1.0.0' }
        ]);
        expect(Object.isFrozen(manifest)).toBe(true);
        expect(Object.isFrozen(manifest.components[0]?.files)).toBe(true);
    });

    test.each([
        ['mutable revision', (value: any) => (value.revision = 'main')],
        ['path traversal', (value: any) => (value.components[0].files[0].path = '../model.onnx')],
        ['absolute path', (value: any) => (value.components[0].files[0].path = '/tmp/model.onnx')],
        ['unknown output format', (value: any) => (value.components[1].runtime.outputFormat = 'free-text')],
        ['runtime version range', (value: any) => (value.components[0].runtime.version = '>=1.24.0')],
        ['invalid checksum', (value: any) => (value.components[0].files[0].sha256 = 'abc')],
        ['invalid size', (value: any) => (value.components[0].files[0].bytes = 0)],
        ['missing model card', (value: any) => delete value.components[0].modelCardUrl]
    ])('rejects %s', (_label, mutate) => {
        const candidate = validManifest();
        mutate(candidate);
        expect(() => parseModelManifest(candidate)).toThrow();
    });

    test('rejects duplicate component IDs and duplicate cache paths', () => {
        const duplicateId: any = validManifest();
        duplicateId.components[1].id = duplicateId.components[0].id;
        expect(() => parseModelManifest(duplicateId)).toThrow(/duplicate component/i);

        const duplicatePath: any = validManifest();
        duplicatePath.components[1].files[0].path = duplicatePath.components[0].files[0].path;
        expect(() => parseModelManifest(duplicatePath)).toThrow(/duplicate file path/i);
    });

    test('caps preview and stable bundle bytes while leaving development experiments explicit', () => {
        const maximumDistributedBytes = 200 * 1024 * 1024;
        const atLimit: any = validManifest();
        atLimit.components[0].files[0].bytes = maximumDistributedBytes - 456;
        expect(() => parseModelManifest(atLimit)).not.toThrow();

        const aboveLimit: any = validManifest();
        aboveLimit.components[0].files[0].bytes = maximumDistributedBytes - 455;
        expect(() => parseModelManifest(aboveLimit)).toThrow(/200 MiB/);

        aboveLimit.lifecycle = 'stable';
        expect(() => parseModelManifest(aboveLimit)).toThrow(/200 MiB/);

        aboveLimit.lifecycle = 'development';
        expect(() => parseModelManifest(aboveLimit)).not.toThrow();
    });
});
