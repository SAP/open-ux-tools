import { execSync } from 'child_process';

/**
 * Load module from project or app. Throws error if module is not installed.
 *
 * @param projectRoot - root path of the project/app.
 * @param moduleName - name of the npm module.
 * @returns - loaded module.
 */
export async function loadModuleFromProject<T>(projectRoot: string, moduleName: string): Promise<T> {
    let module: T;
    try {
        // Run resolve in separate process to avoid caching module with error state
        execSync(`cd ${projectRoot} && node -e require.resolve('${moduleName}')`);
        // Resolve module
        const modulePath = require.resolve(moduleName, { paths: [projectRoot] });
        module = (await import(modulePath)) as T;
    } catch (error) {
        throw Error(`Module '${moduleName}' not installed in project '${projectRoot}'`);
    }
    return module;
}
