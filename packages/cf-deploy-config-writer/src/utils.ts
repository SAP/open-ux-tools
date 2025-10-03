import { join, normalize, posix } from 'path';
import { promises as fs, readFileSync } from 'node:fs';
import { coerce, satisfies } from 'semver';
import type { Editor } from 'mem-fs-editor';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import {
    isAppStudio,
    listDestinations,
    isFullUrlDestination,
    type Authentication,
    type Destinations
} from '@sap-ux/btp-utils';
import {
    addPackageDevDependency,
    FileName,
    type Manifest,
    type Package,
    updatePackageScript
} from '@sap-ux/project-access';
import {
    MTAVersion,
    UI5Package,
    UI5PackageVersion,
    UI5TaskZipperPackage,
    UI5TaskZipperPackageVersion,
    rootDeployMTAScript,
    undeployMTAScript,
    Rimraf,
    RimrafVersion,
    MbtPackageVersion,
    MbtPackage,
    MTABuildScript,
    CDSDKPackage,
    CDSPackage
} from './constants';
import { type MTABaseConfig, type CFBaseConfig, type CFAppConfig } from './types';
import merge from 'lodash/merge';

let cachedDestinationsList: Destinations = {};

/**
 *  Read manifest file for processing.
 *
 * @param manifestPath Path to the manifest file
 * @param fs reference to a mem-fs editor
 * @returns Manifest object
 */
export async function readManifest(manifestPath: string, fs: Editor): Promise<Manifest> {
    return fs.readJSON(manifestPath) as unknown as Manifest;
}

/**
 * Locates template files relative to the dist folder.
 * This helps to locate templates when this module is bundled and the dir structure is flattened, maintaining the relative paths.
 *
 * @param relativeTemplatePath - optional, the path of the required template relative to the ./templates folder. If not specified the root templates folder is returned.
 * @returns the path of the template specified or templates root folder
 */
export function getTemplatePath(relativeTemplatePath: string): string {
    return join(__dirname, '../templates', relativeTemplatePath);
}

/**
 *  Convert an app name to an MTA ID that is suitable for CF deployment.
 *
 * @param id Name of the app, like `sap.ux.app`
 * @returns Name that's acceptable in an mta.yaml
 */
export function toMtaModuleName(id: string): string {
    return id.replace(/[`~!@#$%^&*£()|+=?;:'",.<>]/gi, '');
}

/**
 * Return a consistent file path across different platforms.
 *
 * @param dirPath Path to the directory
 * @returns Path to the directory with consistent separators
 */
export function toPosixPath(dirPath: string): string {
    return normalize(dirPath).split(/[\\/]/g).join(posix.sep);
}

/**
 * Get the destination properties, based on the destination value.
 *
 * @param destination destination name
 * @returns Destination properties, default properties returned if not found
 */
export async function getDestinationProperties(
    destination: string | undefined
): Promise<{ destinationIsFullUrl: boolean; destinationAuthentication: Authentication | undefined }> {
    let destinationIsFullUrl = false;
    let destinationAuthentication;
    if (isAppStudio() && destination) {
        const destinations = await getBTPDestinations();
        if (destinations[destination]) {
            destinationIsFullUrl = isFullUrlDestination(destinations[destination]);
            destinationAuthentication = destinations[destination].Authentication as Authentication;
        }
    }
    return { destinationIsFullUrl, destinationAuthentication };
}

/**
 * Retrieve the list of destinations from SAP BTP.
 *
 * @returns Destinations list
 */
export async function getBTPDestinations(): Promise<Destinations> {
    if (Object.keys(cachedDestinationsList).length === 0) {
        cachedDestinationsList = await listDestinations({ stripS4HCApiHosts: true });
    }
    return cachedDestinationsList;
}

/**
 * Validates the MTA version passed in the config.
 *
 * @param mtaVersion MTA version
 * @returns true if the version is valid
 */
export function validateVersion(mtaVersion?: string): boolean {
    const version = coerce(mtaVersion);
    if ((mtaVersion && !version) || (version && !satisfies(version, `>=${MTAVersion}`))) {
        throw new Error('Invalid MTA version specified. Please use version 0.0.1 or higher.');
    }
    return true;
}

/**
 * Appends xs-security.json to the project folder.
 *
 * @param {MTABaseConfig} config - MTA base configuration
 * @param {string} config.mtaPath - Path to the MTA project
 * @param {string} config.mtaId - MTA ID
 * @param {Editor} fs - Reference to a mem-fs editor
 * @param {boolean} [addTenant] - If true, append tenant to the xs-security.json file
 * @returns {void}
 */
export function addXSSecurityConfig({ mtaPath, mtaId }: MTABaseConfig, fs: Editor, addTenant: boolean = true): void {
    fs.copyTpl(getTemplatePath(`common/${FileName.XSSecurityJson}`), join(mtaPath, FileName.XSSecurityJson), {
        id: mtaId.slice(0, 100),
        addTenant
    });
}

/**
 *  Append .gitignore to project folder.
 *
 * @param targetPath Path to the project folder
 * @param fs reference to a mem-fs editor
 */
export function addGitIgnore(targetPath: string, fs: Editor): void {
    fs.copyTpl(getTemplatePath('gitignore.tmpl'), join(targetPath, FileName.DotGitIgnore), {});
}

/**
 * Appends server package.json to the project folder.
 *
 * @param {MTABaseConfig} config - MTA base configuration
 * @param {string} config.mtaPath - Path to the MTA project
 * @param {string} config.mtaId - MTA ID
 * @param {Editor} fs - Reference to a mem-fs editor
 * @returns {void}
 */
export function addRootPackage({ mtaPath, mtaId }: MTABaseConfig, fs: Editor): void {
    fs.copyTpl(getTemplatePath(FileName.Package), join(mtaPath, FileName.Package), {
        mtaId
    });
}

/**
 * Add common dependencies to the HTML5 app package.json.
 *
 * @param targetPath Path to the package.json file
 * @param fs reference to a mem-fs editor
 */
export async function addCommonPackageDependencies(targetPath: string, fs: Editor): Promise<void> {
    await addPackageDevDependency(targetPath, UI5TaskZipperPackage, UI5TaskZipperPackageVersion, fs);
    await addPackageDevDependency(targetPath, UI5Package, UI5PackageVersion, fs);
}

/**
 * Generate CF specific configurations to support deployment and undeployment.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 * @param addTenant If true, append tenant to the xs-security.json file
 */
export async function generateSupportingConfig(
    config: MTABaseConfig,
    fs: Editor,
    addTenant: boolean = true
): Promise<void> {
    if (config.mtaId && !fs.exists(join(config.mtaPath, 'package.json'))) {
        addRootPackage(config, fs);
    }
    if (config.mtaId && !fs.exists(join(config.mtaPath, FileName.XSSecurityJson))) {
        addXSSecurityConfig(config, fs, addTenant);
    }
    // Be a good citizen and add a .gitignore if missing from the existing project root
    if (!fs.exists(join(config.mtaPath, '.gitignore'))) {
        addGitIgnore(config.mtaPath, fs);
    }
}

/**
 * Update the writer configuration with defaults.
 *
 * @param config writer configuration
 */
export function setMtaDefaults(config: CFBaseConfig): void {
    config.mtaPath = config.mtaPath.replace(/\/$/, '');
    config.addConnectivityService ||= false;
    config.mtaId = toMtaModuleName(config.mtaId);
}

/**
 * Update the root package.json with scripts to deploy the MTA.
 *
 * @param {object} Options Input params
 * @param {string} Options.mtaId - MTA ID to be written to package.json
 * @param {string} Options.rootPath - MTA project path
 * @param memFs - optional reference to a mem-fs editor
 */
export async function updateRootPackage(
    { mtaId, rootPath }: { mtaId: string; rootPath: string },
    memFs: Editor
): Promise<void> {
    const packageFilePath = join(rootPath, FileName.Package);
    // In case of newly created projects, package.json will only exist in memory
    if (await fileExists(packageFilePath, memFs)) {
        // Align CDS versions if missing otherwise mta.yaml before-all scripts will fail
        await alignCdsVersions(rootPath, memFs);
        await addPackageDevDependency(rootPath, Rimraf, RimrafVersion, memFs);
        await addPackageDevDependency(rootPath, MbtPackage, MbtPackageVersion, memFs);
        let deployArgs: string[] = [];
        if (memFs?.exists(join(rootPath, FileName.MtaExtYaml))) {
            deployArgs = ['-e', FileName.MtaExtYaml];
        }
        for (const script of [
            { name: 'undeploy', run: undeployMTAScript(mtaId) },
            { name: 'build', run: `${MTABuildScript} --mtar archive` },
            { name: 'deploy', run: rootDeployMTAScript(deployArgs) }
        ]) {
            await updatePackageScript(rootPath, script.name, script.run, memFs);
        }
        // Handle external changes to package.json, introduced by cds
        if (await fileExists(packageFilePath)) {
            // package.json might not exist on disk, for example, when creating a new project from scratch.
            let diskJson: Package = {} as Package;
            try {
                const fileContent = readFileSync(packageFilePath, 'utf8');
                diskJson = (fileContent ? JSON.parse(fileContent) : {}) as Package;
            } catch {
                // Not much we can do here!
            }
            // Get latest changes
            const memoryJson = (memFs?.readJSON(packageFilePath, {}) ?? {}) as Package;
            // Merge disk changes into memory and write back to memFs, memory changes take precedence
            memFs.writeJSON(packageFilePath, merge({}, memoryJson, diskJson));
        }
    }
}

/**
 * Enforces valid router configuration by toggling routers as needed.
 *
 * @param config The current router configuration
 */
export function enforceValidRouterConfig(config: CFAppConfig): void {
    const { addManagedAppRouter, addAppFrontendRouter } = config;

    if (addManagedAppRouter) {
        config.addAppFrontendRouter = false;
    } else if (addAppFrontendRouter) {
        config.addManagedAppRouter = false;
    } else {
        // Set default values
        config.addManagedAppRouter ??= true;
        config.addAppFrontendRouter ??= false;
    }
}

/**
 * Append devDependency if missing, required by mta `cds build` step.
 *
 * @param rootPath Path to the project folder
 * @param fs reference to a mem-fs editor
 */
export async function alignCdsVersions(rootPath: string, fs: Editor): Promise<void> {
    const filePath = join(rootPath, FileName.Package);
    const packageJson = (fs.readJSON(filePath) ?? {}) as Package;
    const cdsDKDevDepVersion = coerce(packageJson?.devDependencies?.[CDSDKPackage]);
    const cdsDepVersion = packageJson?.dependencies?.[CDSPackage];
    if (!cdsDKDevDepVersion && cdsDepVersion) {
        await addPackageDevDependency(rootPath, CDSDKPackage, cdsDepVersion, fs);
    }
}

/**
 * Executes a command in the specified project directory.
 *
 * @async
 * @param {string} cwd - Working directory where the command will be executed
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Arguments to pass to the command
 * @param {string} errorMsg - Error message prefix to display if the command fails
 * @returns {Promise<void>} - A promise that resolves when the command completes successfully
 * @throws {Error} Throws an error with the provided error message concatenated with the original error if execution fails
 * @example
 * // Execute npm install in the project directory
 * await runCommand('/path/to/project', 'npm', ['install'], 'Failed to install dependencies:');
 */
export async function runCommand(cwd: string, cmd: string, args: string[], errorMsg: string): Promise<void> {
    const commandRunner = new CommandRunner();
    try {
        await commandRunner.run(cmd, args, { cwd });
    } catch (e) {
        throw new Error(`${errorMsg} ${e.message}`);
    }
}

/**
 * Check if a file exists in the file system.
 *
 * @param filePath Path to the file
 * @param memFs reference to a mem-fs editor
 * @returns true if the file exists, false otherwise
 */
export async function fileExists(filePath: string, memFs?: Editor): Promise<boolean> {
    try {
        if (memFs) {
            return memFs.exists(filePath);
        } else {
            await fs.access(filePath);
            return true;
        }
    } catch {
        return false;
    }
}
