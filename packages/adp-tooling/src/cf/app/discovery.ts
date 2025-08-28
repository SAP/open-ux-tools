import type { ToolsLogger } from '@sap-ux/logger';

import { getFDCApps } from '../api';
import { getAppHostIds } from '../utils';
import type { CFConfig, CFApp, Credentials } from '../../types';

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
 * Discover apps from FDC API based on credentials.
 *
 * @param {Credentials[]} credentials - The credentials containing app host IDs
 * @param {CFConfig} cfConfig - The CF configuration
 * @param {ToolsLogger} logger - The logger
 * @returns {Promise<CFApp[]>} The discovered apps
 */
export async function discoverCfApps(
    credentials: Credentials[],
    cfConfig: CFConfig,
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
