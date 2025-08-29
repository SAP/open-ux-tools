import type { ToolsLogger } from '@sap-ux/logger';

import type { Credentials } from '../../types';
import { getValidatedApps } from './validation';
import type { CFConfig, CFApp } from '../../types';
import type { AppContentService } from './content';
import { discoverCfApps, filterCfApps } from './discovery';

/**
 * Get the base apps.
 *
 * @param {Credentials[]} credentials - The credentials.
 * @param {CFConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @param {AppContentService} appContentService - The app content service.
 * @param {boolean} [includeInvalid] - Whether to include invalid apps.
 * @returns {Promise<CFApp[]>} The base apps.
 */
export async function getBaseApps(
    credentials: Credentials[],
    cfConfig: CFConfig,
    logger: ToolsLogger,
    appContentService: AppContentService,
    includeInvalid: boolean = false
): Promise<CFApp[]> {
    const apps = await discoverCfApps(credentials, cfConfig, logger);
    const validatedApps = await getValidatedApps(apps, credentials, cfConfig, appContentService, logger);
    return filterCfApps(validatedApps, includeInvalid);
}
