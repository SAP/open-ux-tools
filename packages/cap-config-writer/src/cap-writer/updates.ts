import type { CapServiceCdsInfo, CapProjectSettings } from '../cap-config/types';
import { updateRootPackageJson, updateAppPackageJson } from './package-json';
import { updateTsConfig } from './tsconfig-and-yaml';
import { enableCdsUi5Plugin as writeCdsUi5Plugin } from '../cap-config';
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
 * @param {boolean} capProjectSettings.disableRootPackageJsonUpdates - Indicates if updates to the root package.json should be disabled. If true, the root package.json will not be updated with the sapux array or the cds watch scripts.
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
        enableTypescript = false,
        disableRootPackageJsonUpdates = false
    } = capProjectSettings;

    if (disableRootPackageJsonUpdates) {
        // if root package.json updates are disabled, we will only write the cds ui5 plugin if enabled, but not update scripts or sapux array in the root package.jsonx
        if (enableCdsUi5Plugin) {
            await writeCdsUi5Plugin(capService.projectPath, fs);
        }
    } else {
        // update root package.json
        await updateRootPackageJson(fs, packageName, sapux, capService, appId, enableCdsUi5Plugin);
    }

    if (enableTypescript) {
        // update tsconfig.json if TypeScript is enabled
        updateTsConfig(fs, appRoot);
    }

    if (capService.capType === 'Node.js' && enableCdsUi5Plugin) {
        // update app package.json if CDS UI5 plugin is enabled
        updateAppPackageJson(fs, appRoot);
    }
}
