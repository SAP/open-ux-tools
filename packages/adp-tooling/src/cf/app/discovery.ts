import type AdmZip from 'adm-zip';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import { extractXSApp } from '../utils';
import { getFDCApps } from '../services/api';
import type { CfConfig, CFApp, ServiceKeys, XsApp, XsAppRoute } from '../../types';

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
 * Process a route and extract path and pathRewrite from source and target.
 *
 * @param {XsAppRoute} route - The route object from xs-app.json.
 * @param {Map<string, { paths: Set<string>; pathRewrite?: string }>} destinationToPaths - Map to store destination info.
 */
function processRouteForDestination(
    route: XsAppRoute,
    destinationToPaths: Map<string, { paths: Set<string>; pathRewrite?: string }>
): void {
    const destination = route.destination as string | undefined;
    const service = route.service;

    if (!destination || service === 'html5-apps-repo-rt' || !route.source) {
        return;
    }

    const path = cleanRoutePath(route.source);
    if (path) {
        if (!destinationToPaths.has(destination)) {
            destinationToPaths.set(destination, { paths: new Set<string>() });
        }

        const destInfo = destinationToPaths.get(destination)!;
        destInfo.paths.add(path);

        // Extract pathRewrite from target if available
        if (route.target && typeof route.target === 'string') {
            const pathRewrite = cleanRoutePath(route.target);
            if (pathRewrite && !destInfo.pathRewrite) {
                destInfo.pathRewrite = pathRewrite;
            }
        }
    }
}

/**
 * Extract destination to paths mapping from xs-app.json routes with pathRewrite info.
 *
 * @param {string} xsAppPath - Path to xs-app.json file.
 * @returns {Map<string, { paths: Set<string>; pathRewrite?: string }>} Map of destination names to path info.
 */
function extractDestinationToPathsMap(xsAppPath: string): Map<string, { paths: Set<string>; pathRewrite?: string }> {
    const destinationToPaths = new Map<string, { paths: Set<string>; pathRewrite?: string }>();

    try {
        const xsAppContent = readFileSync(xsAppPath, 'utf8');
        const xsApp = JSON.parse(xsAppContent) as XsApp;

        if (xsApp?.routes) {
            for (const route of xsApp.routes) {
                processRouteForDestination(route, destinationToPaths);
            }
        }
    } catch (e) {
        throw new Error(t('error.invalidXsAppJson', { error: (e as Error).message }));
    }

    return destinationToPaths;
}

/**
 * Maps backend URLs to their corresponding OAuth paths based on destination matching
 * between xs-app.json routes and credentials.json endpoints.
 *
 * @param {ServiceKeys[]} serviceKeys - The service keys containing endpoints with destinations.
 * @param {string} basePath - Path to the .adp/reuse folder containing xs-app.json files.
 * @returns {Array<{ url: string; paths: string[]; pathRewrite?: string }>} Array of URL-to-paths mappings with optional pathRewrite.
 */
export function getBackendUrlsWithPaths(
    serviceKeys: ServiceKeys[],
    basePath: string
): Array<{ url: string; paths: string[]; pathRewrite?: string }> {
    const destinationToUrl = extractDestinationToUrlMap(serviceKeys);

    const reuseXsAppPath = join(basePath, '.adp', 'reuse', 'xs-app.json');
    const distXsAppPath = join(basePath, 'dist', 'xs-app.json');

    let xsAppPath: string;
    if (existsSync(reuseXsAppPath)) {
        xsAppPath = reuseXsAppPath;
    } else if (existsSync(distXsAppPath)) {
        xsAppPath = distXsAppPath;
    } else {
        throw new Error(t('error.xsAppJsonNotFound', { paths: `${reuseXsAppPath}, ${distXsAppPath}` }));
    }

    const destinationToPaths = extractDestinationToPathsMap(xsAppPath);

    const result = [];

    for (const [destination, pathInfo] of destinationToPaths.entries()) {
        const url = destinationToUrl.get(destination);
        if (url) {
            const entry: { url: string; paths: string[]; pathRewrite?: string } = {
                url,
                paths: Array.from(pathInfo.paths)
            };

            if (pathInfo.pathRewrite) {
                entry.pathRewrite = pathInfo.pathRewrite;
            }

            result.push(entry);
        }
    }

    return result;
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
