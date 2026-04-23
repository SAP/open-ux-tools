import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import { extractXSApp } from '../utils';
import { getFDCApps } from '../services/api';
import type { CfConfig, CFApp, ServiceKeys, XsApp } from '../../types';

/**
 * Get the app host ids from service keys.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys.
 * @returns {string[]} The app host ids.
 */
export function getAppHostIds(serviceKeys: ServiceKeys[]): string[] {
    const appHostIds: string[] = [];

    for (const serviceKey of serviceKeys) {
        const appHostId = serviceKey.credentials['html5-apps-repo']?.app_host_id;
        if (appHostId) {
            // There might be multiple appHostIds separated by comma
            const ids = appHostId.split(',').map((item: string) => item.trim());
            appHostIds.push(...ids);
        }
    }

    return [...new Set(appHostIds)];
}

/**
 * Extracts all backend URLs from service key credentials. Iterates through all endpoint keys to find all endpoints with URLs.
 * Handles both string endpoints and object endpoints with url property.
 *
 * @param {ServiceKeys[]} serviceKeys - The credentials from service keys.
 * @returns {string[]} Array of backend URLs (including full paths) or empty array if none found.
 */
export function getBackendUrlsFromServiceKeys(serviceKeys: ServiceKeys[]): string[] {
    if (!serviceKeys || serviceKeys.length === 0) {
        return [];
    }

    const urls: string[] = [];
    const endpoints = serviceKeys[0]?.credentials?.endpoints as Record<string, { url?: string }> | undefined;
    if (endpoints && typeof endpoints === 'object' && endpoints !== null) {
        for (const key in endpoints) {
            const endpoint = endpoints[key];
            if (endpoint?.url) {
                urls.push(endpoint.url);
            }
        }
    }

    return urls;
}

/**
 * Clean regex pattern from route source.
 *
 * @param {string} source - The route source pattern.
 * @returns {string} Cleaned path.
 */
function cleanRoutePath(source: string): string {
    let path = source;
    // Remove leading ^ and trailing $
    path = path.replace(/^\^/, '').replace(/\$$/, '');
    // Remove capture groups like (.*) or $1
    path = path.replace(/\([^)]*\)/g, '');
    // Remove regex quantifiers
    path = path.replace(/\$\d+/g, '');
    // Clean up any remaining regex characters at the end
    path = path.replace(/\/?\*$/, '');
    // Normalize multiple consecutive slashes to single slash
    while (path.includes('//')) {
        path = path.replaceAll('//', '/');
    }
    // Remove trailing slash to ensure proper path matching
    path = path.replace(/\/$/, '');
    return path;
}

/**
 * Extract endpoint destinations from service keys.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys.
 * @returns {Array<{name: string; url: string}>} Array of endpoint destinations.
 */
export function getServiceKeyDestinations(serviceKeys: ServiceKeys[]): Array<{ name: string; url: string }> {
    const endpointDestinations: Array<{ name: string; url: string }> = [];

    for (const key of serviceKeys) {
        const endpoints = key.credentials?.endpoints;
        if (endpoints && typeof endpoints === 'object') {
            for (const endpointKey in endpoints) {
                const endpoint = endpoints[endpointKey];
                if (endpoint?.url && endpoint.destination) {
                    endpointDestinations.push({
                        name: endpoint.destination,
                        url: endpoint.url
                    });
                }
            }
        }
    }

    return endpointDestinations;
}

/**
 * Extracts OAuth paths from xs-app.json routes that have a source property.
 * These paths should receive OAuth Bearer tokens in the middleware.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries containing xs-app.json.
 * @returns {string[]} Array of path patterns (from route.source) that have a source property.
 */
export function getOAuthPathsFromXsApp(zipEntries: AdmZip.IZipEntry[]): string[] {
    const xsApp: XsApp | undefined = extractXSApp(zipEntries);
    if (!xsApp?.routes) {
        return [];
    }

    const pathsSet = new Set<string>();
    for (const route of xsApp.routes) {
        if (route.service === 'html5-apps-repo-rt' || !route.source) {
            continue;
        }

        const path = cleanRoutePath(route.source);
        if (path) {
            pathsSet.add(path);
        }
    }

    return Array.from(pathsSet);
}

/**
 * Discover apps from FDC API based on credentials.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys containing app host IDs
 * @param {CfConfig} cfConfig - The CF configuration
 * @param {ToolsLogger} logger - The logger
 * @returns {Promise<CFApp[]>} The discovered apps
 */
export async function getCfApps(serviceKeys: ServiceKeys[], cfConfig: CfConfig, logger: ToolsLogger): Promise<CFApp[]> {
    const appHostIds = getAppHostIds(serviceKeys);
    logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);

    // Validate appHostIds array length (max 100 as per API specification)
    if (appHostIds.length > 100) {
        throw new Error(t('error.tooManyAppHostIds', { appHostIdsLength: appHostIds.length }));
    }

    return getFDCApps(appHostIds, cfConfig, logger);
}
