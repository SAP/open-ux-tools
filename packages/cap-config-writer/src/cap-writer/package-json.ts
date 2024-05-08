import {
    type Package,
    getCapCustomPaths,
    getPackageJson,
    getPackageJsonPath,
    getCdsVersionInfo
} from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { t } from '../i18n';
import { join } from 'path';
import { enableCdsUi5Plugin, checkCdsUi5PluginEnabled, satisfiesMinCdsVersion } from '../cap-config';
import { getCDSTask, toPosixPath } from './helpers';
import type { Logger } from '@sap-ux/logger';
import type { CapService, CapRuntime } from '@sap-ux/odata-service-inquirer';

const minCdsVersion = '6.8.2';

/**
 * Updates the scripts in the package json file with the provided scripts object.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} packageJsonPath - The path to the package.json file.
 * @param {Record<string, string>} scripts - The scripts to be added or updated in the package.json file.
 * @returns {void}
 */
function updatePackageJsonWithScripts(fs: Editor, packageJsonPath: string, scripts: Record<string, string>): void {
    fs.extendJSON(packageJsonPath, { scripts });
}

/**
 * Updates the scripts in the package json file for a CAP project.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} packageJsonPath - The path to the package.json file.
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [enableNPMWorkspaces] - Whether to enable npm workspaces.
 * @param {Logger} [log] - The logger instance for logging warnings.
 * @returns {Promise<void>} A Promise that resolves once the scripts are updated.
 */
async function updateScripts(
    fs: Editor,
    packageJsonPath: string,
    projectName: string,
    appId: string,
    enableNPMWorkspaces?: boolean,
    log?: Logger
): Promise<void> {
    const packageJson: Package = getPackageJson(fs, packageJsonPath);
    const hasNPMworkspaces = await checkCdsUi5PluginEnabled(packageJsonPath, fs);
    const cdsVersion = await getCdsVersionInfo();
    if (cdsVersion.home && satisfiesMinCdsVersion(packageJson)) {
        const cdsScript = getCDSTask(projectName, appId, enableNPMWorkspaces ?? hasNPMworkspaces);
        updatePackageJsonWithScripts(fs, packageJsonPath, cdsScript);
    } else {
        log?.warn(t('warn.cdsDKNotInstalled', { cdsVersion: cdsVersion.home, minCdsVersion: minCdsVersion }));
    }
}

/**
 * Updates the root package.json file of CAP projects with the following changes:
 * 1) Adds the app name to the sapux array in the root package.json if sapux is enabled.
 * 2) Adds the cds watch script to the root package.json tasks if applicable.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} projectName - The name of the project.
 * @param {boolean} sapux - Whether to add the app name to the sapux array.
 * @param {CapService} capService - The CAP service instance.
 * @param {string} appId - The ID of the app.
 * @param {Logger} [log] - The logger instance for logging warnings.
 * @param {boolean} [enableNPMWorkspaces] - Whether to enable npm workspaces.
 * @returns {Promise<void>} A Promise that resolves once the root package.json is updated.
 */
export async function updateRootPackageJsonCAP(
    fs: Editor,
    projectName: string,
    sapux: boolean,
    capService: CapService,
    appId: string,
    log?: Logger,
    enableNPMWorkspaces?: boolean
): Promise<void> {
    const packageJsonPath: string = getPackageJsonPath(capService.projectPath);
    const packageJson = getPackageJson(fs, packageJsonPath);
    const capNodeType: CapRuntime = 'Node.js';

    if (enableNPMWorkspaces) {
        await enableCdsUi5Plugin(capService.projectPath, fs);
    }
    if (capService?.capType === capNodeType) {
        await updateScripts(fs, packageJsonPath, projectName, appId, enableNPMWorkspaces, log);
    }
    if (sapux) {
        const capProjectPath = toPosixPath(
            join(capService.appPath ?? (await getCapCustomPaths(capService.projectPath)).app, projectName)
        );
        const sapuxExt = Array.isArray(packageJson?.sapux) ? [...packageJson.sapux, capProjectPath] : [capProjectPath];
        fs.extendJSON(packageJsonPath, { sapux: sapuxExt });
    }
}

/**
 * Updates the package.json file of a CAP project app by removing the sapux property
 * and start scripts, as well as the 'int-test' script.
 *
 * @param {Editor} fs The file system editor.
 * @param {string} appRoot The root directory of the application.
 */
export function updateAppPackageJsonCAP(fs: Editor, appRoot: string): void {
    const packageJsonPath: string = join(appRoot, 'package.json');
    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;

    delete packageJson.sapux;
    if (packageJson?.scripts) {
        delete packageJson.scripts['int-test'];
    }
    for (const script in packageJson.scripts) {
        if (script.startsWith('start')) {
            delete packageJson.scripts[script];
        }
    }
    fs.writeJSON(packageJsonPath, packageJson);
}
