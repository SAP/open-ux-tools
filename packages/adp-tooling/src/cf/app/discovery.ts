import type AdmZip from 'adm-zip';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import { extractXSApp } from '../utils';
import { getFDCApps } from '../services/api';
import type { CfConfig, CFApp, ServiceKeys, XsApp } from '../../types';

/**
 * Get the app host ids.
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
 * Extract destination to URL mapping from service key endpoints.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys containing endpoints.
 * @returns {Map<string, string>} Map of destination names to URLs.
 */
function extractDestinationToUrlMap(serviceKeys: ServiceKeys[]): Map<string, string> {
    const destinationToUrl = new Map<string, string>();
    const endpoints = serviceKeys[0]?.credentials?.endpoints as
        | Record<string, { url?: string; destination?: string }>
        | undefined;

    if (endpoints && typeof endpoints === 'object') {
        for (const key in endpoints) {
            const endpoint = endpoints[key];
            if (endpoint?.url && endpoint.destination) {
                destinationToUrl.set(endpoint.destination, endpoint.url);
            }
        }
    }

    return destinationToUrl;
}

/**
 * Check if a route should be processed for OAuth path extraction.
 *
 * @param {any} route - The route object from xs-app.json.
 * @returns {boolean} True if route should be processed.
 */
function shouldProcessRoute(route: any): boolean {
    const destination = route.destination as string | undefined;
    const service = route.service as string | undefined;
    return Boolean(destination && service !== 'html5-apps-repo-rt' && route.source);
}

/**
 * Clean regex pattern from route source.
 *
 * @param {string} source - The route source pattern.
 * @returns {string} Cleaned path.
 */
function cleanRoutePath(source: string): string {
    return source.replace(/^\^|\$$|\([^)]*\)|\$\d+|\/?\*$/g, '');
}

/**
 * Add path to destination mapping.
 *
 * @param {Map<string, Set<string>>} map - The destination to paths map.
 * @param {string} destination - The destination name.
 * @param {string} path - The path to add.
 */
function addPathToDestination(map: Map<string, Set<string>>, destination: string, path: string): void {
    if (!map.has(destination)) {
        map.set(destination, new Set<string>());
    }
    map.get(destination)!.add(path);
}

/**
 * Extract destination to paths mapping from xs-app.json routes.
 *
 * @param {string} xsAppPath - Path to xs-app.json file.
 * @returns {Map<string, Set<string>>} Map of destination names to path sets.
 */
function extractDestinationToPathsMap(xsAppPath: string): Map<string, Set<string>> {
    const destinationToPaths = new Map<string, Set<string>>();

    if (!existsSync(xsAppPath)) {
        return destinationToPaths;
    }

    try {
        const xsAppContent = readFileSync(xsAppPath, 'utf8');
        const xsApp = JSON.parse(xsAppContent) as XsApp;

        if (xsApp?.routes) {
            for (const route of xsApp.routes) {
                if (!shouldProcessRoute(route)) {
                    continue;
                }

                const path = cleanRoutePath(route.source);
                if (path) {
                    addPathToDestination(destinationToPaths, route.destination as string, path);
                }
            }
        }
    } catch (e) {
        // Skip invalid xs-app.json files
    }

    return destinationToPaths;
}

/**
 * Maps backend URLs to their corresponding OAuth paths based on destination matching
 * between xs-app.json routes and credentials.json endpoints.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys containing endpoints with destinations.
 * @param {string} reuseFolderPath - Path to the .reuse folder containing xs-app.json files.
 * @returns {Array<{ url: string; paths: string[] }>} Array of URL-to-paths mappings.
 */
export function getBackendUrlsWithPaths(
    serviceKeys: ServiceKeys[],
    reuseFolderPath: string
): Array<{ url: string; paths: string[] }> {
    if (!serviceKeys || serviceKeys.length === 0 || !existsSync(reuseFolderPath)) {
        return [];
    }

    const destinationToUrl = extractDestinationToUrlMap(serviceKeys);
    const xsAppPath = join(reuseFolderPath, 'xs-app.json');
    const destinationToPaths = extractDestinationToPathsMap(xsAppPath);

    const result: Array<{ url: string; paths: string[] }> = [];

    for (const [destination, paths] of destinationToPaths.entries()) {
        const url = destinationToUrl.get(destination);
        if (url) {
            result.push({
                url,
                paths: Array.from(paths)
            });
        }
    }

    return result;
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

        // Clean regex pattern: remove ^, $, capture groups, quantifiers, and trailing /*
        const path = route.source.replace(/^\^|\$$|\([^)]*\)|\$\d+|\/?\*$/g, '');

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
