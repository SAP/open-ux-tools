import type { CapServiceCdsInfo, CapProjectSettings } from '../cap-config/types';
import { updateRootPackageJson, updateAppPackageJson } from './package-json';
import { updateTsConfig } from './tsconfig-and-yaml';
import type { Editor } from 'mem-fs-editor';

/**
 * Applies updates to a CAP project based on the provided options.
 *
 * @async
 * @param {Editor} fs - The file system editor object.
 * @param {CapServiceCdsInfo} capService - The CAP service information.
 * @param {CapProjectSettings} capProjectSettings - Settings related to the CAP project.
 * @param {string} capProjectSettings.appRoot - The application's root path.
 * @param {string} capProjectSettings.packageName - The name of the package.
 * @param {string} capProjectSettings.appId - The application's ID, including its namespace and the module name.
 * @param {boolean} capProjectSettings.sapux - Indicates if SAP UX is enabled.
 * @param {boolean} capProjectSettings.enableCdsUi5Plugin - Indicates if cds ui5 plugin should be added (default is true).  The cds ui5 plugin will only be added if the minimum cds version that supports it is present.
 * @param {boolean} capProjectSettings.enableTypescript - Indicates if TypeScript is enabled.
 * @returns {Promise<void>} A promise that resolves when the updates are applied.
 */
export async function applyCAPUpdates(
    fs: Editor,
    capService: CapServiceCdsInfo,
    capProjectSettings: CapProjectSettings
): Promise<void> {
    const {
        appRoot,
        packageName,
        appId,
        sapux = false,
        enableCdsUi5Plugin = true,
        enableTypescript = false
    } = capProjectSettings;

    // update root package.json
    await updateRootPackageJson(fs, packageName, sapux, capService, appId, enableCdsUi5Plugin);

    if (enableTypescript) {
        // update tsconfig.json if TypeScript is enabled
        updateTsConfig(fs, appRoot);
    }

    if (capService.capType === 'Node.js' && enableCdsUi5Plugin) {
        // update app package.json if CDS UI5 plugin is enabled
        updateAppPackageJson(fs, appRoot);
    }
}
