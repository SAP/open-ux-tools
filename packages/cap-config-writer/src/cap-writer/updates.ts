import type { CapServiceCdsInfo, CapProjectSettings } from '../cap-config/types';
import { updateRootPackageJson, updateAppPackageJson } from './package-json';
import { updateTsConfig} from './tsconfig-and-yaml';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';

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
 * @param {boolean} capProjectSettings.enableNPMWorkspaces - Indicates if NPM workspaces are enabled.
 * @param {boolean} capProjectSettings.enableCdsUi5Plugin - Indicates if the CDS UI5 plugin is enabled.
 * @param {boolean} [capProjectSettings.enableTypescript] - Indicates if TypeScript is enabled.
 * @param {Logger} [log] - logger for logging information.
 * @returns {Promise<void>} A promise that resolves when the updates are applied.
 */
export async function applyCAPUpdates(
    fs: Editor,
    capService: CapServiceCdsInfo,
    capProjectSettings: CapProjectSettings,
    log?: Logger
): Promise<void> {
    const {
        appRoot,
        packageName,
        appId,
        sapux = false,
        enableNPMWorkspaces = false,
        enableCdsUi5Plugin = false,
        enableTypescript = false
    } = capProjectSettings;

    // update root package.json
    await updateRootPackageJson(fs, packageName, sapux, capService, appId, log, enableNPMWorkspaces);

    if (enableTypescript) {
        // update tsconfig.json if TypeScript is enabled
        updateTsConfig(fs, appRoot);
    }
    if (enableCdsUi5Plugin || enableNPMWorkspaces) {
        // update app package.json if CDS UI5 plugin is enabled or NPM workspaces are enabled
        updateAppPackageJson(fs, appRoot);
    }
}
