import { getCapFolderPathsSync } from '@sap-ux/fiori-generator-shared';
import type { CapServiceCdsInfo } from '../cap-config/types';
import { updateRootPackageJson, updateAppPackageJson } from './package-json';
import { updateTsConfig, updateStaticLocationsInApplicationYaml } from './tsconfig-and-yaml';
import { updatePomXml } from './pom-xml';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Updates the pom.xml file and the application.yaml file for a CAP Java project.
 *
 * @param {Editor} fs - The file system editor object.
 * @param {string} capProjectPath - The path to the CAP project.
 * @param {ToolsLogger} [log] - logger for logging information.
 * @returns {Promise<void>} A promise that resolves when the updates are applied.
 */
export async function applyCAPJavaUpdates(fs: Editor, capProjectPath: string, log?: ToolsLogger): Promise<void> {
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

/**
 * Applies updates to a CAP project based on the provided options.
 *
 * @async
 * @param {Editor} fs - The file system editor object.
 * @param {string} appRoot - The root directory of the application.
 * @param {CapServiceCdsInfo} capService - The CAP service information.
 * @param {boolean} sapux - Indicates whether SAP UX is enabled.
 * @param {string} packageName - The name of the package.
 * @param {string} appId - The application's ID, including its namespace and the module name.
 * @param {boolean} enableNPMWorkspaces - Indicates whether NPM workspaces are enabled.
 * @param {boolean} [enableCdsUi5PluginEnabled] - Indicates whether the CDS UI5 plugin is enabled.
 * @param {boolean} [enableTypescript] - Indicates whether TypeScript is enabled.
 * @param {ToolsLogger} [log] - logger for logging information.
 * @returns {Promise<void>} A promise that resolves when the updates are applied.
 */
export async function applyCAPUpdates(
    fs: Editor,
    appRoot: string,
    capService: CapServiceCdsInfo,
    sapux: boolean,
    packageName: string,
    appId: string,
    enableNPMWorkspaces: boolean,
    enableCdsUi5PluginEnabled?: boolean,
    enableTypescript?: boolean,
    log?: ToolsLogger
): Promise<void> {
    // update root package.json
    await updateRootPackageJson(
        fs,
        packageName,
        sapux,
        capService as CapServiceCdsInfo,
        appId,
        log as unknown as ToolsLogger,
        enableNPMWorkspaces
    );

    if (capService.capType === 'Java') {
        await applyCAPJavaUpdates(fs, capService.projectPath, log);
    }

    if (enableTypescript) {
        // update tsconfig.json if TypeScript is enabled
        updateTsConfig(fs, appRoot);
    }
    if (enableCdsUi5PluginEnabled || enableNPMWorkspaces) {
        // update app package.json if CDS UI5 plugin is enabled or NPM workspaces are enabled
        updateAppPackageJson(fs, appRoot);
    }
}
