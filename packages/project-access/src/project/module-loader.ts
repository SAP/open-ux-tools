import { existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Logger } from '@sap-ux/logger';
import { getNodeModulesPath } from './dependencies';
import { FileName, moduleCacheRoot } from '../constants';
import { execNpmCommand } from '../command';

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
 * @returns - loaded module.
 */
export async function loadModuleFromProject<T>(projectRoot: string, moduleName: string): Promise<T> {
    let module: T;
    try {
        const modulePath = await getModulePath(projectRoot, moduleName);
        module = (await import(modulePath)) as T;
    } catch (error) {
        throw Error(`Module '${moduleName}' not installed in project '${projectRoot}'.\n${error.toString()}`);
    }
    return module;
}

/**
 * Get a module, if it is not cached it will be installed and returned.
 *
 * @param module - name of the module
 * @param version - version of the module
 * @param options - optional options
 * @param options.logger - optional logger instance
 * @returns - module
 */
export async function getModule<T>(module: string, version: string, options?: { logger?: Logger }): Promise<T> {
    const logger = options?.logger;
    const moduleDirectory = join(moduleCacheRoot, module, version);
    const modulePackagePath = join(moduleDirectory, FileName.Package);
    if (!existsSync(modulePackagePath)) {
        if (existsSync(moduleDirectory)) {
            await rm(moduleDirectory, { recursive: true });
        }
        await mkdir(moduleDirectory, { recursive: true });
        await writeFile(modulePackagePath, '{}');
        await execNpmCommand(['install', `${module}@${version}`], { cwd: moduleDirectory, logger });
    }
    return loadModuleFromProject<T>(moduleDirectory, module);
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
