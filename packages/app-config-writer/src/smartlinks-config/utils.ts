import type { AxiosBasicCredentials } from 'axios';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { ToolsLogger } from '@sap-ux/logger';
import type { ServiceConfig, SystemDetailsResponse, TargetMapping } from '../types';
import { t } from '../i18n';
import { promptUserPass } from '../prompt';
import { sendRequest } from './service';

/**
 * @description Check the secure storage if it has credentials for the entered url.
 * @param url target system url
 * @param client optional sap-client parameter
 * @returns credentials or undefined
 */
export async function getSystemCredentials(url: string, client?: string): Promise<AxiosBasicCredentials | undefined> {
    const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
    const system = await systemService.read(new BackendSystemKey({ url, client }));
    return system?.username ? { username: system.username, password: system.password || '' } : undefined;
}

/**
 * @description Returns stored credentials or prompt for credentials input
 * @param service service parameters to be checked for existing credentials
 * @param logger logger to report info to the user
 * @returns stored credentials or from prompt
 */
export async function getCredentials(
    service: ServiceConfig,
    logger?: ToolsLogger
): Promise<AxiosBasicCredentials | undefined> {
    return (await getSystemCredentials(service.url, service.client)) || promptUserPass(logger);
}

/**
 * @description Sends a request and returns the target mappings
 * @param config service and credentials to be used for request
 * @param logger logger
 * @returns target mappings result from service
 */
async function getTargetMappings(
    config: ServiceConfig,
    logger?: ToolsLogger
): Promise<{ [key: string]: TargetMapping }> {
    const response: SystemDetailsResponse | undefined = await sendRequest(config, config.credentials, logger);
    if (!response || !response.targetMappings) {
        throw Error(t('error.noTargets'));
    }
    return response.targetMappings;
}

/**
 * @description Receives and maps targets from service to template for further consumption
 * @param config service and credentials to be used for request
 * @param logger logger
 * @returns config with targets to be used for template mapping
 */
export async function getTargetMappingsConfig(config: ServiceConfig, logger?: ToolsLogger) {
    const targetMappings = await getTargetMappings(config, logger);
    for (const targetName in targetMappings) {
        const target = targetMappings[targetName];
        // ToDo:
        // [ ] Map to config
        // [ ] Return config
    }
}
