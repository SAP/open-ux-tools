import { lstat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { prepareModelCache, type PrepareModelCacheOptions } from './downloader.js';
import { parseModelManifest, type ModelManifest } from './manifest.js';
import { defaultModelCacheRoot, verifyModelCache, type VerifiedModelCache } from './model-cache.js';

interface ReleaseModelDependencies {
    acquisitionTimeoutMs?: number;
    manifestPath?: string;
    cacheRoot?: string;
    onStatus?: (message: string) => void;
    prepare?: (
        cacheRoot: string,
        manifest: ModelManifest,
        options: PrepareModelCacheOptions
    ) => Promise<VerifiedModelCache>;
    verify?: (cacheRoot: string, manifest: ModelManifest, signal?: AbortSignal) => Promise<VerifiedModelCache>;
}

export interface PreparedModelArtifacts {
    manifestPath: string;
    cacheRoot: string;
}

const DEFAULT_ACQUISITION_TIMEOUT_MS = 5 * 60 * 1_000;

/** Resolve the immutable manifest shipped by this package release. */
export function defaultReleaseModelManifestPath(): string {
    return fileURLToPath(new URL('../../resources/model-manifest.json', import.meta.url));
}

async function readReleaseManifest(manifestPath: string, signal: AbortSignal): Promise<ModelManifest | undefined> {
    signal.throwIfAborted();
    let details: Awaited<ReturnType<typeof lstat>>;
    try {
        details = await lstat(manifestPath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return undefined;
        }
        throw new TypeError('The package release model manifest is unavailable or invalid');
    }
    try {
        signal.throwIfAborted();
        if (!details.isFile() || details.isSymbolicLink()) {
            throw new TypeError('invalid release manifest file');
        }
        const source = await readFile(manifestPath, { encoding: 'utf8', signal });
        signal.throwIfAborted();
        return parseModelManifest(JSON.parse(source) as unknown);
    } catch {
        throw new TypeError('The package release model manifest is unavailable or invalid');
    }
}

/**
 * Prepare the immutable model bundle selected by this package release.
 *
 * @param dependencies test-only boundary overrides
 */
export async function prepareDefaultModelArtifacts(
    dependencies: ReleaseModelDependencies = {}
): Promise<PreparedModelArtifacts | undefined> {
    const manifestPath = dependencies.manifestPath ?? defaultReleaseModelManifestPath();
    const cacheRoot = dependencies.cacheRoot ?? defaultModelCacheRoot();
    const acquisitionTimeoutMs = dependencies.acquisitionTimeoutMs ?? DEFAULT_ACQUISITION_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutError = new Error('model acquisition timed out');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
            controller.abort(timeoutError);
            reject(timeoutError);
        }, acquisitionTimeoutMs);
        timeout.unref();
    });
    const preparation = async (): Promise<PreparedModelArtifacts | undefined> => {
        const manifest = await readReleaseManifest(manifestPath, controller.signal);
        if (!manifest) {
            return undefined;
        }
        dependencies.onStatus?.('MOCKGEN_MODEL_CACHE_CHECKING');
        const cached = await (dependencies.verify ?? verifyModelCache)(cacheRoot, manifest, controller.signal);
        if (cached.ready) {
            dependencies.onStatus?.('MOCKGEN_MODEL_CACHE_READY');
            return Object.freeze({ manifestPath, cacheRoot });
        }
        dependencies.onStatus?.('MOCKGEN_MODEL_ACQUISITION_STARTED');
        const cache = await (dependencies.prepare ?? prepareModelCache)(cacheRoot, manifest, {
            acquisitionTimeoutMs,
            signal: controller.signal
        });
        if (!cache.ready) {
            throw new Error('release model artifacts did not pass verification');
        }
        dependencies.onStatus?.('MOCKGEN_MODEL_CACHE_READY');
        return Object.freeze({ manifestPath, cacheRoot });
    };
    try {
        return await Promise.race([preparation(), deadline]);
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
        controller.abort();
    }
}
