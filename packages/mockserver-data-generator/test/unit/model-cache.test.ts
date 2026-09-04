import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { modelBundleDirectory, verifyModelCache } from '../../src/model/model-cache.js';
import { parseModelManifest, type ModelManifest } from '../../src/model/manifest.js';

const bytes = Buffer.from('tiny model fixture');
const checksum = createHash('sha256').update(bytes).digest('hex');

function manifest(): ModelManifest {
    return parseModelManifest({
        formatVersion: 1,
        bundleId: 'tiny-fixture',
        revision: '1'.repeat(40),
        lifecycle: 'development',
        components: [
            {
                id: 'semantic-classifier',
                kind: 'classifier',
                version: '0.0.1',
                fingerprint: 'a'.repeat(64),
                files: [
                    {
                        role: 'encoder',
                        path: 'classifier/model.onnx',
                        bytes: bytes.length,
                        sha256: checksum,
                        url: `https://models.example.invalid/${'1'.repeat(40)}/model.onnx`
                    }
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
                modelCardUrl: 'https://example.invalid/model-card'
            }
        ]
    });
}

describe('verified model cache', () => {
    let cacheRoot: string;

    beforeEach(async () => {
        cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-model-cache-'));
    });

    afterEach(async () => {
        await rm(cacheRoot, { recursive: true, force: true });
    });

    test('uses a bundle-and-revision-scoped directory and accepts exact files', async () => {
        const candidate = manifest();
        const bundleDirectory = modelBundleDirectory(cacheRoot, candidate);
        const modelPath = join(bundleDirectory, 'classifier/model.onnx');
        await mkdir(join(bundleDirectory, 'classifier'), { recursive: true });
        await writeFile(modelPath, bytes);

        const result = await verifyModelCache(cacheRoot, candidate);

        expect(result.ready).toBe(true);
        expect(result.files.get('semantic-classifier')?.get('encoder')).toBe(modelPath);
        expect(result.failures).toEqual([]);
    });

    test.each([
        ['missing', undefined],
        ['wrong size', Buffer.from('short')],
        ['wrong checksum', Buffer.from('tampered model data')]
    ])('rejects a %s artifact', async (_label, content) => {
        const candidate = manifest();
        const modelPath = join(modelBundleDirectory(cacheRoot, candidate), 'classifier/model.onnx');
        if (content) {
            await mkdir(join(modelPath, '..'), { recursive: true });
            await writeFile(modelPath, content);
        }

        const result = await verifyModelCache(cacheRoot, candidate);

        expect(result.ready).toBe(false);
        expect(result.files.size).toBe(0);
        expect(result.failures).toEqual([
            expect.objectContaining({ componentId: 'semantic-classifier', role: 'encoder' })
        ]);
    });

    test('rejects an exact artifact reached through a symbolic link', async () => {
        const candidate = manifest();
        const bundleDirectory = modelBundleDirectory(cacheRoot, candidate);
        const modelPath = join(bundleDirectory, 'classifier/model.onnx');
        const externalPath = join(cacheRoot, 'external-model.onnx');
        await mkdir(join(bundleDirectory, 'classifier'), { recursive: true });
        await writeFile(externalPath, bytes);
        await symlink(externalPath, modelPath);

        const result = await verifyModelCache(cacheRoot, candidate);

        expect(result.ready).toBe(false);
        expect(result.files.size).toBe(0);
        expect(result.failures).toEqual([
            expect.objectContaining({ componentId: 'semantic-classifier', role: 'encoder', reason: 'not-file' })
        ]);
    });
});
