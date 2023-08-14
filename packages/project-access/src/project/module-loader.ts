import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { getNodeModulesPath } from './dependencies';

const modulePathCache: Map<string, string> = new Map();

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
        if (!getNodeModulesPath(projectRoot, moduleName)) {
            throw Error('Path to module not found.');
        }
        const modulePath = require.resolve(moduleName, { paths: [projectRoot] });
        module = (await import(modulePath)) as T;
    } catch (error) {
        throw Error(`Module '${moduleName}' not installed in project '${projectRoot}'.\n${error.toString()}`);
    }
    return module;
}

/**
 * Load module from all known locations (require.resolve.paths(ModuleName)).
 *
 * @param moduleName - name of the node module
 * @returns - loaded module.
 */
export async function loadModule<T>(moduleName: string) {
    let module: T;
    try {
        if (!modulePathCache.has(moduleName)) {
            modulePathCache.set(moduleName, await getModulePath(moduleName));
        }
        const modulePath = modulePathCache.get(moduleName) as string;
        module = (await import(modulePath)) as T;
    } catch (error) {
        throw Error(`Module '${moduleName}' not installed.\n${error.toString()}`);
    }
    return module;
}

/**
 * Call require.resolve(moduleName) in a spawned process.
 * This is required in case module path is gathered from within an
 * isolated node environment, like from a Visual Studio Code extension.
 * It ensures that the systems node environment is used to find the
 * path to the module.
 *
 * @param moduleName - name of the node module
 * @returns - path to module
 */
async function getModulePath(moduleName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let out = '';
        const nodeResolvePaths = spawn('node', [
            '-e',
            `process.stdout.write(require.resolve('${moduleName}', { paths: require.resolve.paths('${moduleName}')}))`
        ]);
        nodeResolvePaths.stdout.on('data', (data) => {
            out += data.toString();
        });
        nodeResolvePaths.on('close', () => {
            if (out && existsSync(out)) {
                resolve(out);
            } else {
                reject(new Error('Module path not found'));
            }
        });
        nodeResolvePaths.on('error', (error) => {
            reject(error);
        });
    });
}
