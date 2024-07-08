import { type Editor } from 'mem-fs-editor';
import { join, normalize, posix } from 'path';
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

export async function readManifest(manifestPath: string, fs: Editor): Promise<Manifest> {
    return fs.readJSON(manifestPath) as unknown as Manifest;
}

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
    return id.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '');
}

export function toPosixPath(dirPath: string): string {
    return normalize(dirPath).split(/[\\/]/g).join(posix.sep);
}

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

export async function getDestinationProperties(
    destination: string | undefined
): Promise<{ isFullUrlDest: boolean; destinationAuthType: Authentication }> {
    const destinationProperties = {
        isFullUrlDest: false,
        destinationAuthType: Authentication.NO_AUTHENTICATION
    };
    if (destination && isAppStudio()) {
        const destinations = await getDestinations();
        destinationProperties.isFullUrlDest = isFullUrlDestination(destinations[destination]);
        destinationProperties.destinationAuthType = destinations[destination].Authentication as Authentication;
    }
    return destinationProperties;
}

export async function getDestinations(): Promise<Destinations> {
    if (Object.keys(cachedDestinationsList).length === 0) {
        cachedDestinationsList = await listDestinations();
    }
    return cachedDestinationsList;
}

/**
 * Validates the MTA version passed in the config.
 *
 * @param mtaVersion
 * @returns true if the version is valid
 */
export function validateVersion(mtaVersion?: string): boolean {
    const version = coerce(mtaVersion);
    if ((mtaVersion && !version) || (version && !satisfies(version, `>=${MTAVersion}`))) {
        throw new Error('Invalid MTA version specified. Please use version 0.0.1 or higher.');
    }
    return true;
}

export function addXSSecurity({ mtaPath, mtaId }: MTABaseConfig, fs: Editor): void {
    fs.copyTpl(getTemplatePath(`common/${XSSecurityFile}`), join(mtaPath, XSSecurityFile), {
        id: mtaId.slice(0, 100)
    });
}

export function addGitIgnore(targetPath: string, fs: Editor): void {
    fs.copyTpl(getTemplatePath('gitignore.tmpl'), join(targetPath, '.gitignore'), {});
}

export function addRootPackage({ mtaPath, mtaId }: MTABaseConfig, fs: Editor): void {
    fs.copyTpl(getTemplatePath('package.json'), join(mtaPath, 'package.json'), {
        mtaId: mtaId
    });
}

/**
 * Add common dependencies to the HTML5 app package.json.
 *
 * @param packagePath
 * @param fs
 */
export async function addCommonDependencies(packagePath: string, fs: Editor): Promise<void> {
    await addPackageDevDependency(packagePath, Rimraf, RimrafVersion, fs);
    await addPackageDevDependency(packagePath, MbtPackage, MbtPackageVersion, fs);
    await addPackageDevDependency(packagePath, UI5BuilderWebIdePackage, UI5BuilderWebIdePackageVersion, fs);
    await addPackageDevDependency(packagePath, UI5TaskZipperPackage, UI5TaskZipperPackageVersion, fs);
}
