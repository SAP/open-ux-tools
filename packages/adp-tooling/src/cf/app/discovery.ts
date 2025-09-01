import type { ToolsLogger } from '@sap-ux/logger';

import { getFDCApps } from '../services/api';
import type { CfConfig, CFApp, CfCredentials } from '../../types';

/**
 * Filter apps based on validation status.
 *
 * @param {CFApp[]} apps - The apps to filter
 * @param {boolean} includeInvalid - Whether to include invalid apps
 * @returns {CFApp[]} The filtered apps
 */
export function filterCfApps(apps: CFApp[], includeInvalid: boolean): CFApp[] {
    return includeInvalid ? apps : apps.filter((app) => !app.messages?.length);
}

/**
 * Format the discovery.
 *
 * @param {CFApp} app - The app.
 * @returns {string} The formatted discovery.
 */
export function formatDiscovery(app: CFApp): string {
    return `${app.title} (${app.appId} ${app.appVersion})`;
}

/**
 * Get the app host ids.
 *
 * @param {CfCredentials[]} credentials - The credentials.
 * @returns {Set<string>} The app host ids.
 */
export function getAppHostIds(credentials: CfCredentials[]): Set<string> {
    const appHostIds: string[] = [];
    credentials.forEach((credential) => {
        const appHostId = credential['html5-apps-repo']?.app_host_id;
        if (appHostId) {
            appHostIds.push(appHostId.split(',').map((item: string) => item.trim())); // there might be multiple appHostIds separated by comma
        }
    });

    // appHostIds is now an array of arrays of strings (from split)
    // Flatten the array and create a Set
    return new Set(appHostIds.flat());
}

/**
 * Discover apps from FDC API based on credentials.
 *
 * @param {CfCredentials[]} credentials - The credentials containing app host IDs
 * @param {CfConfig} cfConfig - The CF configuration
 * @param {ToolsLogger} logger - The logger
 * @returns {Promise<CFApp[]>} The discovered apps
 */
export async function discoverCfApps(
    credentials: CfCredentials[],
    cfConfig: CfConfig,
    logger: ToolsLogger
): Promise<CFApp[]> {
    const appHostIds = getAppHostIds(credentials);
    logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);

    // Validate appHostIds array length (max 100 as per API specification)
    if (appHostIds.size > 100) {
        throw new Error(`Too many appHostIds provided. Maximum allowed is 100, but ${appHostIds.size} were found.`);
    }

    const appHostIdsArray = Array.from(appHostIds);

    try {
        const response = await getFDCApps(appHostIdsArray, cfConfig, logger);

        if (response.status === 200) {
            // TODO: Remove this once the FDC API is updated to return the appHostId
            const apps = response.data.results.map((app) => ({ ...app, appHostId: appHostIdsArray[0] }));
            return apps;
        } else {
            throw new Error(
                `Failed to connect to Flexibility Design and Configuration service. Reason: HTTP status code ${response.status}: ${response.statusText}`
            );
        }
    } catch (error) {
        logger?.error(`Error in discoverApps: ${error.message}`);

        // Create error apps for each appHostId to maintain original behavior
        const errorApps: CFApp[] = appHostIdsArray.map((appHostId) => ({
            appId: '',
            appName: '',
            appVersion: '',
            serviceName: '',
            title: '',
            appHostId,
            messages: [error.message]
        }));

        return errorApps;
    }
}
