import type AdmZip from 'adm-zip';

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
 * Extracts the backend URL from service key credentials. Iterates through all endpoint keys to find the first endpoint with a URL.
 *
 * @param {ServiceKeys[]} serviceKeys - The credentials from service keys.
 * @returns {string | undefined} The backend URL or undefined if not found.
 */
export function getBackendUrlFromServiceKeys(serviceKeys: ServiceKeys[]): string | undefined {
    if (!serviceKeys || serviceKeys.length === 0) {
        return undefined;
    }

    const endpoints = serviceKeys[0]?.credentials?.endpoints as Record<string, { url?: string }> | undefined;
    if (endpoints) {
        for (const key in endpoints) {
            if (Object.hasOwn(endpoints, key)) {
                const endpoint = endpoints[key] as { url?: string } | undefined;
                if (endpoint && typeof endpoint === 'object' && endpoint.url && typeof endpoint.url === 'string') {
                    return endpoint.url;
                }
            }
        }
    }

    return undefined;
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
        // Normalize multiple consecutive slashes to single slash
        while (path.includes('//')) {
            path = path.replaceAll('//', '/');
        }

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
