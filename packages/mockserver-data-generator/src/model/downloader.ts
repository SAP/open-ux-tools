import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, rename, rmdir, stat, unlink } from 'node:fs/promises';
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
const LOCK_OWNER_PREFIX = 'owner-';
const LOCK_RECLAIM_PREFIX = '.reclaim-';
const LOCK_RELEASE_PREFIX = '.release-';

interface AcquiredLock {
    directory: string;
    handle: Awaited<ReturnType<typeof open>>;
    markerPath: string;
    token: string;
}

function errorCode(error: unknown): string | undefined {
    return (error as NodeJS.ErrnoException).code;
}

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

function boundedSignal(
    parent: AbortSignal | undefined,
    timeoutMs: number
): { signal: AbortSignal; abort(reason: unknown): void; dispose(): void } {
    const controller = new AbortController();
    const abortFromParent = (): void => controller.abort(parent?.reason);
    parent?.addEventListener('abort', abortFromParent, { once: true });
    if (parent?.aborted) {
        abortFromParent();
    }
    const timer = setTimeout(() => controller.abort(new Error('model acquisition timed out')), timeoutMs);
    timer.unref();
    return {
        signal: controller.signal,
        abort: (reason) => controller.abort(reason),
        dispose: () => {
            clearTimeout(timer);
            parent?.removeEventListener('abort', abortFromParent);
        }
    };
}

async function reclaimStaleLock(lockDirectory: string, staleLockMs: number): Promise<boolean> {
    let lockDetails: Awaited<ReturnType<typeof lstat>>;
    try {
        lockDetails = await lstat(lockDirectory);
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return true;
        }
        throw error;
    }
    if (lockDetails.isFile()) {
        throw new Error(
            'incompatible legacy model-cache lock file detected; after confirming no older model preparation process is active, delete the lock file and retry'
        );
    }
    if (!lockDetails.isDirectory()) {
        return false;
    }

    let entries: string[];
    try {
        entries = await readdir(lockDirectory);
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return true;
        }
        if (errorCode(error) === 'ENOTDIR') {
            return false;
        }
        throw error;
    }
    let currentLockDetails: Awaited<ReturnType<typeof lstat>>;
    try {
        currentLockDetails = await lstat(lockDirectory);
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return true;
        }
        if (errorCode(error) === 'ENOTDIR') {
            return false;
        }
        throw error;
    }
    if (
        !currentLockDetails.isDirectory() ||
        currentLockDetails.dev !== lockDetails.dev ||
        currentLockDetails.ino !== lockDetails.ino
    ) {
        return false;
    }

    if (entries.length === 0) {
        if (Date.now() - currentLockDetails.mtimeMs <= staleLockMs) {
            return false;
        }
        try {
            await rmdir(lockDirectory);
            return true;
        } catch (error) {
            if (errorCode(error) === 'ENOENT') {
                return true;
            }
            if (errorCode(error) === 'ENOTEMPTY') {
                return false;
            }
            throw error;
        }
    }

    if (entries.length !== 1) {
        return false;
    }
    const [entry] = entries;
    if (
        !entry.startsWith(LOCK_OWNER_PREFIX) &&
        !entry.startsWith(LOCK_RECLAIM_PREFIX) &&
        !entry.startsWith(LOCK_RELEASE_PREFIX)
    ) {
        return false;
    }
    let entryPath = join(lockDirectory, entry);
    let details: Awaited<ReturnType<typeof stat>>;
    try {
        details = await stat(entryPath);
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return true;
        }
        throw error;
    }
    if (Date.now() - details.mtimeMs <= staleLockMs) {
        return false;
    }

    if (entry.startsWith(LOCK_OWNER_PREFIX)) {
        const originalPath = entryPath;
        entryPath = join(
            lockDirectory,
            `${LOCK_RECLAIM_PREFIX}${entry.slice(LOCK_OWNER_PREFIX.length)}-${randomUUID()}`
        );
        try {
            await rename(originalPath, entryPath);
        } catch (error) {
            if (errorCode(error) === 'ENOENT') {
                return true;
            }
            throw error;
        }
        details = await stat(entryPath);
        if (Date.now() - details.mtimeMs <= staleLockMs) {
            await rename(entryPath, originalPath);
            return false;
        }
    }

    try {
        await unlink(entryPath);
    } catch (error) {
        if (errorCode(error) !== 'ENOENT') {
            throw error;
        }
    }
    try {
        await rmdir(lockDirectory);
        return true;
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return true;
        }
        if (errorCode(error) === 'ENOTEMPTY') {
            return false;
        }
        throw error;
    }
}

async function isExclusiveOwner(lockDirectory: string, markerName: string): Promise<boolean> {
    try {
        const entries = await readdir(lockDirectory);
        return entries.length === 1 && entries[0] === markerName;
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

async function acquireLock(
    lockDirectory: string,
    signal: AbortSignal,
    timeoutMs: number,
    staleLockMs: number
): Promise<AcquiredLock> {
    const deadline = Date.now() + timeoutMs;
    while (true) {
        signal.throwIfAborted();
        try {
            await mkdir(lockDirectory, { mode: 0o700 });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error;
            }
            if (await reclaimStaleLock(lockDirectory, staleLockMs)) {
                continue;
            }
            if (Date.now() >= deadline) {
                throw new Error('timed out waiting for the model-cache lock');
            }
            await delay(25);
            continue;
        }

        const token = randomUUID();
        const markerName = `${LOCK_OWNER_PREFIX}${token}`;
        const markerPath = join(lockDirectory, markerName);
        let handle: Awaited<ReturnType<typeof open>> | undefined;
        try {
            handle = await open(markerPath, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR, 0o600);
            await handle.writeFile(JSON.stringify({ pid: process.pid, token, createdAt: Date.now() }));
            await handle.sync();
            if (!(await isExclusiveOwner(lockDirectory, markerName))) {
                await handle.close();
                handle = undefined;
                await unlink(markerPath).catch(() => undefined);
                continue;
            }
            return { directory: lockDirectory, handle, markerPath, token };
        } catch (error) {
            await handle?.close().catch(() => undefined);
            await unlink(markerPath).catch(() => undefined);
            await rmdir(lockDirectory).catch(() => undefined);
            if (errorCode(error) === 'ENOENT' || errorCode(error) === 'EEXIST') {
                continue;
            }
            throw error;
        }
    }
}

async function refreshLock(lock: AcquiredLock): Promise<void> {
    const now = new Date();
    await lock.handle.utimes(now, now);
    const details = await lock.handle.stat();
    if (details.nlink < 1) {
        throw new Error('model-cache lock ownership was lost');
    }
}

async function assertLockOwnership(lock: AcquiredLock): Promise<void> {
    await refreshLock(lock);
    try {
        const [owned, current] = await Promise.all([lock.handle.stat(), stat(lock.markerPath)]);
        if (owned.nlink < 1 || owned.dev !== current.dev || owned.ino !== current.ino) {
            throw new Error('model-cache lock ownership was lost');
        }
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            throw new Error('model-cache lock ownership was lost');
        }
        throw error;
    }
}

function keepLockAlive(
    lock: AcquiredLock,
    staleLockMs: number,
    abort: (reason: unknown) => void
): { dispose(): Promise<void> } {
    let stopped = false;
    let pending = Promise.resolve();
    let timer: NodeJS.Timeout | undefined;
    const intervalMs = Math.max(1, Math.floor(staleLockMs / 3));
    const schedule = (): void => {
        if (stopped) {
            return;
        }
        timer = setTimeout(() => {
            pending = refreshLock(lock)
                .catch((error: unknown) => {
                    stopped = true;
                    abort(error);
                })
                .finally(schedule);
        }, intervalMs);
        timer.unref();
    };
    schedule();
    return {
        dispose: async () => {
            stopped = true;
            clearTimeout(timer);
            await pending;
        }
    };
}

async function releaseLock(lock: AcquiredLock): Promise<void> {
    await lock.handle.close();
    const releasePath = join(lock.directory, `${LOCK_RELEASE_PREFIX}${lock.token}-${randomUUID()}`);
    try {
        await rename(lock.markerPath, releasePath);
    } catch (error) {
        if (errorCode(error) === 'ENOENT') {
            return;
        }
        throw error;
    }
    await unlink(releasePath);
    await rmdir(lock.directory);
}

async function downloadArtifact(
    file: ModelArtifactFile,
    destination: string,
    fetchImplementation: typeof fetch,
    signal: AbortSignal,
    mirrorBaseUrl: string | undefined,
    assertOwnership: () => Promise<void>
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
        signal.throwIfAborted();
        await handle.sync();
        await handle.close();
        await assertOwnership();
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
    let lock: AcquiredLock | undefined;
    let lockHeartbeat: ReturnType<typeof keepLockAlive> | undefined;
    let operationFailed = false;
    try {
        lock = await acquireLock(
            lockPath,
            acquisition.signal,
            options.lockTimeoutMs ?? 30_000,
            options.staleLockMs ?? 120_000
        );
        lockHeartbeat = keepLockAlive(lock, options.staleLockMs ?? 120_000, acquisition.abort);
        const afterLock = await verifyModelCache(cacheRoot, manifest);
        if (afterLock.ready) {
            await assertLockOwnership(lock);
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
                    options.mirrorBaseUrl,
                    () => assertLockOwnership(lock as AcquiredLock)
                );
            }
        }
        const result = await verifyModelCache(cacheRoot, manifest);
        if (!result.ready) {
            throw new Error('downloaded model bundle did not pass final verification');
        }
        await assertLockOwnership(lock);
        return result;
    } catch (error) {
        operationFailed = true;
        throw error;
    } finally {
        try {
            await lockHeartbeat?.dispose();
            if (lock) {
                if (operationFailed) {
                    await releaseLock(lock).catch(() => undefined);
                } else {
                    await releaseLock(lock);
                }
            }
            if (!operationFailed) {
                acquisition.signal.throwIfAborted();
            }
        } finally {
            acquisition.dispose();
        }
    }
}
