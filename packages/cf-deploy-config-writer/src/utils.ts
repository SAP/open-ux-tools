import { join, normalize, posix } from 'path';
import { coerce, satisfies } from 'semver';
import {
    isAppStudio,
    listDestinations,
    isFullUrlDestination,
    type Authentication,
    type Destinations
} from '@sap-ux/btp-utils';
import { addPackageDevDependency, type Manifest } from '@sap-ux/project-access';
import {
    MTAVersion,
    UI5BuilderWebIdePackage,
    UI5BuilderWebIdePackageVersion,
    UI5Package,
    UI5PackageVersion,
    UI5TaskZipperPackage,
    UI5TaskZipperPackageVersion,
    XSSecurityFile
} from './constants';
import type { Editor } from 'mem-fs-editor';
import type { MTABaseConfig } from './types';

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
export function getTemplatePath(relativeTemplatePath: string = ''): string {
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
 *  Append xs-security.json to project folder.
 *
 * @param root0 MTA base configuration
 * @param root0.mtaPath Path to the MTA project
 * @param root0.mtaId MTA ID
 * @param fs reference to a mem-fs editor
 */
export function addXSSecurityConfig({ mtaPath, mtaId }: MTABaseConfig, fs: Editor): void {
    fs.copyTpl(getTemplatePath(`common/${XSSecurityFile}`), join(mtaPath, XSSecurityFile), {
        id: mtaId.slice(0, 100)
    });
}

/**
 *  Append .gitignore to project folder.
 *
 * @param targetPath Path to the project folder
 * @param fs reference to a mem-fs editor
 */
export function addGitIgnore(targetPath: string, fs: Editor): void {
    fs.copyTpl(getTemplatePath('gitignore.tmpl'), join(targetPath, '.gitignore'), {});
}

/**
 * Append server package.json to project folder.
 *
 * @param root0 MTA base configuration
 * @param root0.mtaPath Path to the MTA project
 * @param root0.mtaId MTA ID
 * @param fs reference to a mem-fs editor
 */
export function addRootPackage({ mtaPath, mtaId }: MTABaseConfig, fs: Editor): void {
    fs.copyTpl(getTemplatePath('package.json'), join(mtaPath, 'package.json'), {
        mtaId: mtaId
    });
}

/**
 * Add common dependencies to the HTML5 app package.json.
 *
 * @param targetPath Path to the package.json file
 * @param fs reference to a mem-fs editor
 */
export async function addCommonPackageDependencies(targetPath: string, fs: Editor): Promise<void> {
    await addPackageDevDependency(targetPath, UI5BuilderWebIdePackage, UI5BuilderWebIdePackageVersion, fs);
    await addPackageDevDependency(targetPath, UI5TaskZipperPackage, UI5TaskZipperPackageVersion, fs);
    await addPackageDevDependency(targetPath, UI5Package, UI5PackageVersion, fs);
}
