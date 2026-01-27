import { getService, BackendSystem, BackendSystemKey, SystemType } from '@sap-ux/store';
import type { SystemLookup } from '../source';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Stores system credentials securely using the @sap-ux/store service.
 * Only stores credentials for ABAP environments when all required fields are provided.
 *
 * @param configAnswers - Configuration answers containing credentials and system info
 * @param configAnswers.system - System name to retrieve endpoint information
 * @param configAnswers.username - Username for authentication
 * @param configAnswers.password - Password for authentication
 * @param systemLookup - System lookup service for retrieving endpoint details
 * @param logger - Logger for informational and warning messages
 */
export async function storeCredentials(
    configAnswers: {
        system: string;
        username?: string;
        password?: string;
    },
    systemLookup: SystemLookup,
    logger: ToolsLogger
): Promise<void> {
    if (!configAnswers.username || !configAnswers.password) {
        return;
    }

    try {
        const systemEndpoint = await systemLookup.getSystemByName(configAnswers.system);
        if (!systemEndpoint?.Url) {
            logger.warn('Cannot store credentials: system endpoint or URL not found.');
            return;
        }

        const systemService = await getService<BackendSystem, BackendSystemKey>({
            entityName: 'system'
        });

        const backendSystemKey = new BackendSystemKey({
            url: systemEndpoint.Url,
            client: systemEndpoint.Client
        });

        const existingSystem = await systemService.read(backendSystemKey);

        const backendSystem = new BackendSystem({
            name: configAnswers.system,
            url: systemEndpoint.Url,
            client: systemEndpoint.Client,
            username: configAnswers.username,
            password: configAnswers.password,
            systemType: (systemEndpoint.SystemType as SystemType) || SystemType.AbapOnPrem,
            connectionType: 'abap_catalog'
        });

        await systemService.write(backendSystem, { force: !!existingSystem });

        logger.info('System credentials have been stored securely.');
    } catch (error) {
        logger.error(`Failed to store credentials: ${error instanceof Error ? error.message : String(error)}`);
        logger.debug(error);
    }
}
