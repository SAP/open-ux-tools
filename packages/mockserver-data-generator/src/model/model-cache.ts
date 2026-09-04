import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import type { ModelManifest } from './manifest.js';

export type ModelCacheFailureReason = 'missing' | 'not-file' | 'size' | 'checksum' | 'unreadable';

export interface ModelCacheFailure {
    componentId: string;
    role: string;
    reason: ModelCacheFailureReason;
}

export interface VerifiedModelCache {
    ready: boolean;
    files: ReadonlyMap<string, ReadonlyMap<string, string>>;
    failures: ReadonlyArray<ModelCacheFailure>;
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

async function sha256(filePath: string): Promise<string> {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
        digest.update(chunk as Buffer);
    }
    return digest.digest('hex');
}

/**
 * Verify artifacts independently and expose paths only for complete components.
 *
 * @param cacheRoot
 * @param manifest
 */
export async function verifyModelCache(cacheRoot: string, manifest: ModelManifest): Promise<VerifiedModelCache> {
    const bundleDirectory = modelBundleDirectory(cacheRoot, manifest);
    const verified = new Map<string, ReadonlyMap<string, string>>();
    const failures: ModelCacheFailure[] = [];

    for (const component of manifest.components) {
        const componentFiles = new Map<string, string>();
        for (const file of component.files) {
            const filePath = artifactPath(bundleDirectory, file.path);
            let failure: ModelCacheFailureReason | undefined;
            try {
                const details = await lstat(filePath);
                if (!details.isFile()) {
                    failure = 'not-file';
                } else {
                    const [resolvedRoot, resolvedBundle, resolvedFile] = await Promise.all([
                        realpath(resolve(cacheRoot)),
                        realpath(bundleDirectory),
                        realpath(filePath)
                    ]);
                    if (
                        !resolvedBundle.startsWith(`${resolvedRoot}${sep}`) ||
                        !resolvedFile.startsWith(`${resolvedBundle}${sep}`)
                    ) {
                        failure = 'not-file';
                    } else if (details.size !== file.bytes) {
                        failure = 'size';
                    } else if ((await sha256(filePath)) !== file.sha256) {
                        failure = 'checksum';
                    }
                }
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code;
                failure = code === 'ENOENT' ? 'missing' : 'unreadable';
            }
            if (failure) {
                failures.push(Object.freeze({ componentId: component.id, role: file.role, reason: failure }));
            } else {
                componentFiles.set(file.role, filePath);
            }
        }
        if (componentFiles.size === component.files.length) {
            verified.set(component.id, componentFiles);
        }
    }

    if (failures.length > 0) {
        return Object.freeze({ ready: false, files: verified, failures: Object.freeze(failures) });
    }
    return Object.freeze({ ready: true, files: verified, failures: Object.freeze([]) });
}
