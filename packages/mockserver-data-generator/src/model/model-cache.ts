import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
    selectPlatformRuntime,
    type ModelArtifactFile,
    type ModelManifest,
    type ModelRuntimeArtifact
} from './manifest.js';

export type ModelCacheFailureReason = 'missing' | 'not-file' | 'size' | 'checksum' | 'unreadable';

export interface ModelCacheFailure {
    componentId: string;
    role: string;
    reason: ModelCacheFailureReason;
}

export interface VerifiedModelCache {
    ready: boolean;
    files: ReadonlyMap<string, ReadonlyMap<string, string>>;
    runtime?: VerifiedPlatformRuntime;
    runtimeFiles?: ReadonlyMap<string, string>;
    failures: ReadonlyArray<ModelCacheFailure>;
}

export interface VerifiedPlatformRuntime {
    id: string;
    package: 'onnxruntime-node';
    version: string;
    fingerprint: string;
    entry: string;
    files: ReadonlyMap<string, string>;
}

/**
 * Default cache location aligned with the SAP tools user-data directory.
 *
 * @param homeDirectory
 */
export function defaultModelCacheRoot(homeDirectory = homedir()): string {
    return join(homeDirectory, '.saptools', 'mockserver-data-generator', 'models');
}

/**
 * Directory reserved for one immutable bundle revision.
 *
 * @param cacheRoot
 * @param manifest
 */
export function modelBundleDirectory(cacheRoot: string, manifest: ModelManifest): string {
    return join(resolve(cacheRoot), manifest.bundleId, manifest.revision);
}

function artifactPath(bundleDirectory: string, relativePath: string): string {
    const candidate = resolve(bundleDirectory, relativePath);
    if (!candidate.startsWith(`${resolve(bundleDirectory)}${sep}`)) {
        throw new TypeError('model artifact resolves outside its bundle directory');
    }
    return candidate;
}

async function sha256(filePath: string, signal?: AbortSignal): Promise<string> {
    const digest = createHash('sha256');
    signal?.throwIfAborted();
    for await (const chunk of createReadStream(filePath)) {
        signal?.throwIfAborted();
        digest.update(chunk as Buffer);
    }
    signal?.throwIfAborted();
    return digest.digest('hex');
}

async function verifyArtifact(
    cacheRoot: string,
    bundleDirectory: string,
    file: ModelArtifactFile,
    signal?: AbortSignal
): Promise<{ path?: string; failure?: ModelCacheFailureReason }> {
    signal?.throwIfAborted();
    const filePath = artifactPath(bundleDirectory, file.path);
    try {
        const details = await lstat(filePath);
        if (!details.isFile()) {
            return { failure: 'not-file' };
        }
        const [resolvedRoot, resolvedBundle, resolvedFile] = await Promise.all([
            realpath(resolve(cacheRoot)),
            realpath(bundleDirectory),
            realpath(filePath)
        ]);
        if (
            !resolvedBundle.startsWith(`${resolvedRoot}${sep}`) ||
            !resolvedFile.startsWith(`${resolvedBundle}${sep}`)
        ) {
            return { failure: 'not-file' };
        }
        if (details.size !== file.bytes) {
            return { failure: 'size' };
        }
        if ((await sha256(filePath, signal)) !== file.sha256) {
            return { failure: 'checksum' };
        }
        return { path: filePath };
    } catch (error) {
        if (signal?.aborted) {
            signal.throwIfAborted();
        }
        return { failure: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable' };
    }
}

async function verifyRuntime(
    cacheRoot: string,
    bundleDirectory: string,
    runtime: ModelRuntimeArtifact,
    failures: ModelCacheFailure[],
    signal?: AbortSignal
): Promise<{ runtime?: VerifiedPlatformRuntime; files: ReadonlyMap<string, string> }> {
    const files = new Map<string, string>();
    for (const file of runtime.files) {
        signal?.throwIfAborted();
        const result = await verifyArtifact(cacheRoot, bundleDirectory, file, signal);
        if (result.failure) {
            failures.push(Object.freeze({ componentId: runtime.id, role: file.role, reason: result.failure }));
        } else if (result.path) {
            files.set(file.role, result.path);
        }
    }
    const entry = files.get('entry');
    if (files.size !== runtime.files.length || !entry) {
        return Object.freeze({ files });
    }
    return Object.freeze({
        files,
        runtime: Object.freeze({
            id: runtime.id,
            package: runtime.package,
            version: runtime.version,
            fingerprint: runtime.fingerprint,
            entry,
            files
        })
    });
}

/**
 * Verify artifacts independently and expose paths only for complete components.
 *
 * @param cacheRoot
 * @param manifest
 * @param signal Optional cancellation signal.
 */
export async function verifyModelCache(
    cacheRoot: string,
    manifest: ModelManifest,
    signal?: AbortSignal
): Promise<VerifiedModelCache> {
    const bundleDirectory = modelBundleDirectory(cacheRoot, manifest);
    const verified = new Map<string, ReadonlyMap<string, string>>();
    const failures: ModelCacheFailure[] = [];

    for (const component of manifest.components) {
        signal?.throwIfAborted();
        const componentFiles = new Map<string, string>();
        for (const file of component.files) {
            signal?.throwIfAborted();
            const result = await verifyArtifact(cacheRoot, bundleDirectory, file, signal);
            if (result.failure) {
                failures.push(Object.freeze({ componentId: component.id, role: file.role, reason: result.failure }));
            } else if (result.path) {
                componentFiles.set(file.role, result.path);
            }
        }
        if (componentFiles.size === component.files.length) {
            verified.set(component.id, componentFiles);
        }
    }

    const selectedRuntime = selectPlatformRuntime(manifest);
    const runtimeResult = selectedRuntime
        ? await verifyRuntime(cacheRoot, bundleDirectory, selectedRuntime, failures, signal)
        : undefined;
    const runtime = runtimeResult?.runtime;

    if (failures.length > 0) {
        return Object.freeze({
            ready: false,
            files: verified,
            ...(runtime ? { runtime } : {}),
            ...(runtimeResult ? { runtimeFiles: runtimeResult.files } : {}),
            failures: Object.freeze(failures)
        });
    }
    return Object.freeze({
        ready: true,
        files: verified,
        ...(runtime ? { runtime } : {}),
        ...(runtimeResult ? { runtimeFiles: runtimeResult.files } : {}),
        failures: Object.freeze([])
    });
}
