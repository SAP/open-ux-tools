import type { ToolsLogger } from '@sap-ux/logger';

import { buildVcapServicesFromResources } from './mta';
import type { AppRouterEnvOptions, MtaYaml } from '../../types';

/**
 * Builds app-router environment options from MTA YAML resources.
 *
 * @param {MtaYaml} mtaYaml - The MTA YAML content.
 * @param {string} spaceGuid - The space GUID.
 * @param {Array<{ name: string; url: string }>} destinations - The destinations.
 * @param {ToolsLogger} logger - Optional logger.
 * @returns {Promise<AppRouterEnvOptions>} The environment options for default-env.json.
 */
export async function getAppRouterEnvOptions(
    mtaYaml: MtaYaml,
    spaceGuid: string,
    destinations: Array<{ name: string; url: string }>,
    logger: ToolsLogger
): Promise<AppRouterEnvOptions> {
    const vcapServices = await buildVcapServicesFromResources(mtaYaml.resources, spaceGuid, logger);

    return {
        VCAP_SERVICES: vcapServices,
        destinations
    };
}
