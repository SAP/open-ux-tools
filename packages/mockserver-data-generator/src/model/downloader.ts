import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ModelArtifactFile, ModelManifest } from './manifest.js';
import { modelBundleDirectory, verifyModelCache, type VerifiedModelCache } from './model-cache.js';

export interface PrepareModelCacheOptions {
    fetch?: typeof fetch;
    signal?: AbortSignal;
    acquisitionTimeoutMs?: number;
    lockTimeoutMs?: number;
    staleLockMs?: number;
    mirrorBaseUrl?: string;
}

const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

function artifactUrl(file: ModelArtifactFile, mirrorBaseUrl?: string): string {
    if (!mirrorBaseUrl) {
        return file.url;
    }
    const base = new URL(mirrorBaseUrl.endsWith('/') ? mirrorBaseUrl : `${mirrorBaseUrl}/`);
    if (
        base.protocol !== 'https:' &&
        !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
    ) {
        throw new TypeError('model mirror must use HTTPS');
    }
    return new URL(file.path, base).toString();
}

function boundedSignal(parent: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; dispose(): void } {
    const controller = new AbortController();
    const abort = (): void => controller.abort(parent?.reason);
    parent?.addEventListener('abort', abort, { once: true });
    if (parent?.aborted) {
        abort();
    }
    const timer = setTimeout(() => controller.abort(new Error('model acquisition timed out')), timeoutMs);
    timer.unref();
    return {
        signal: controller.signal,
        dispose: () => {
            clearTimeout(timer);
            parent?.removeEventListener('abort', abort);
        }
    };
}

async function acquireLock(
    lockPath: string,
    signal: AbortSignal,
    timeoutMs: number,
    staleLockMs: number
): Promise<Awaited<ReturnType<typeof open>>> {
    const deadline = Date.now() + timeoutMs;
    while (true) {
        signal.throwIfAborted();
        try {
            const handle = await open(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR, 0o600);
            await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: Date.now() }));
            await handle.sync();
            return handle;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error;
            }
            try {
                const details = await stat(lockPath);
                if (Date.now() - details.mtimeMs > staleLockMs) {
                    await unlink(lockPath);
                    continue;
                }
            } catch (lockError) {
                if ((lockError as NodeJS.ErrnoException).code === 'ENOENT') {
                    continue;
                }
                throw lockError;
            }
            if (Date.now() >= deadline) {
                throw new Error('timed out waiting for the model-cache lock');
            }
            await delay(25);
        }
    }
}

async function downloadArtifact(
    file: ModelArtifactFile,
    destination: string,
    fetchImplementation: typeof fetch,
    signal: AbortSignal,
    mirrorBaseUrl?: string
): Promise<void> {
    const response = await fetchImplementation(artifactUrl(file, mirrorBaseUrl), { signal, redirect: 'follow' });
    if (!response.ok || !response.body) {
        throw new Error(`model download failed with HTTP ${response.status}`);
    }
    const declaredLength = response.headers.get('content-length');
    if (declaredLength !== null && Number(declaredLength) !== file.bytes) {
        throw new Error(`model download size mismatch for ${file.role}`);
    }

    await mkdir(dirname(destination), { recursive: true });
    const temporaryPath = `${destination}.partial-${process.pid}-${randomUUID()}`;
    const handle = await open(temporaryPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    const checksum = createHash('sha256');
    let received = 0;
    try {
        for await (const value of response.body as unknown as AsyncIterable<Uint8Array>) {
            signal.throwIfAborted();
            const chunk = Buffer.from(value);
            received += chunk.length;
            if (received > file.bytes) {
                throw new Error(`model download exceeded declared size for ${file.role}`);
            }
            checksum.update(chunk);
            await handle.write(chunk);
        }
        if (received !== file.bytes) {
            throw new Error(`model download size mismatch for ${file.role}`);
        }
        if (checksum.digest('hex') !== file.sha256) {
            throw new Error(`model download checksum mismatch for ${file.role}`);
        }
        await handle.sync();
        await handle.close();
        await rename(temporaryPath, destination);
    } catch (error) {
        await handle.close().catch(() => undefined);
        await unlink(temporaryPath).catch(() => undefined);
        throw error;
    }
}

/**
 * Acquire every missing artifact and expose paths only after complete bundle verification.
 *
 * @param cacheRoot
 * @param manifest
 * @param options
 */
export async function prepareModelCache(
    cacheRoot: string,
    manifest: ModelManifest,
    options: PrepareModelCacheOptions = {}
): Promise<VerifiedModelCache> {
    const cached = await verifyModelCache(cacheRoot, manifest);
    if (cached.ready) {
        return cached;
    }

    const acquisition = boundedSignal(options.signal, options.acquisitionTimeoutMs ?? 30_000);
    const bundleDirectory = modelBundleDirectory(cacheRoot, manifest);
    await mkdir(bundleDirectory, { recursive: true });
    const lockPath = join(bundleDirectory, '.acquire.lock');
    let lock: Awaited<ReturnType<typeof open>> | undefined;
    try {
        lock = await acquireLock(
            lockPath,
            acquisition.signal,
            options.lockTimeoutMs ?? 30_000,
            options.staleLockMs ?? 120_000
        );
        const afterLock = await verifyModelCache(cacheRoot, manifest);
        if (afterLock.ready) {
            return afterLock;
        }
        for (const component of manifest.components) {
            for (const file of component.files) {
                if (afterLock.files.get(component.id)?.has(file.role)) {
                    continue;
                }
                await downloadArtifact(
                    file,
                    join(bundleDirectory, file.path),
                    options.fetch ?? fetch,
                    acquisition.signal,
                    options.mirrorBaseUrl
                );
            }
        }
        const result = await verifyModelCache(cacheRoot, manifest);
        if (!result.ready) {
            throw new Error('downloaded model bundle did not pass final verification');
        }
        return result;
    } finally {
        acquisition.dispose();
        if (lock) {
            await lock.close().catch(() => undefined);
            await unlink(lockPath).catch(() => undefined);
        }
    }
}
