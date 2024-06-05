import type { Package } from '@sap-ux/project-access';
import { getCapCustomPaths } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import path, { join } from 'path';
import type { CdsUi5PluginInfo, CapServiceCdsInfo } from '../cap-config/types';
import { enableCdsUi5Plugin, checkCdsUi5PluginEnabled, satisfiesMinCdsVersion, minCdsVersion } from '../cap-config';
import type { Logger } from '@sap-ux/logger';
import { t } from '../i18n';

/**
 * Retrieves the CDS watch script for the CAP app.
 *
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [useNPMWorkspaces] - Whether to use npm workspaces.
 * @returns {{ [x: string]: string }} The CDS watch script for the CAP app.
 */
export function getCDSWatchScript(
    projectName: string,
    appId: string,
    useNPMWorkspaces: boolean = false
): { [x: string]: string } {
    const DisableCacheParam = 'sap-ui-xx-viewCache=false';
    // projects by default are served base on the folder name in the app/ folder
    // If the project uses npm workspaces (and specifically cds-plugin-ui5 ) then the project is served using the appId including namespace
    const project = useNPMWorkspaces ? appId : projectName + '/webapp';
    return {
        [`watch-${projectName}`]: `cds watch --open ${project}/index.html?${DisableCacheParam}${
            useNPMWorkspaces ? ' --livereload false' : ''
        }`
    };
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
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [enableNPMWorkspaces] - Whether to enable npm workspaces.
 * @param {CapServiceCdsInfo} cdsUi5PluginInfo - cds Ui5 plugin info.
 * @param {Logger} [log] - The logger instance for logging warnings.
 * @returns {Promise<void>} A Promise that resolves once the scripts are updated.
 */
async function updateScripts(
    fs: Editor,
    packageJsonPath: string,
    projectName: string,
    appId: string,
    enableNPMWorkspaces?: boolean,
    cdsUi5PluginInfo?: CdsUi5PluginInfo,
    log?: Logger
): Promise<void> {
    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
    const hasNPMworkspaces = await checkCdsUi5PluginEnabled(packageJsonPath, fs);
    // Determine whether to add cds watch scripts for the app based on the availability of minimum CDS version information.
    // If 'cdsUi5PluginInfo' contains version information and it satisfies the minimum required CDS version,
    // or if 'cdsUi5PluginInfo' is not available and the version specified in 'package.json' satisfies the minimum required version,
    // then set 'addScripts' to true. Otherwise, set it to false.
    const addScripts = cdsUi5PluginInfo?.hasMinCdsVersion ? cdsUi5PluginInfo.hasMinCdsVersion : satisfiesMinCdsVersion(packageJson);
    if (addScripts) {
        const cdsScript = getCDSWatchScript(projectName, appId, enableNPMWorkspaces ?? hasNPMworkspaces);
        updatePackageJsonWithScripts(fs, packageJsonPath, cdsScript);
    } else {
        log?.warn(t('warn.cdsDKNotInstalled', { minCdsVersion: minCdsVersion }));
    }
}

/**
 * Updates the root package.json file of CAP projects with the following changes:
 * 1) Adds the app name to the sapux array in the root package.json if sapux is enabled.
 * 2) Adds the cds watch script to the root package.json if applicable.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} projectName - The name of the project.
 * @param {boolean} sapux - Whether to add the app name to the sapux array.
 * @param {CapServiceCdsInfo} capService - The CAP service instance.
 * @param {string} appId - The ID of the app.
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
        await updateScripts(
            fs,
            packageJsonPath,
            projectName,
            appId,
            enableNPMWorkspaces,
            capService.cdsUi5PluginInfo,
            log
        );
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
