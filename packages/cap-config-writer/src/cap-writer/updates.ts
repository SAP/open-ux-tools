import { getCapFolderPathsSync } from '@sap-ux/fiori-generator-shared';
import type { CapServiceCdsInfo, CapProjectSettings } from '../cap-config/types';
import { updateRootPackageJson, updateAppPackageJson } from './package-json';
import { updateTsConfig, updateStaticLocationsInApplicationYaml } from './tsconfig-and-yaml';
import { updatePomXml } from './pom-xml';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
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
 * @param {boolean} capProjectSettings.enableNPMWorkspaces - indicates if NPM workspaces will be enabled (default is true).
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
        enableCdsUi5Plugin = true,
        enableTypescript = false
    } = capProjectSettings;

    // update root package.json
    await updateRootPackageJson(fs, packageName, sapux, capService, appId, enableCdsUi5Plugin);

    if (capService.capType === 'Java') {
        const capProjectPath = capService.projectPath;
        const capCustomPaths = getCapFolderPathsSync(capProjectPath);
        //pom.xml file update
        const pomPath: string = join(capProjectPath, 'pom.xml');
        if (fs.exists(pomPath)) {
            updatePomXml(fs, pomPath, log);
        }

        // Application.yaml file update
        const applicationYamlPath: string = join(
            capProjectPath,
            capCustomPaths.srv,
            'src',
            'main',
            'resources',
            'application.yaml'
        );
        if (fs.exists(applicationYamlPath)) {
            await updateStaticLocationsInApplicationYaml(fs, applicationYamlPath, capCustomPaths.app, log);
        }
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
