import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { t } from '../../i18n';
import type { CfCredentials, XsApp, XsAppRoute } from '../../types';
import { getApplicationType } from '../../source/manifest';
import { isSupportedAppTypeForAdp } from '../../source/manifest';

/**
 * Normalize the xs-app route regex.
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
 * @returns {Promise<void>} The messages.
 */
export async function validateSmartTemplateApplication(manifest: Manifest): Promise<void> {
    const appType = getApplicationType(manifest);

    if (!isSupportedAppTypeForAdp(appType)) {
        throw new Error(t('error.adpDoesNotSupportSelectedApplication'));
    }

    if (manifest['sap.ui5'] && manifest['sap.ui5'].flexEnabled === false) {
        throw new Error(t('error.appDoesNotSupportFlexibility'));
    }
}

/**
 * Extract the xs-app.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {any} The xs-app.json.
 */
export function extractXSApp(zipEntries: AdmZip.IZipEntry[]): XsApp | undefined {
    let xsApp: XsApp | undefined;
    const xsAppEntry = zipEntries.find((item) => item.entryName.endsWith('xs-app.json'));
    try {
        xsApp = JSON.parse(xsAppEntry?.getData().toString('utf8') ?? '') as XsApp;
    } catch (e) {
        throw new Error(t('error.failedToParseXsAppJson', { error: e.message }));
    }
    return xsApp;
}

/**
 * Match the routes and data sources.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - The data sources from manifest.json.
 * @param {XsAppRoute[]} routes - The routes from xs-app.json.
 * @param {string[]} serviceKeyEndpoints - The service key endpoints.
 * @returns {string[]} The messages.
 */
function matchRoutesAndDatasources(
    dataSources: Record<string, ManifestNamespace.DataSource> | undefined,
    routes: XsAppRoute[],
    serviceKeyEndpoints: string[]
): string[] {
    const messages: string[] = [];
    routes.forEach((route: XsAppRoute) => {
        if (route.endpoint && !serviceKeyEndpoints.includes(route.endpoint)) {
            messages.push(`Route endpoint '${route.endpoint}' doesn't match a corresponding OData endpoint`);
        }
    });

    Object.keys(dataSources ?? {}).forEach((dataSourceName) => {
        if (
            !routes.some((route: XsAppRoute) =>
                dataSources?.[dataSourceName].uri?.match(normalizeRouteRegex(route.source))
            )
        ) {
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
    const manifestEntry = zipEntries.find((item) => item.entryName.endsWith('manifest.json'));
    try {
        manifest = JSON.parse(manifestEntry?.getData().toString('utf8') ?? '') as Manifest;
    } catch (e) {
        throw new Error(t('error.failedToParseManifestJson', { error: e.message }));
    }
    return manifest;
}

/**
 * Validate the OData endpoints, data sources and routes.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @param {CfCredentials[]} credentials - The credentials.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} The messages.
 */
export async function validateODataEndpoints(
    zipEntries: AdmZip.IZipEntry[],
    credentials: CfCredentials[],
    logger: ToolsLogger
): Promise<void> {
    const messages: string[] = [];
    let xsApp;
    try {
        xsApp = extractXSApp(zipEntries);
        logger?.log(`ODATA endpoints: ${JSON.stringify(xsApp)}`);
    } catch (error) {
        messages.push(error);
    }

    let manifest: Manifest | undefined;
    try {
        manifest = extractManifest(zipEntries);
        logger?.log(`Extracted manifest: ${JSON.stringify(manifest)}`);
    } catch (error) {
        messages.push(error);
    }

    const dataSources = manifest?.['sap.app']?.dataSources;
    const routes = xsApp?.routes;
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

    if (messages.length > 0) {
        const errorMessages = messages.join('\n');
        logger?.error(`OData endpoints validation failed:\n${errorMessages}`);
        throw new Error(t('error.oDataEndpointsValidationFailed'));
    }
}
