import type { Editor } from 'mem-fs-editor';
import type { Manifest } from '@sap-ux/project-access';
import { join, normalize, posix } from 'path';
import type { Destinations } from '@sap-ux/btp-utils';
import { isAppStudio, listDestinations, isFullUrlDestination, Authentication } from '@sap-ux/btp-utils';
import type { XSAppDocument, XSAppRoute, XSAppRouteProperties } from './types';

let cachedDestinationsList: Destinations = {};

export async function readManifest(manifestPath: string, fs: Editor): Promise<Manifest> {
    return fs.readJSON(manifestPath) as unknown as Manifest;
}

export function getTemplatePath(relativeTemplatePath: string = ''): string {
    return join(__dirname, '../templates', relativeTemplatePath);
}

/**
 *
 * @param namespacedAppName Name of the app, like `sap.ux.app`
 * @returns Name that's acceptable in an mta.yaml
 */
export function toMtaModuleName(appId: string): string {
    return appId.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '');
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
