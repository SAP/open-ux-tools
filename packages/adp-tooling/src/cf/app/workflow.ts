import type { ToolsLogger } from '@sap-ux/logger';

import type { CfCredentials } from '../../types';
import { getValidatedApps } from './validation';
import type { CfConfig, CFApp } from '../../types';
import type { AppContentService } from './content';
import { discoverCfApps, filterCfApps } from './discovery';

/**
 * Get the base apps.
 *
 * @param {CfCredentials[]} credentials - The credentials.
 * @param {CfConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @param {AppContentService} appContentService - The app content service.
 * @param {boolean} [includeInvalid] - Whether to include invalid apps.
 * @returns {Promise<CFApp[]>} The base apps.
 */
export async function getBaseApps(
    credentials: CfCredentials[],
    cfConfig: CfConfig,
    logger: ToolsLogger,
    appContentService: AppContentService,
    includeInvalid: boolean = false
): Promise<CFApp[]> {
    const apps = await discoverCfApps(credentials, cfConfig, logger);
    const validatedApps = await getValidatedApps(apps, credentials, cfConfig, appContentService, logger);
    return filterCfApps(validatedApps, includeInvalid);
}
