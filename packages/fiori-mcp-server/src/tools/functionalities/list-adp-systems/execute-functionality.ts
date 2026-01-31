import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import { SystemLookup } from '@sap-ux/adp-tooling';
import { ToolsLogger } from '@sap-ux/logger';
import { logger } from '../../../utils';
import details from './details';

/**
 * Executes the list-adp-systems functionality to retrieve all available systems.
 *
 * @param params Input parameters for listing systems.
 * @returns Systems list execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    try {
        const toolsLogger = new ToolsLogger();
        const systemLookup = new SystemLookup(toolsLogger);
        const systems = await systemLookup.getSystems();

        // Format systems for display
        const systemsList = systems.map((system) => ({
            name: system.Name,
            url: system.Url,
            client: system.Client,
            userDisplayName: system.UserDisplayName,
            scp: system.Scp,
            authentication: system.Authentication
        }));

        // Format systems list as JSON in message for AI to parse and present
        const systemsJson = JSON.stringify(systemsList, null, 2);
        const message = `Found ${systems.length} system(s) available for adaptation projects:\n\n${systemsJson}\n\nUse the system 'name' field when calling generate-adaptation-project.`;

        return {
            functionalityId: details.functionalityId,
            status: 'Success',
            message,
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
