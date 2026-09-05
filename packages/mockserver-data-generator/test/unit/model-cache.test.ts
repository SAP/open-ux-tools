import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { modelBundleDirectory, verifyModelCache } from '../../src/model/model-cache.js';
import { parseModelManifest, type ModelManifest } from '../../src/model/manifest.js';

const bytes = Buffer.from('tiny model fixture');
const checksum = createHash('sha256').update(bytes).digest('hex');
const runtimeBytes = Buffer.from('module.exports = {};');
const runtimeChecksum = createHash('sha256').update(runtimeBytes).digest('hex');

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
            files: [
                {
                    role: 'entry',
                    path: `runtime/${process.platform}-${process.arch}/index.cjs`,
                    bytes: runtimeBytes.length,
                    sha256: runtimeChecksum,
                    url: `https://models.example.invalid/${'1'.repeat(40)}/runtime/index.cjs`
                }
            ],
            license: { name: 'MIT', url: 'https://example.invalid/runtime-license' },
            sourceUrl: 'https://example.invalid/runtime-source',
            sbomUrl: 'https://example.invalid/runtime-sbom'
        }
    ];
    return parseModelManifest(candidate);
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

    test('verifies the selected platform runtime and exposes only its checksum-verified entry', async () => {
        const candidate = releaseManifest();
        const bundleDirectory = modelBundleDirectory(cacheRoot, candidate);
        const modelPath = join(bundleDirectory, 'classifier/model.onnx');
        const runtimePath = join(bundleDirectory, `runtime/${process.platform}-${process.arch}/index.cjs`);
        await mkdir(join(modelPath, '..'), { recursive: true });
        await mkdir(join(runtimePath, '..'), { recursive: true });
        await writeFile(modelPath, bytes);
        await writeFile(runtimePath, runtimeBytes);

        const result = await verifyModelCache(cacheRoot, candidate);

        expect(result.ready).toBe(true);
        expect(result.runtime).toEqual({
            id: `onnxruntime-node-${process.platform}-${process.arch}`,
            package: 'onnxruntime-node',
            version: '1.24.3',
            fingerprint: 'c'.repeat(64),
            entry: runtimePath,
            files: new Map([['entry', runtimePath]])
        });
    });

    test('requires the selected platform runtime before marking a release cache ready', async () => {
        const candidate = releaseManifest();
        const modelPath = join(modelBundleDirectory(cacheRoot, candidate), 'classifier/model.onnx');
        await mkdir(join(modelPath, '..'), { recursive: true });
        await writeFile(modelPath, bytes);

        const result = await verifyModelCache(cacheRoot, candidate);

        expect(result.ready).toBe(false);
        expect(result.files.has('semantic-classifier')).toBe(true);
        expect(result.runtime).toBeUndefined();
        expect(result.failures).toEqual([
            expect.objectContaining({
                componentId: `onnxruntime-node-${process.platform}-${process.arch}`,
                role: 'entry',
                reason: 'missing'
            })
        ]);
    });

    test('propagates cancellation raised inside the actual checksum stream', async () => {
        const candidate = manifest();
        const modelPath = join(modelBundleDirectory(cacheRoot, candidate), 'classifier/model.onnx');
        await mkdir(join(modelPath, '..'), { recursive: true });
        await writeFile(modelPath, bytes);
        const controller = new AbortController();
        const cancellation = new Error('cancelled during checksum stream');
        const originalThrowIfAborted = controller.signal.throwIfAborted.bind(controller.signal);
        let cancellationChecks = 0;
        Object.defineProperty(controller.signal, 'throwIfAborted', {
            value: (): void => {
                cancellationChecks += 1;
                if (cancellationChecks === 5) {
                    controller.abort(cancellation);
                }
                originalThrowIfAborted();
            }
        });

        await expect(verifyModelCache(cacheRoot, candidate, controller.signal)).rejects.toBe(cancellation);
        expect(cancellationChecks).toBeGreaterThanOrEqual(5);
    });
});
