import { ToolsLogger } from '@sap-ux/logger';
import type { Endpoint } from '@sap-ux/adp-tooling';
import { SystemLookup } from '@sap-ux/adp-tooling';

import details from './details';
import { logger } from '../../../utils';
import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';

/**
 * Executes the list-systems functionality to retrieve all available SAP systems.
 *
 * @param params Input parameters for listing systems.
 * @returns Systems list execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    try {
        const toolsLogger = new ToolsLogger();
        const systemLookup = new SystemLookup(toolsLogger);
        const systems = await systemLookup.getSystems();

        const systemsList = systems.map((system: Endpoint) => ({
            name: system.Name,
            client: system.Client
        }));

        const systemsJson = JSON.stringify(systemsList, null, 2);

        return {
            functionalityId: details.functionalityId,
            status: 'Success',
            message: `Found ${systems.length} system(s) available:\n\n${systemsJson}`,
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error listing systems: ${error}`);
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Error listing systems: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
