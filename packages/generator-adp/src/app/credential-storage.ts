import { getService, BackendSystem, BackendSystemKey, SystemType } from '@sap-ux/store';
import type { SystemLookup } from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Stores system credentials securely using the @sap-ux/store service.
 * 
 * @param configAnswers - Configuration answers containing credentials and system info
 * @param systemLookup - SystemLookup instance to retrieve system endpoint details
 * @param logger - Logger instance for logging messages
 */
export async function storeCredentials(
    configAnswers: { 
        storeCredentials?: boolean; 
        system: string; 
        username?: string; 
        password?: string;
    },
    systemLookup: SystemLookup,
    logger: ToolsLogger
): Promise<void> {
    if (configAnswers.storeCredentials && configAnswers.username && configAnswers.password) {
        try {
            const systemEndpoint = await systemLookup.getSystemByName(configAnswers.system);
            if (!systemEndpoint?.Url) {
                logger.warn('Cannot store credentials: system endpoint or URL not found.');
            } else {
                const systemService = await getService<BackendSystem, BackendSystemKey>({ 
                    entityName: 'system' 
                });
                const backendSystemKey = new BackendSystemKey({
                    url: systemEndpoint.Url,
                    client: systemEndpoint.Client
                });
                const existingSystem = await systemService.read(backendSystemKey);
                const shouldForceUpdate = !!existingSystem;
                const backendSystem = new BackendSystem({
                    name: configAnswers.system,
                    url: systemEndpoint.Url,
                    client: systemEndpoint.Client,
                    username: configAnswers.username,
                    password: configAnswers.password,
                    systemType: (systemEndpoint.SystemType as SystemType) || SystemType.AbapOnPrem,
                    connectionType: 'abap_catalog'
                });
                await systemService.write(backendSystem, { force: shouldForceUpdate });
                
                logger.info('System credentials have been stored securely.');
            }
        } catch (error) {
            logger.warn(`Failed to store credentials: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
