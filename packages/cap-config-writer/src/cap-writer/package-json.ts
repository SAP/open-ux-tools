import type { Package } from '@sap-ux/project-access';
import { getCapCustomPaths } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import path, { dirname, join } from 'path';
import type { CapServiceCdsInfo } from '../cap-config/types';
import { enableCdsUi5Plugin, checkCdsUi5PluginEnabled } from '../cap-config';
import type { Logger } from '@sap-ux/logger';

/**
 * Retrieves the CDS watch script for the CAP app.
 *
 * @param {string} projectName - The project's name, which is the module name.
 * @param {string} appId - The application's ID, including its namespace and the module name. 
    If appId is provided, it will be used to open the application instead of the project name. This option is available for use with npm workspaces.
 * @returns {{ [x: string]: string }} The CDS watch script for the CAP app.
 */
export function getCDSWatchScript(projectName: string, appId?: string): { [x: string]: string } {
    const DisableCacheParam = 'sap-ui-xx-viewCache=false';
    // projects by default are served base on the folder name in the app/ folder
    const project = appId ?? projectName + '/webapp';
    const watchScript = {
        [`watch-${projectName}`]: `cds watch --open ${project}/index.html?${DisableCacheParam}${
            appId ? ' --livereload false' : ''
        }`
    };
    return watchScript;
}

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
 * @param {string} projectName - The project's name, which is the module name.
 * @param {string} appId - The application's ID, including its namespace and the module name.
 * @param {boolean} [enableNPMWorkspaces] - Whether to enable npm workspaces.
 * @returns {Promise<void>} A Promise that resolves once the scripts are updated.
 */
async function updateScripts(
    fs: Editor,
    packageJsonPath: string,
    projectName: string,
    appId: string,
    enableNPMWorkspaces?: boolean
): Promise<void> {
    const hasNPMworkspaces = await checkCdsUi5PluginEnabled(dirname(packageJsonPath), fs);
    let cdsScript;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (enableNPMWorkspaces || hasNPMworkspaces) {
        // If the project uses npm workspaces (and specifically cds-plugin-ui5 ) then the project is served using the appId
        cdsScript = getCDSWatchScript(projectName, appId);
    } else {
        cdsScript = getCDSWatchScript(projectName);
    }
    updatePackageJsonWithScripts(fs, packageJsonPath, cdsScript);
}

/**
 * Updates the root package.json file of CAP projects with the following changes:
 * 1) Adds the app name to the sapux array in the root package.json if sapux is enabled.
 * 2) Adds the cds watch script to the root package.json if applicable.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} projectName - The project's name, which is the module name.
 * @param {boolean} sapux - Whether to add the app name to the sapux array.
 * @param {CapServiceCdsInfo} capService - The CAP service instance.
 * @param {string} appId - The application's ID, including its namespace and the module name.
 * @param {Logger} [log] - The logger instance for logging warnings.
 * @param {boolean} [enableNPMWorkspaces] - Whether to enable npm workspaces.
 * @returns {Promise<void>} A Promise that resolves once the root package.json is updated.
 */
export async function updateRootPackageJson(
    fs: Editor,
    projectName: string,
    sapux: boolean,
    capService: CapServiceCdsInfo,
    appId: string,
    log?: Logger,
    enableNPMWorkspaces?: boolean
): Promise<void> {
    const packageJsonPath: string = join(capService.projectPath, 'package.json');
    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
    const capNodeType = 'Node.js';

    if (enableNPMWorkspaces && packageJson) {
        await enableCdsUi5Plugin(capService.projectPath, fs);
    }
    if (capService?.capType === capNodeType) {
        await updateScripts(fs, packageJsonPath, projectName, appId, enableNPMWorkspaces);
    }
    if (sapux) {
        const dirPath = join(capService.appPath ?? (await getCapCustomPaths(capService.projectPath)).app, projectName);
        // Converts a directory path to a POSIX-style path.
        const capProjectPath = path.normalize(dirPath).split(/[\\/]/g).join(path.posix.sep);
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
export function updateAppPackageJson(fs: Editor, appRoot: string): void {
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
