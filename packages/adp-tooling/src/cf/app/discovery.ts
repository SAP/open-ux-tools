import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import { getFDCApps } from '../services/api';
import { extractXSApp } from '../utils/validation';
import type { CfConfig, CFApp, CfCredentials, XsApp } from '../../types';

/**
 * Get the app host ids.
 *
 * @param {CfCredentials[]} credentials - The credentials.
 * @returns {string[]} The app host ids.
 */
export function getAppHostIds(credentials: CfCredentials[]): string[] {
    const appHostIds: string[] = [];

    for (const credential of credentials) {
        const appHostId = credential['html5-apps-repo']?.app_host_id;
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
 * @param {CfCredentials[]} credentials - The credentials from service keys.
 * @returns {string | undefined} The backend URL or undefined if not found.
 */
export function getBackendUrlFromCredentials(credentials: CfCredentials[]): string | undefined {
    if (!credentials || credentials.length === 0) {
        return undefined;
    }

    const endpoints = credentials[0]?.endpoints as Record<string, { url?: string }> | undefined;
    if (endpoints && typeof endpoints === 'object' && endpoints !== null) {
        for (const key in endpoints) {
            if (Object.prototype.hasOwnProperty.call(endpoints, key)) {
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

        if (path) {
            pathsSet.add(path);
        }
    }

    return Array.from(pathsSet);
}

/**
 * Discover apps from FDC API based on credentials.
 *
 * @param {CfCredentials[]} credentials - The credentials containing app host IDs
 * @param {CfConfig} cfConfig - The CF configuration
 * @param {ToolsLogger} logger - The logger
 * @returns {Promise<CFApp[]>} The discovered apps
 */
export async function getCfApps(
    credentials: CfCredentials[],
    cfConfig: CfConfig,
    logger: ToolsLogger
): Promise<CFApp[]> {
    const appHostIds = getAppHostIds(credentials);
    logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);

    // Validate appHostIds array length (max 100 as per API specification)
    if (appHostIds.length > 100) {
        throw new Error(t('error.tooManyAppHostIds', { appHostIdsLength: appHostIds.length }));
    }

    return getFDCApps(appHostIds, cfConfig, logger);
}
