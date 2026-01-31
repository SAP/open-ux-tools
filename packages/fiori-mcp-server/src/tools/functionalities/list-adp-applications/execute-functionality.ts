import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import { SystemLookup, getConfiguredProvider } from '@sap-ux/adp-tooling';
import { loadApps } from '@sap-ux/adp-tooling/src/source/applications';
import { ToolsLogger } from '@sap-ux/logger';
import { logger } from '../../../utils';
import details from './details';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';

/**
 * Executes the list-adp-applications functionality to retrieve all available applications for a system.
 *
 * @param params Input parameters for listing applications.
 * @returns Applications list execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const isInternalUsage = isInternalFeaturesSettingEnabled();
    const { system } = params.parameters as {
        system: string;
    };

    if (!system) {
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Missing required parameter: system is required.',
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    try {
        const toolsLogger = new ToolsLogger();
        const systemLookup = new SystemLookup(toolsLogger);
        const systemDetails = await systemLookup.getSystemByName(system);
        if (!systemDetails) {
            return {
                functionalityId: details.functionalityId,
                status: 'Error',
                message: `System '${system}' not found. Please use list-adp-systems to see available systems.`,
                parameters: params.parameters,
                appPath: params.appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        const provider = await getConfiguredProvider(
            {
                system,
                client: systemDetails.Client,
                username: systemDetails.Credentials?.username,
                password: systemDetails.Credentials?.password
            },
            toolsLogger
        );

        const applications = await loadApps(provider, !isInternalUsage);
        const applicationsList = applications.map((app) => ({
            id: app.id,
            title: app.title,
            ach: app.ach,
            bspName: app.bspName,
            bspUrl: app.bspUrl,
            fileType: app.fileType,
            registrationIds: app.registrationIds
        }));

        // Format applications list as JSON in message for AI to parse and present
        const applicationsJson = JSON.stringify(applicationsList, null, 2);
        const message = `Found ${applications.length} application(s) available for adaptation in system '${system}':\n\n${applicationsJson}\n\nUse the application 'id' field when calling generate-adaptation-project.`;

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
        logger.error(`Error listing applications: ${error}`);
        return {
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Error listing applications: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params.parameters,
            appPath: params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
