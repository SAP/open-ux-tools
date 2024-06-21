import { existsSync } from 'fs';
import { dirname, isAbsolute, join, parse } from 'path';
import { FileName } from '../constants';
import { readJSON, updatePackageJSON } from '../file';
import type { Package } from '../types';
import type { Editor } from 'mem-fs-editor';

/**
 * Helper to check for dependency/devDependency.
 *
 * @param packageJson - content of package.json to check
 * @param dependency - name of the dependency
 * @returns - true: has dependency; false: no dependency
 */
export const hasDependency = (packageJson: Package, dependency: string): boolean =>
    !!(packageJson.dependencies?.[dependency] ?? packageJson.devDependencies?.[dependency]);

/**
 * Returns path to folder that hosts 'node_modules' used by project.
 * Optionally, a module name can be passed to check for. This is
 * useful to check if a module is hoisted in a mono repository.
 *
 * @param projectRoot - absolute path to root of the project/app.
 * @param [module] -  optional module name to find in node_modules
 * @returns - parent path of node_modules used by project or undefined if node module path was not found
 */
export function getNodeModulesPath(projectRoot: string, module?: string): string | undefined {
    if (!isAbsolute(projectRoot)) {
        return undefined;
    }
    const { root } = parse(projectRoot);
    let currentDir = projectRoot;
    let modulesPath;
    while (currentDir !== root) {
        let checkPath = join(currentDir, 'node_modules');
        if (module) {
            checkPath = join(checkPath, module, FileName.Package);
        }
        if (existsSync(checkPath)) {
            modulesPath = currentDir;
            break;
        }
        currentDir = dirname(currentDir);
    }
    return modulesPath;
}

/**
 * Adds a new dev dependency to the package.json.
 *
 * @param basePath - the base path
 * @param depName - the dependency name
 * @param depVersion - the dependency version
 * @param fs - optional memfs editor instance
 */
export async function addPackageDevDependency(
    basePath: string,
    depName: string,
    depVersion: string,
    fs?: Editor
): Promise<void> {
    const filePath = join(basePath, FileName.Package);
    const packageJson = await readJSON<Package>(filePath, fs);
    packageJson.devDependencies = packageJson.devDependencies ?? {};
    if (!packageJson.devDependencies[depName]) {
        packageJson.devDependencies[depName] = depVersion;
    }
    await updatePackageJSON(filePath, packageJson, fs);
}
