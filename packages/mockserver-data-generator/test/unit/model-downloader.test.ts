import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, open, readFile, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
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
        jest.restoreAllMocks();
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

    test('routes default model acquisition through the configured environment proxy', async () => {
        let proxyRequests = 0;
        const proxyTargets: string[] = [];
        const proxy = createServer();
        proxy.on('connect', (request, clientSocket, head) => {
            proxyRequests += 1;
            proxyTargets.push(request.url ?? '');
            const [host, port] = (request.url ?? '').split(':');
            const upstream = connect(Number(port), host, () => {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                if (head.length > 0) {
                    upstream.write(head);
                }
                upstream.pipe(clientSocket);
                clientSocket.pipe(upstream);
            });
            upstream.on('error', () => clientSocket.destroy());
        });
        await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
        const address = proxy.address();
        if (!address || typeof address === 'string') {
            throw new Error('proxy fixture server did not bind');
        }
        const environmentKeys = ['http_proxy', 'HTTP_PROXY', 'no_proxy', 'NO_PROXY'] as const;
        const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
        const proxyUrl = `http://127.0.0.1:${address.port}`;
        process.env.http_proxy = proxyUrl;
        process.env.HTTP_PROXY = proxyUrl;
        delete process.env.no_proxy;
        delete process.env.NO_PROXY;
        try {
            await expect(prepareModelCache(cacheRoot, manifest(`${baseUrl}/model.onnx`))).resolves.toMatchObject({
                ready: true
            });

            expect(proxyRequests).toBe(1);
            expect(requests).toBe(1);
            expect(proxyTargets).toEqual([new URL(baseUrl).host]);
        } finally {
            for (const key of environmentKeys) {
                const previous = previousEnvironment[key];
                if (previous === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = previous;
                }
            }
            await new Promise<void>((resolve, reject) => proxy.close((error) => (error ? reject(error) : resolve())));
        }
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

    test('does not steal a live lock while a slow acquisition is still progressing', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        let signalStarted: (() => void) | undefined;
        const started = new Promise<void>((resolve) => {
            signalStarted = resolve;
        });
        const slowFetch = jest.fn(async () => {
            signalStarted?.();
            await new Promise((resolve) => setTimeout(resolve, 900));
            return new Response(modelBytes, {
                status: 200,
                headers: { 'content-length': String(modelBytes.length) }
            });
        });
        const acquisitionOptions = {
            fetch: slowFetch as typeof fetch,
            acquisitionTimeoutMs: 3_000,
            lockTimeoutMs: 3_000,
            staleLockMs: 300
        };

        const first = prepareModelCache(cacheRoot, candidate, acquisitionOptions);
        await started;
        await new Promise((resolve) => setTimeout(resolve, 450));
        const second = prepareModelCache(cacheRoot, candidate, acquisitionOptions);

        await expect(Promise.all([first, second])).resolves.toEqual([
            expect.objectContaining({ ready: true }),
            expect.objectContaining({ ready: true })
        ]);
        expect(slowFetch).toHaveBeenCalledTimes(1);
    });

    test('rejects acquisition when the live lock heartbeat cannot be refreshed', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const probe = await open(join(cacheRoot, 'file-handle-probe'), 'w');
        const fileHandlePrototype = Object.getPrototypeOf(probe) as {
            utimes(atime: string | number | Date, mtime: string | number | Date): Promise<void>;
        };
        await probe.close();
        let signalHeartbeatFailure: (() => void) | undefined;
        const heartbeatFailed = new Promise<void>((resolve) => {
            signalHeartbeatFailure = resolve;
        });
        jest.spyOn(fileHandlePrototype, 'utimes').mockImplementation(async () => {
            signalHeartbeatFailure?.();
            throw new Error('lock heartbeat failed');
        });
        let yielded = false;
        const body = {
            [Symbol.asyncIterator]: () => ({
                next: async (): Promise<IteratorResult<Uint8Array>> => {
                    if (!yielded) {
                        yielded = true;
                        return { done: false, value: modelBytes };
                    }
                    await heartbeatFailed;
                    return { done: true, value: undefined };
                }
            })
        };
        const fetchAfterFinalChunk = jest.fn(
            async () =>
                ({
                    ok: true,
                    status: 200,
                    body,
                    headers: new Headers({ 'content-length': String(modelBytes.length) })
                }) as unknown as Response
        );

        await expect(
            prepareModelCache(cacheRoot, candidate, {
                fetch: fetchAfterFinalChunk as typeof fetch,
                acquisitionTimeoutMs: 1_000,
                staleLockMs: 30
            })
        ).rejects.toThrow('lock heartbeat failed');
        expect(await readdir(modelBundleDirectory(cacheRoot, candidate), { recursive: true })).not.toEqual(
            expect.arrayContaining([expect.stringMatching(/partial|lock/)])
        );
    });

    test('never publishes when cancellation arrives after the final response chunk', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const controller = new AbortController();
        let yielded = false;
        const body = {
            [Symbol.asyncIterator]: () => ({
                next: async (): Promise<IteratorResult<Uint8Array>> => {
                    if (!yielded) {
                        yielded = true;
                        return { done: false, value: modelBytes };
                    }
                    controller.abort(new Error('cancelled after final chunk'));
                    return { done: true, value: undefined };
                }
            })
        };
        const fetchWithLateCancellation = jest.fn(
            async () =>
                ({
                    ok: true,
                    status: 200,
                    body,
                    headers: new Headers({ 'content-length': String(modelBytes.length) })
                }) as unknown as Response
        );

        await expect(
            prepareModelCache(cacheRoot, candidate, {
                fetch: fetchWithLateCancellation as typeof fetch,
                signal: controller.signal
            })
        ).rejects.toThrow('cancelled after final chunk');
        expect(await readdir(modelBundleDirectory(cacheRoot, candidate), { recursive: true })).not.toEqual(
            expect.arrayContaining([expect.stringMatching(/\.onnx$|partial|lock/)])
        );
    });

    test('fences a stale owner without deleting the replacement owner lock', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const probe = await open(join(cacheRoot, 'file-handle-probe'), 'w');
        const fileHandlePrototype = Object.getPrototypeOf(probe) as {
            utimes(atime: string | number | Date, mtime: string | number | Date): Promise<void>;
        };
        await probe.close();
        jest.spyOn(fileHandlePrototype, 'utimes').mockResolvedValue(undefined);

        const releases: Array<() => void> = [];
        const starts: Array<Promise<void>> = [];
        const fetchWithControlledCompletion = jest.fn(async () => {
            let signalStarted: (() => void) | undefined;
            starts.push(
                new Promise<void>((resolve) => {
                    signalStarted = resolve;
                })
            );
            signalStarted?.();
            await new Promise<void>((resolve) => releases.push(resolve));
            return new Response(modelBytes, {
                status: 200,
                headers: { 'content-length': String(modelBytes.length) }
            });
        });
        const acquisitionOptions = {
            fetch: fetchWithControlledCompletion as typeof fetch,
            acquisitionTimeoutMs: 3_000,
            lockTimeoutMs: 3_000,
            staleLockMs: 300
        };

        const first = prepareModelCache(cacheRoot, candidate, acquisitionOptions);
        while (starts.length < 1) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        await starts[0];
        await new Promise((resolve) => setTimeout(resolve, 450));
        const second = prepareModelCache(cacheRoot, candidate, acquisitionOptions);
        while (starts.length < 2) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        await starts[1];

        const firstResult = expect(first).rejects.toThrow('model-cache lock ownership was lost');
        releases[0]();
        await firstResult;
        expect(await readdir(join(modelBundleDirectory(cacheRoot, candidate), '.acquire.lock'))).toHaveLength(1);

        releases[1]();
        await expect(second).resolves.toEqual(expect.objectContaining({ ready: true }));
        expect(fetchWithControlledCompletion).toHaveBeenCalledTimes(2);
    });

    test('retries when its empty lock directory is replaced during owner initialization', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const lockDirectory = join(modelBundleDirectory(cacheRoot, candidate), '.acquire.lock');
        const probe = await open(join(cacheRoot, 'file-handle-probe'), 'w');
        const fileHandlePrototype = Object.getPrototypeOf(probe) as {
            sync(): Promise<void>;
        };
        await probe.close();
        const originalSync = fileHandlePrototype.sync;
        let injectedReplacement = false;
        jest.spyOn(fileHandlePrototype, 'sync').mockImplementation(async function () {
            if (!injectedReplacement) {
                injectedReplacement = true;
                const replacementMarker = join(lockDirectory, 'owner-replacement');
                await writeFile(replacementMarker, 'replacement');
                const stale = new Date(Date.now() - 1_000);
                await utimes(replacementMarker, stale, stale);
            }
            await originalSync.call(this);
        });
        const fetchModel = jest.fn(
            async () =>
                new Response(modelBytes, {
                    status: 200,
                    headers: { 'content-length': String(modelBytes.length) }
                })
        );

        await expect(
            prepareModelCache(cacheRoot, candidate, {
                fetch: fetchModel as typeof fetch,
                acquisitionTimeoutMs: 2_000,
                lockTimeoutMs: 2_000,
                staleLockMs: 300
            })
        ).resolves.toEqual(expect.objectContaining({ ready: true }));
        await expect(readdir(lockDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
        expect(fetchModel).toHaveBeenCalledTimes(1);
    });

    test('fails closed on a regular lock file left by the previous implementation', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const bundleDirectory = modelBundleDirectory(cacheRoot, candidate);
        const legacyLockPath = join(bundleDirectory, '.acquire.lock');
        await mkdir(bundleDirectory, { recursive: true });
        await writeFile(legacyLockPath, JSON.stringify({ pid: 999_999, createdAt: 0 }));
        const stale = new Date(Date.now() - 1_000);
        await utimes(legacyLockPath, stale, stale);
        const fetchModel = jest.fn(
            async () =>
                new Response(modelBytes, {
                    status: 200,
                    headers: { 'content-length': String(modelBytes.length) }
                })
        );

        await expect(
            prepareModelCache(cacheRoot, candidate, {
                fetch: fetchModel as typeof fetch,
                acquisitionTimeoutMs: 2_000,
                lockTimeoutMs: 2_000,
                staleLockMs: 300
            })
        ).rejects.toThrow(
            'incompatible legacy model-cache lock file detected; after confirming no older model preparation process is active, delete the lock file and retry'
        );
        await expect(readFile(legacyLockPath, 'utf8')).resolves.toContain('999999');
        expect(fetchModel).not.toHaveBeenCalled();
    });

    test('never follows a lock symlink into a directory', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const bundleDirectory = modelBundleDirectory(cacheRoot, candidate);
        const lockPath = join(bundleDirectory, '.acquire.lock');
        const targetDirectory = join(cacheRoot, 'symlink-target');
        const targetMarker = join(targetDirectory, 'owner-victim');
        await mkdir(bundleDirectory, { recursive: true });
        await mkdir(targetDirectory);
        await writeFile(targetMarker, 'must survive');
        const stale = new Date(Date.now() - 1_000);
        await utimes(targetMarker, stale, stale);
        await symlink(targetDirectory, lockPath, 'dir');

        await expect(
            prepareModelCache(cacheRoot, candidate, {
                acquisitionTimeoutMs: 500,
                lockTimeoutMs: 50,
                staleLockMs: 30
            })
        ).rejects.toThrow();
        await expect(readFile(targetMarker, 'utf8')).resolves.toBe('must survive');
    });

    test('rejects a symlinked bundle parent before downloading or writing outside the selected cache', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const outsideRoot = await mkdtemp(join(tmpdir(), 'mockgen-download-outside-'));
        const fetchModel = jest.fn(
            async () =>
                new Response(modelBytes, {
                    status: 200,
                    headers: { 'content-length': String(modelBytes.length) }
                })
        );
        try {
            await symlink(outsideRoot, join(cacheRoot, candidate.bundleId), 'dir');

            await expect(
                prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })
            ).rejects.toThrow('model cache path must not contain symbolic links');
            expect(fetchModel).not.toHaveBeenCalled();
            await expect(readdir(outsideRoot, { recursive: true })).resolves.toEqual([]);
        } finally {
            await rm(outsideRoot, { recursive: true, force: true });
        }
    });

    test('rejects a symlinked artifact parent before downloading or writing outside the bundle', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const bundleDirectory = modelBundleDirectory(cacheRoot, candidate);
        const outsideRoot = await mkdtemp(join(tmpdir(), 'mockgen-download-outside-'));
        const fetchModel = jest.fn(
            async () =>
                new Response(modelBytes, {
                    status: 200,
                    headers: { 'content-length': String(modelBytes.length) }
                })
        );
        try {
            await mkdir(bundleDirectory, { recursive: true });
            await symlink(outsideRoot, join(bundleDirectory, 'classifier'), 'dir');

            await expect(
                prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })
            ).rejects.toThrow('model cache path must not contain symbolic links');
            expect(fetchModel).not.toHaveBeenCalled();
            await expect(readdir(outsideRoot, { recursive: true })).resolves.toEqual([]);
        } finally {
            await rm(outsideRoot, { recursive: true, force: true });
        }
    });

    test('rejects an HTTPS redirect to non-loopback HTTP before contacting the redirected host', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const fetchModel = jest.fn(
            async () =>
                new Response(null, {
                    status: 302,
                    headers: { location: 'http://downloads.example.invalid/model.onnx' }
                })
        );

        await expect(prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })).rejects.toThrow(
            'model artifact redirect must use HTTPS'
        );
        expect(fetchModel).toHaveBeenCalledTimes(1);
        await expect(
            readFile(join(modelBundleDirectory(cacheRoot, candidate), 'classifier', 'model.onnx'))
        ).rejects.toMatchObject({ code: 'ENOENT' });
    });

    test('follows a valid HTTPS redirect and verifies the downloaded artifact', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const fetchModel = jest
            .fn()
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 302,
                    headers: { location: 'https://cdn.example.invalid/model.onnx' }
                })
            )
            .mockResolvedValueOnce(
                new Response(modelBytes, {
                    status: 200,
                    headers: { 'content-length': String(modelBytes.length) }
                })
            );

        await expect(
            prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })
        ).resolves.toMatchObject({ ready: true });
        expect(fetchModel.mock.calls.map(([url]) => url)).toEqual([
            'https://models.example.invalid/model.onnx',
            'https://cdn.example.invalid/model.onnx'
        ]);
    });

    test('resolves a relative HTTPS redirect against the current artifact URL', async () => {
        const candidate = manifest('https://models.example.invalid/releases/current/model.onnx');
        const fetchModel = jest
            .fn()
            .mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: '../model.onnx' } }))
            .mockResolvedValueOnce(
                new Response(modelBytes, {
                    status: 200,
                    headers: { 'content-length': String(modelBytes.length) }
                })
            );

        await expect(
            prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })
        ).resolves.toMatchObject({ ready: true });
        expect(fetchModel.mock.calls.map(([url]) => url)).toEqual([
            'https://models.example.invalid/releases/current/model.onnx',
            'https://models.example.invalid/releases/model.onnx'
        ]);
    });

    test('accepts exactly five secure artifact redirects', async () => {
        const candidate = manifest('https://models.example.invalid/0');
        const requestedUrls: string[] = [];
        const fetchModel = jest.fn(async (input: string | URL | Request) => {
            const requestedUrl = String(input);
            requestedUrls.push(requestedUrl);
            const step = Number(new URL(requestedUrl).pathname.slice(1));
            if (step < 5) {
                return new Response(null, { status: 302, headers: { location: `/${step + 1}` } });
            }
            return new Response(modelBytes, {
                status: 200,
                headers: { 'content-length': String(modelBytes.length) }
            });
        });

        await expect(
            prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })
        ).resolves.toMatchObject({ ready: true });
        expect(requestedUrls).toEqual([0, 1, 2, 3, 4, 5].map((step) => `https://models.example.invalid/${step}`));
    });

    test('rejects a sixth artifact redirect before making a seventh request', async () => {
        const candidate = manifest('https://models.example.invalid/0');
        const fetchModel = jest.fn(async (input: string | URL | Request) => {
            const step = Number(new URL(String(input)).pathname.slice(1));
            return new Response(null, { status: 302, headers: { location: `/${step + 1}` } });
        });

        await expect(prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })).rejects.toThrow(
            'model artifact exceeded redirect limit'
        );
        expect(fetchModel).toHaveBeenCalledTimes(6);
    });

    test('rejects an artifact redirect without a location', async () => {
        const candidate = manifest('https://models.example.invalid/model.onnx');
        const fetchModel = jest.fn(async () => new Response(null, { status: 302 }));

        await expect(prepareModelCache(cacheRoot, candidate, { fetch: fetchModel as typeof fetch })).rejects.toThrow(
            'model artifact redirect has no location'
        );
        expect(fetchModel).toHaveBeenCalledTimes(1);
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
