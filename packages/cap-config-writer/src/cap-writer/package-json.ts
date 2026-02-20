import { existsSync } from 'node:fs';
import { FileName, getCapCustomPaths, getWebappPath } from '@sap-ux/project-access';
import { join, normalize, posix } from 'node:path';
import { enableCdsUi5Plugin } from '../cap-config';
import type { CapServiceCdsInfo } from '../cap-config/types';
import type { Editor } from 'mem-fs-editor';
import type { Manifest, Package } from '@sap-ux/project-access';

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
 * Returns updated watch scripts for the package.json.
 *
 * @param fs - the file system editor
 * @param projectPath - the path to the cap project
 * @param appsPath - the path to the apps directory
 * @param packageJson - the package.json object
 * @returns - the watch scripts for existing applications
 */
async function updateExistingWatchScripts(
    fs: Editor,
    projectPath: string,
    appsPath: string,
    packageJson: Package
): Promise<{ [x: string]: string } | undefined> {
    const cdsScripts: { [x: string]: string } = {};

    if (!packageJson?.scripts) {
        return cdsScripts;
    }

    for (const script in packageJson.scripts) {
        if (script.startsWith('watch-') && packageJson?.scripts?.[script]?.includes('/webapp/')) {
            const appName = script.split('-')[1];
            const appPath = join(projectPath, appsPath, appName);
            if (existsSync(appPath)) {
                const manifestPath = join(await getWebappPath(appPath), FileName.Manifest);
                const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
                const appId = manifest['sap.app']?.id;
                if (appId) {
                    Object.assign(cdsScripts, getCDSWatchScript(appName, appId));
                }
            }
        }
    }

    return cdsScripts;
}

/**
 * Updates the scripts in the package json file for a CAP project.
 *
 * @param {Editor} fs - The file system editor.
 * @param {Package} packageJson - The package.json object to be updated.
 * @param project - project details.
 * @param {string} project.projectPath - the path to the CAP project.
 * @param {string} project.projectName - the project name.
 * @param {string} project.appsPath - the path to the apps directory in the cap project
 * @param {string} project.appId - The application's ID, including its namespace and the module name.
 * @param {boolean} addCdsUi5Plugin - whether to add cds ui5 plugin.
 * @returns {Promise<void>} A Promise that resolves once the scripts are updated.
 */
async function updateScripts(
    fs: Editor,
    packageJson: Package,
    {
        projectPath,
        projectName,
        appsPath,
        appId
    }: {
        projectPath: string;
        projectName: string;
        appsPath: string;
        appId: string;
    },
    addCdsUi5Plugin?: boolean
): Promise<void> {
    let cdsScripts: { [x: string]: string } = {};

    if (addCdsUi5Plugin) {
        // If the project has the cds-plugin-ui5 then the project is served using the appId
        // Update existing watch scripts if they exist
        Object.assign(cdsScripts, await updateExistingWatchScripts(fs, projectPath, appsPath, packageJson));
        // Add the watch script for the new app
        Object.assign(cdsScripts, getCDSWatchScript(projectName, appId));
    } else {
        cdsScripts = getCDSWatchScript(projectName);
    }
    updatePackageJsonWithScripts(fs, join(projectPath, 'package.json'), cdsScripts);
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
 * @param {boolean} addCdsUi5Plugin - whether to add the cds ui5 plugin.
 * @returns {Promise<void>} A Promise that resolves once the root package.json is updated.
 */
export async function updateRootPackageJson(
    fs: Editor,
    projectName: string,
    sapux: boolean,
    capService: CapServiceCdsInfo,
    appId: string,
    addCdsUi5Plugin?: boolean
): Promise<void> {
    const packageJsonPath: string = join(capService.projectPath, 'package.json');
    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
    const capNodeType = 'Node.js';
    const appsPath = (await getCapCustomPaths(capService.projectPath)).app;

    if (capService?.capType === capNodeType) {
        if (addCdsUi5Plugin) {
            await enableCdsUi5Plugin(capService.projectPath, fs);
        }
        await updateScripts(
            fs,
            packageJson,
            { projectPath: capService.projectPath, projectName, appsPath, appId },
            addCdsUi5Plugin
        );
    }

    if (sapux) {
        const dirPath = join(capService.appPath ?? appsPath, projectName);
        // Converts a directory path to a POSIX-style path.
        const capProjectPath = normalize(dirPath).split(/[\\/]/g).join(posix.sep);
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
