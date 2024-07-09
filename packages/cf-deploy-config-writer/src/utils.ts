import { join, normalize, posix } from 'path';
import { type Editor } from 'mem-fs-editor';
import { isAppStudio, listDestinations, isFullUrlDestination, Authentication } from '@sap-ux/btp-utils';
import { coerce, satisfies } from 'semver';
import {
    MbtPackage,
    MbtPackageVersion,
    MTAVersion,
    Rimraf,
    RimrafVersion,
    UI5BuilderWebIdePackage,
    UI5BuilderWebIdePackageVersion,
    UI5TaskZipperPackage,
    UI5TaskZipperPackageVersion,
    XSSecurityFile
} from './constants';
import { addPackageDevDependency, type Manifest } from '@sap-ux/project-access';
import type { XSAppDocument, XSAppRoute, XSAppRouteProperties, MTABaseConfig } from './types';
import type { Destinations } from '@sap-ux/btp-utils';

let cachedDestinationsList: Destinations = {};

/**
 *  Read manifest file.
 *
 * @param manifestPath Path to the manifest file
 * @param fs reference to a mem-fs editor
 * @returns Manifest object
 */
export async function readManifest(manifestPath: string, fs: Editor): Promise<Manifest> {
    return fs.readJSON(manifestPath) as unknown as Manifest;
}

/**
 *  Get the path to the template file.
 *
 * @param relativePath Path to the specific template file
 * @returns Path to the template file
 */
export function getTemplatePath(relativePath: string = ''): string {
    return join(__dirname, '../templates', relativePath);
}

/**
 *  Convert an app name to an MTA ID that is suitable for CF deployment.
 *
 * @param id Name of the app, like `sap.ux.app`
 * @returns Name that's acceptable in an mta.yaml
 */
export function toMtaModuleName(id: string): string {
    return id.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '');
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
 * Get the route properties from the xs-app.json file.
 *
 * @param xsAppObj xs-app.json object
 * @param keys the keys to search for i.e. ['source', 'target']
 * @param values optional values to search for i.e. ['^/odata', 'my-odata-service']
 * @returns XSAppRoute | undefined
 */
export function findRoute(
    xsAppObj: XSAppDocument,
    keys: XSAppRouteProperties[],
    values?: string[]
): XSAppRoute | undefined {
    let xsAppRoute: XSAppRoute | undefined;
    xsAppObj['routes']?.forEach((route: XSAppRoute) => {
        keys.forEach((searchKey: XSAppRouteProperties, searchKeyIndex: number) => {
            if (route[searchKey] && route[searchKey] === values?.[searchKeyIndex]) {
                xsAppRoute = route;
            } else if (route[searchKey]) {
                xsAppRoute = route;
            }
        });
    });
    return xsAppRoute;
}

/**
 * Get the destination properties, based on the destination value.
 *
 * @param destination destination name
 * @returns Destination properties, default properties returned if not found
 */
export async function getDestinationProperties(
    destination: string | undefined
): Promise<{ isFullUrlDest: boolean; destinationAuthType: Authentication }> {
    const destinationProperties = {
        isFullUrlDest: false,
        destinationAuthType: Authentication.NO_AUTHENTICATION
    };
    if (destination && isAppStudio()) {
        const destinations = await getBTPDestinations();
        destinationProperties.isFullUrlDest = isFullUrlDestination(destinations[destination]);
        destinationProperties.destinationAuthType = destinations[destination].Authentication as Authentication;
    }
    return destinationProperties;
}

/**
 * Retrieve the list of destinations from SAP BTP.
 *
 * @returns Destinations list
 */
export async function getBTPDestinations(): Promise<Destinations> {
    if (Object.keys(cachedDestinationsList).length === 0) {
        cachedDestinationsList = await listDestinations();
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
export function addXSSecurity({ mtaPath, mtaId }: MTABaseConfig, fs: Editor): void {
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
export async function addCommonDependencies(targetPath: string, fs: Editor): Promise<void> {
    await addPackageDevDependency(targetPath, Rimraf, RimrafVersion, fs);
    await addPackageDevDependency(targetPath, MbtPackage, MbtPackageVersion, fs);
    await addPackageDevDependency(targetPath, UI5BuilderWebIdePackage, UI5BuilderWebIdePackageVersion, fs);
    await addPackageDevDependency(targetPath, UI5TaskZipperPackage, UI5TaskZipperPackageVersion, fs);
}
