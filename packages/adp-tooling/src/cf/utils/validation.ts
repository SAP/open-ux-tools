import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { t } from '../../i18n';
import type { CfCredentials, XsApp, XsAppRoute } from '../../types';
import { getApplicationType, isSupportedAppTypeForAdp } from '../../source/manifest';

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
 * Generic function to extract and parse JSON from zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @param {string} fileName - The file name to find (e.g., 'manifest.json', 'xs-app.json').
 * @param {string} errorKey - The i18n error key for parsing failures.
 * @returns {T | undefined} The parsed JSON object.
 */
export function extractJsonFromZip<T>(
    zipEntries: AdmZip.IZipEntry[],
    fileName: string,
    errorKey: string
): T | undefined {
    const entry = zipEntries.find((item) => item.entryName.endsWith(fileName));
    try {
        return JSON.parse(entry?.getData().toString('utf8') ?? '') as T;
    } catch (e) {
        throw new Error(t(errorKey, { error: e.message }));
    }
}

/**
 * Extract the xs-app.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {XsApp | undefined} The xs-app.json.
 */
export function extractXSApp(zipEntries: AdmZip.IZipEntry[]): XsApp | undefined {
    return extractJsonFromZip<XsApp>(zipEntries, 'xs-app.json', 'error.failedToParseXsAppJson');
}

/**
 * Extract the manifest.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {Manifest | undefined} The manifest.
 */
function extractManifest(zipEntries: AdmZip.IZipEntry[]): Manifest | undefined {
    return extractJsonFromZip<Manifest>(zipEntries, 'manifest.json', 'error.failedToParseManifestJson');
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
    for (const route of routes) {
        if (route.endpoint && !serviceKeyEndpoints.includes(route.endpoint)) {
            messages.push(`Route endpoint '${route.endpoint}' doesn't match a corresponding OData endpoint`);
        }
    }

    for (const dataSourceName of Object.keys(dataSources ?? {})) {
        if (
            !routes.some((route: XsAppRoute) =>
                dataSources?.[dataSourceName].uri?.match(normalizeRouteRegex(route.source))
            )
        ) {
            messages.push(`Data source '${dataSourceName}' doesn't match a corresponding route in xs-app.json routes`);
        }
    }
    return messages;
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
