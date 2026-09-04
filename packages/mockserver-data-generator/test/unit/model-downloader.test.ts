import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareModelCache } from '../../src/model/downloader.js';
import { modelBundleDirectory } from '../../src/model/model-cache.js';
import { parseModelManifest, type ModelManifest } from '../../src/model/manifest.js';

const modelBytes = Buffer.from('downloaded tiny model fixture');

function manifest(url: string, overrides: { bytes?: number; checksum?: string } = {}): ModelManifest {
    return parseModelManifest({
        formatVersion: 1,
        bundleId: 'tiny-download',
        revision: '2'.repeat(40),
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
                        bytes: overrides.bytes ?? modelBytes.length,
                        sha256: overrides.checksum ?? createHash('sha256').update(modelBytes).digest('hex'),
                        url
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

describe('model downloader', () => {
    let cacheRoot: string;
    let server: Server;
    let baseUrl: string;
    let requests: number;

    beforeEach(async () => {
        cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-download-'));
        requests = 0;
        server = createServer((_request, response) => {
            requests += 1;
            response.writeHead(200, { 'content-length': modelBytes.length });
            response.end(modelBytes);
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('fixture server did not bind');
        }
        baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterEach(async () => {
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        await rm(cacheRoot, { recursive: true, force: true });
    });

    test('publishes a verified download atomically and makes the warm cache network-free', async () => {
        const candidate = manifest(`${baseUrl}/model.onnx`);
        const cold = await prepareModelCache(cacheRoot, candidate);
        const warmFetch = jest.fn(async () => {
            throw new Error('network must not be used for a warm verified cache');
        });
        const warm = await prepareModelCache(cacheRoot, candidate, { fetch: warmFetch as typeof fetch });

        expect(cold.ready).toBe(true);
        expect(warm.ready).toBe(true);
        expect(requests).toBe(1);
        expect(warmFetch).not.toHaveBeenCalled();
        expect(await readdir(modelBundleDirectory(cacheRoot, candidate), { recursive: true })).not.toEqual(
            expect.arrayContaining([expect.stringMatching(/partial|lock/)])
        );
    });

    test('coalesces concurrent acquisition behind the bundle lock', async () => {
        const candidate = manifest(`${baseUrl}/model.onnx`);

        const [first, second] = await Promise.all([
            prepareModelCache(cacheRoot, candidate),
            prepareModelCache(cacheRoot, candidate)
        ]);

        expect(first.ready).toBe(true);
        expect(second.ready).toBe(true);
        expect(requests).toBe(1);
    });

    test.each([
        ['size', { bytes: modelBytes.length + 1 }],
        ['checksum', { checksum: 'f'.repeat(64) }]
    ])('never publishes a %s-mismatched artifact', async (_label, overrides) => {
        const candidate = manifest(`${baseUrl}/model.onnx`, overrides);

        await expect(prepareModelCache(cacheRoot, candidate)).rejects.toThrow();

        const entries = await readdir(modelBundleDirectory(cacheRoot, candidate), { recursive: true });
        expect(entries).not.toEqual(expect.arrayContaining([expect.stringMatching(/\.onnx$|partial|lock/)]));
    });
});
