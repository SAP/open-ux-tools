import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import properLockfile from 'proper-lockfile';
import type { Logger } from '@sap-ux/logger';
import { getNodeModulesPath } from './dependencies.js';
import { FileName, moduleCacheRoot } from '../constants.js';
import { execNpmCommand } from '../command/index.js';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Get the module path from project or app. Throws error if module is not installed.
 *
 * @param projectRoot - root path of the project/app.
 * @param moduleName - name of the node module.
 * @returns - path to module.
 */
export async function getModulePath(projectRoot: string, moduleName: string): Promise<string> {
    if (!getNodeModulesPath(projectRoot, moduleName)) {
        throw Error('Path to module not found.');
    }
    return require.resolve(moduleName, { paths: [projectRoot] });
}

/**
 * Tracks base import URLs whose plain form was permanently rejected by Node's ESM loader
 * (e.g. from a failed import during a partial install). Maps baseUrl → the full URL with
 * cache-buster that succeeded, so subsequent callers skip the plain URL and reuse the
 * already-cached successful module entry instead of hitting the cached failure again.
 */
const successfulBustedUrls = new Map<string, string>();

/**
 * Load module from project or app. Throws error if module is not installed.
 *
 * Note: Node's require.resolve() caches file access results in internal statCache, see:
 * (https://github.com/nodejs/node/blob/d150316a8ecad1a9c20615ae62fcaf4f8d060dcc/lib/internal/modules/cjs/loader.js#L155)
 * This means, if a module is not installed and require.resolve() is executed, it will never resolve, even after the
 * module is installed later on. To prevent filling cjs loader's statCache with entries for non existing files,
 * we check if the module exists using getNodeModulesPath() before require.resolve().
 *
 * @param projectRoot - root path of the project/app.
 * @param moduleName - name of the node module.
 * @param options - optional options
 * @param options.cacheBuster - if set, append a query string to the import URL so the ESM loader treats this as a
 *   fresh import rather than returning a cached (potentially rejected) entry. Used by `getModule` after an
 *   install-then-retry sequence — Node's ESM loader does not expose a way to evict failed import URLs.
 * @returns - loaded module.
 */
export async function loadModuleFromProject<T>(
    projectRoot: string,
    moduleName: string,
    options?: { cacheBuster?: string }
): Promise<T> {
    let module: T;
    let baseUrl: string | undefined;
    try {
        const modulePath = await getModulePath(projectRoot, moduleName);
        baseUrl = pathToFileURL(modulePath).href;
        // If a previous call poisoned this base URL (Node ESM caches import failures permanently),
        // reuse the successful busted URL from that call instead of hitting the cached failure again.
        const importUrl =
            successfulBustedUrls.get(baseUrl) ??
            (options?.cacheBuster ? `${baseUrl}?v=${options.cacheBuster}` : baseUrl);
        module = (await import(importUrl)) as T;
        // Record a successful busted URL so future callers bypass the poisoned plain URL.
        if (options?.cacheBuster && !successfulBustedUrls.has(baseUrl)) {
            successfulBustedUrls.set(baseUrl, importUrl);
        }
    } catch (error) {
        // If the import failed for a URL that was previously stored as a successful buster,
        // remove the stale entry so the next caller can reinstall and store a fresh one.
        if (baseUrl && successfulBustedUrls.has(baseUrl)) {
            successfulBustedUrls.delete(baseUrl);
        }
        throw Error(`Module '${moduleName}' not installed in project '${projectRoot}'.\n${error.toString()}`);
    }
    return module;
}

/**
 * Get a module, if it is not cached it will be installed and returned.
 *
 * Concurrent callers (e.g. parallel Jest workers) coordinate through a file lock at the cache directory so the
 * install runs only once. After acquiring the lock, re-check the filesystem (another process may have completed
 * the install while we waited) before running npm install.
 *
 * @param module - name of the module
 * @param version - version of the module
 * @param options - optional options
 * @param options.logger - optional logger instance
 * @returns - module
 */
export async function getModule<T>(module: string, version: string, options?: { logger?: Logger }): Promise<T> {
    const logger = options?.logger;
    const moduleParentDirectory = join(moduleCacheRoot, module);
    const moduleDirectory = join(moduleParentDirectory, version);
    const modulePackagePath = join(moduleDirectory, FileName.Package);
    const installCommand = ['install', '--prefix', moduleDirectory, `${module}@${version}`];

    // Lock at moduleDirectory granularity so different versions don't block each other.
    // proper-lockfile stores the lock as <target>.lock (a sibling), so rm(moduleDirectory)
    // during reinstall does not orphan it.
    // The target must exist before locking, so create it eagerly; remember if it was already
    // there so we only wipe a pre-existing corrupt directory, not the one we just created.
    const moduleDirectoryExisted = existsSync(moduleDirectory);
    await mkdir(moduleDirectory, { recursive: true });
    const releaseLock = await acquireModuleLock(moduleDirectory);
    try {
        // Double-check after acquiring the lock — another process may have completed the
        // install while we were waiting.
        if (!existsSync(modulePackagePath)) {
            if (moduleDirectoryExisted) {
                await rm(moduleDirectory, { recursive: true });
                await mkdir(moduleDirectory, { recursive: true });
            }
            await execNpmCommand(installCommand, { cwd: moduleDirectory, logger });
        }
        let resolvedModule: T;
        try {
            resolvedModule = await loadModuleFromProject<T>(moduleDirectory, module);
        } catch (e) {
            logger?.error(`Failed to load module: ${module}. Attempting to fix installation.`);
            const modulePackageLockPath = join(moduleDirectory, FileName.PackageLock);
            // If 'package-lock.json' file exists then use 'npm ci', otherwise try reinstall
            const command = existsSync(modulePackageLockPath) ? ['ci'] : installCommand;
            // Run reinstall only if the first attempt fails
            await execNpmCommand(command, {
                cwd: moduleDirectory,
                logger
            });
            // Retry loading with a cache-buster — the previous import URL is now permanently rejected in the
            // ESM loader's module map and would re-throw without re-reading the freshly installed files.
            resolvedModule = await loadModuleFromProject<T>(moduleDirectory, module, {
                cacheBuster: `${process.pid}-${Date.now()}`
            });
        }
        return resolvedModule;
    } finally {
        await releaseLock();
    }
}

/**
 * Acquire a cross-process file lock on the module cache directory. Retries with backoff if another process
 * holds the lock, since the install can take tens of seconds. Treats lockfile failures (e.g. an unsupported
 * filesystem) as non-fatal and returns a no-op release so callers can proceed unsynchronized — losing race
 * protection but not blocking work.
 *
 * @param targetDirectory - directory whose access should be serialized.
 * @returns release function to call after the critical section.
 */
async function acquireModuleLock(targetDirectory: string): Promise<() => Promise<void>> {
    try {
        return await properLockfile.lock(targetDirectory, {
            // npm install for a single module typically takes 5-30s on CI; allow plenty of slack on stale.
            stale: 120000,
            retries: { retries: 60, factor: 1, minTimeout: 250, maxTimeout: 1000 }
        });
    } catch {
        return async () => {};
    }
}

/**
 * Delete a module from cache.
 *
 * @param module - name of the module
 * @param version - version of the module
 */
export async function deleteModule(module: string, version: string): Promise<void> {
    const moduleDirectory = join(moduleCacheRoot, module, version);
    if (existsSync(moduleDirectory)) {
        await rm(moduleDirectory, { recursive: true });
    }
}
