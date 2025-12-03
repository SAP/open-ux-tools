import type AdmZip from 'adm-zip';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
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
    const endpoints = serviceKeys[0]?.credentials?.endpoints as Record<string, string | { url?: string }> | undefined;
    if (endpoints && typeof endpoints === 'object' && endpoints !== null) {
        for (const key in endpoints) {
            if (Object.prototype.hasOwnProperty.call(endpoints, key)) {
                const endpoint = endpoints[key];
                // Handle string endpoints directly
                if (typeof endpoint === 'string') {
                    urls.push(endpoint);
                }
                // Handle object endpoints with url property
                else if (endpoint && typeof endpoint === 'object' && endpoint.url && typeof endpoint.url === 'string') {
                    urls.push(endpoint.url);
                }
            }
        }
    }

    return urls;
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

    // Build a map of destination -> URL from service keys
    const destinationToUrl = new Map<string, string>();
    const endpoints = serviceKeys[0]?.credentials?.endpoints as
        | Record<string, string | { url?: string; destination?: string }>
        | undefined;

    if (endpoints && typeof endpoints === 'object' && endpoints !== null) {
        for (const key in endpoints) {
            if (Object.prototype.hasOwnProperty.call(endpoints, key)) {
                const endpoint = endpoints[key];
                // Handle object endpoints with url and destination properties
                if (endpoint && typeof endpoint === 'object' && endpoint.url && endpoint.destination) {
                    destinationToUrl.set(endpoint.destination, endpoint.url);
                }
            }
        }
    }

    // Build a map of destination -> paths from xs-app.json routes
    const destinationToPaths = new Map<string, Set<string>>();

    // Helper function to process xs-app.json file
    const processXsAppFile = (xsAppPath: string) => {
        if (existsSync(xsAppPath)) {
            try {
                const xsAppContent = readFileSync(xsAppPath, 'utf8');
                const xsApp: XsApp = JSON.parse(xsAppContent);

                if (xsApp?.routes) {
                    for (const route of xsApp.routes) {
                        const destination = route.destination as string | undefined;
                        const service = route.service as string | undefined;

                        // Skip routes without destination or with html5-apps-repo-rt service
                        if (!destination || service === 'html5-apps-repo-rt' || !route.source) {
                            continue;
                        }

                        let path = route.source;
                        // Remove leading ^ and trailing $
                        path = path.replace(/^\^/, '').replace(/\$$/, '');
                        // Remove capture groups like (.*) or $1
                        path = path.replace(/\([^)]*\)/g, '');
                        // Remove regex quantifiers
                        path = path.replace(/\$\d+/g, '');
                        // Clean up any remaining regex characters at the end
                        path = path.replace(/\/?\*$/, '');

                        if (path) {
                            if (!destinationToPaths.has(destination)) {
                                destinationToPaths.set(destination, new Set<string>());
                            }
                            destinationToPaths.get(destination)!.add(path);
                        }
                    }
                }
            } catch (e) {
                // Skip invalid xs-app.json files
            }
        }
    };

    try {
        // Process xs-app.json from the root .reuse folder
        const rootXsAppPath = join(reuseFolderPath, 'xs-app.json');
        processXsAppFile(rootXsAppPath);
    } catch (e) {
        return [];
    }

    // Match destinations and build result array
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
 * Reads xs-app.json from local .reuse folder.
 *
 * @param {string} reuseFolderPath - Path to the .reuse folder.
 * @returns {XsApp | undefined} The parsed xs-app.json object.
 */
export function readXsAppFromReuseFolder(reuseFolderPath: string): XsApp | undefined {
    try {
        const reuseDir = reuseFolderPath;
        if (!existsSync(reuseDir)) {
            return undefined;
        }

        // Read all subdirectories in .reuse folder
        const fs = require('fs');
        const subdirs = fs
            .readdirSync(reuseDir, { withFileTypes: true })
            .filter((dirent: any) => dirent.isDirectory())
            .map((dirent: any) => dirent.name);

        // Find the first xs-app.json in any subdirectory
        for (const subdir of subdirs) {
            const xsAppPath = join(reuseDir, subdir, 'xs-app.json');
            if (existsSync(xsAppPath)) {
                const content = readFileSync(xsAppPath, 'utf-8');
                return JSON.parse(content) as XsApp;
            }
        }
    } catch (error) {
        // Silently fail and return undefined
    }
    return undefined;
}

/**
 * Reads xs-app.json from a .reuse folder and extracts OAuth paths from all libraries.
 *
 * @param {string} reuseFolderPath - Path to the .reuse folder.
 * @returns {string[]} Array of unique OAuth path patterns from all libraries.
 */
export function getOAuthPathsFromReuseFolder(reuseFolderPath: string): string[] {
    if (!existsSync(reuseFolderPath)) {
        return [];
    }

    const pathsSet = new Set<string>();

    try {
        const libraryDirs = readdirSync(reuseFolderPath).filter((item) => {
            const fullPath = join(reuseFolderPath, item);
            return statSync(fullPath).isDirectory();
        });

        for (const libraryDir of libraryDirs) {
            const xsAppPath = join(reuseFolderPath, libraryDir, 'xs-app.json');
            if (existsSync(xsAppPath)) {
                try {
                    const xsAppContent = readFileSync(xsAppPath, 'utf8');
                    const xsApp: XsApp = JSON.parse(xsAppContent);

                    if (xsApp?.routes) {
                        for (const route of xsApp.routes) {
                            if (route.service === 'html5-apps-repo-rt' || !route.source) {
                                continue;
                            }

                            let path = route.source;
                            // Remove leading ^ and trailing $
                            path = path.replace(/^\^/, '').replace(/\$$/, '');
                            // Remove capture groups like (.*) or $1
                            path = path.replace(/\([^)]*\)/g, '');
                            // Remove regex quantifiers
                            path = path.replace(/\$\d+/g, '');
                            // Clean up any remaining regex characters at the end
                            path = path.replace(/\/?\*$/, '');

                            if (path) {
                                pathsSet.add(path);
                            }
                        }
                    }
                } catch (e) {
                    // Skip invalid xs-app.json files
                    continue;
                }
            }
        }
    } catch (e) {
        // Return empty array if there's an error reading the directory
        return [];
    }

    return Array.from(pathsSet);
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

        let path = route.source;
        // Remove leading ^ and trailing $
        path = path.replace(/^\^/, '').replace(/\$$/, '');
        // Remove capture groups like (.*) or $1
        path = path.replace(/\([^)]*\)/g, '');
        // Remove regex quantifiers
        path = path.replace(/\$\d+/g, '');
        // Clean up any remaining regex characters at the end
        path = path.replace(/\/?\*$/, '');

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
