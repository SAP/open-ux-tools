import type { ToolsLogger } from '@sap-ux/logger';

import { getFDCApps } from '../services/api';
import type { CfConfig, CFApp, CfCredentials } from '../../types';

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
 * @returns {string[]} The app host ids.
 */
export function getAppHostIds(credentials: CfCredentials[]): string[] {
    const appHostIds: string[] = [];

    credentials.forEach((credential) => {
        const appHostId = credential['html5-apps-repo']?.app_host_id;
        if (appHostId) {
            // There might be multiple appHostIds separated by comma
            const ids = appHostId.split(',').map((item: string) => item.trim());
            appHostIds.push(...ids);
        }
    });

    return [...new Set(appHostIds)];
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
        throw new Error(`Too many appHostIds provided. Maximum allowed is 100, but ${appHostIds.length} were found.`);
    }

    return getFDCApps(appHostIds, cfConfig, logger);
}
