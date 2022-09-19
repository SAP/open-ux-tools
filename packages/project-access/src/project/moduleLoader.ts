import { t } from '../i18n';

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
        const modulePath = require.resolve(moduleName, { paths: [projectRoot] });
        module = (await import(modulePath)) as T;
    } catch (error) {
        throw Error(t('error.moduleNotInstalled', { moduleName, projectRoot }));
    }
    return module;
}
