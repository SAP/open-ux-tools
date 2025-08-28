import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { t } from '../../i18n';
import type { Credentials } from '../../types';
import { getApplicationType } from '../../source/manifest';
import { isSupportedAppTypeForAdp } from '../../source/manifest';

/**
 * Normalize the route regex.
 *
 * @param {string} value - The value.
 * @returns {RegExp} The normalized route regex.
 */
function normalizeRouteRegex(value: string): RegExp {
    return new RegExp(value.replace('^/', '^(/)*').replace('/(.*)$', '(/)*(.*)$'));
}

/**
 * Validate the smart template application.
 *
 * @param {Manifest} manifest - The manifest.
 * @returns {Promise<string[]>} The messages.
 */
export async function validateSmartTemplateApplication(manifest: Manifest): Promise<string[]> {
    const messages: string[] = [];
    const appType = getApplicationType(manifest);

    if (isSupportedAppTypeForAdp(appType)) {
        if (manifest['sap.ui5'] && manifest['sap.ui5'].flexEnabled === false) {
            return messages.concat(t('error.appDoesNotSupportFlexibility'));
        }
    } else {
        return messages.concat(
            "Select a different application. Adaptation project doesn't support the selected application."
        );
    }
    return messages;
}

/**
 * Extract the xs-app.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {any} The xs-app.json.
 */
export function extractXSApp(zipEntries: AdmZip.IZipEntry[]): any {
    let xsApp;
    zipEntries.forEach((item) => {
        if (item.entryName.endsWith('xs-app.json')) {
            try {
                xsApp = JSON.parse(item.getData().toString('utf8'));
            } catch (e) {
                throw new Error(`Failed to parse xs-app.json. Reason: ${e.message}`);
            }
        }
    });
    return xsApp;
}

/**
 * Match the routes and data sources.
 *
 * @param {any} dataSources - The data sources.
 * @param {any} routes - The routes.
 * @param {any} serviceKeyEndpoints - The service key endpoints.
 * @returns {string[]} The messages.
 */
function matchRoutesAndDatasources(dataSources: any, routes: any, serviceKeyEndpoints: any): string[] {
    const messages: string[] = [];
    routes.forEach((route: any) => {
        if (route.endpoint && !serviceKeyEndpoints.includes(route.endpoint)) {
            messages.push(`Route endpoint '${route.endpoint}' doesn't match a corresponding OData endpoint`);
        }
    });

    Object.keys(dataSources).forEach((dataSourceName) => {
        if (!routes.some((route: any) => dataSources[dataSourceName].uri?.match(normalizeRouteRegex(route.source)))) {
            messages.push(`Data source '${dataSourceName}' doesn't match a corresponding route in xs-app.json routes`);
        }
    });
    return messages;
}

/**
 * Extract the manifest.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {Manifest | undefined} The manifest.
 */
function extractManifest(zipEntries: AdmZip.IZipEntry[]): Manifest | undefined {
    let manifest: Manifest | undefined;
    zipEntries.forEach((item) => {
        if (item.entryName.endsWith('manifest.json')) {
            try {
                manifest = JSON.parse(item.getData().toString('utf8')) as Manifest;
            } catch (e) {
                throw new Error(`Failed to parse manifest.json. Reason: ${e.message}`);
            }
        }
    });
    return manifest;
}

/**
 * Validate the OData endpoints.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @param {Credentials[]} credentials - The credentials.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} The messages.
 */
export async function validateODataEndpoints(
    zipEntries: AdmZip.IZipEntry[],
    credentials: Credentials[],
    logger: ToolsLogger
): Promise<string[]> {
    const messages: string[] = [];
    let xsApp;
    let manifest: Manifest | undefined;
    try {
        xsApp = extractXSApp(zipEntries);
        logger?.log(`ODATA endpoints: ${JSON.stringify(xsApp)}`);
    } catch (error) {
        messages.push(error.message);
        return messages;
    }

    try {
        manifest = extractManifest(zipEntries);
        logger?.log(`Extracted manifest: ${JSON.stringify(manifest)}`);
    } catch (error) {
        messages.push(error.message);
        return messages;
    }

    const dataSources = manifest?.['sap.app']?.dataSources;
    const routes = (xsApp as any)?.routes;
    if (dataSources && routes) {
        const serviceKeyEndpoints = ([] as string[]).concat(
            ...credentials.map((item) => (item.endpoints ? Object.keys(item.endpoints) : []))
        );
        messages.push(...matchRoutesAndDatasources(dataSources, routes, serviceKeyEndpoints));
    } else if (routes && !dataSources) {
        messages.push("Base app manifest.json doesn't contain data sources specified in xs-app.json");
    } else if (!routes && dataSources) {
        messages.push("Base app xs-app.json doesn't contain data sources routes specified in manifest.json");
    }
    return messages;
}
