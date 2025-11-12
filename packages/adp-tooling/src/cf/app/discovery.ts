import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import { getFDCApps } from '../services/api';
import type { CfConfig, CFApp, ServiceKeys } from '../../types';

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
