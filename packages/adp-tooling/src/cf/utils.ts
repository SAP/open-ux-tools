import CFLocal = require('@sap/cf-tools/out/src/cf-local');
import CFToolsCli = require('@sap/cf-tools/out/src/cli');
import { eFilters } from '@sap/cf-tools/out/src/types';

import type { ToolsLogger } from '@sap-ux/logger';

import type {
    GetServiceInstanceParams,
    ServiceKeys,
    ServiceInstance,
    Credentials,
    CFAPIResponse,
    CFServiceInstance,
    CFApp
} from '../types';
import { requestCfApi } from './api';

const ENV = { env: { 'CF_COLOR': 'false' } };
const CREATE_SERVICE_KEY = 'create-service-key';

/**
 * Gets the service instance keys.
 *
 * @param {GetServiceInstanceParams} serviceInstanceQuery - The service instance query.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<ServiceKeys | null>} The service instance keys.
 */
export async function getServiceInstanceKeys(
    serviceInstanceQuery: GetServiceInstanceParams,
    logger: ToolsLogger
): Promise<ServiceKeys | null> {
    try {
        const serviceInstances = await getServiceInstance(serviceInstanceQuery);
        if (serviceInstances?.length > 0) {
            // we can use any instance in the list to connect to HTML5 Repo
            logger?.log(`Use '${serviceInstances[0].name}' HTML5 Repo instance`);
            return {
                credentials: await getOrCreateServiceKeys(serviceInstances[0], logger),
                serviceInstance: serviceInstances[0]
            };
        }
        return null;
    } catch (e) {
        const errorMessage = `Failed to get service instance keys. Reason: ${e.message}`;
        logger?.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Gets the authentication token.
 *
 * @returns {Promise<string>} The authentication token.
 */
export async function getAuthToken(): Promise<string> {
    const response = await CFToolsCli.Cli.execute(['oauth-token'], ENV);
    if (response.exitCode === 0) {
        return response.stdout;
    }
    return response.stderr;
}

/**
 * Checks if Cloud Foundry is installed.
 */
export async function checkForCf(): Promise<void> {
    try {
        const response = await CFToolsCli.Cli.execute(['version'], ENV);
        if (response.exitCode !== 0) {
            throw new Error(response.stderr);
        }
    } catch (error) {
        // log error: CFUtils.ts=>checkForCf
        throw new Error('Cloud Foundry is not installed in your space.');
    }
}

/**
 * Logs out from Cloud Foundry.
 */
export async function cFLogout(): Promise<void> {
    await CFToolsCli.Cli.execute(['logout']);
}

/**
 * Gets the service instance.
 *
 * @param {GetServiceInstanceParams} params - The service instance parameters.
 * @returns {Promise<ServiceInstance[]>} The service instance.
 */
async function getServiceInstance(params: GetServiceInstanceParams): Promise<ServiceInstance[]> {
    const PARAM_MAP: Map<string, string> = new Map([
        ['spaceGuids', 'space_guids'],
        ['planNames', 'service_plan_names'],
        ['names', 'names']
    ]);
    const parameters = Object.entries(params)
        .filter(([_, value]) => value?.length > 0)
        .map(([key, value]) => `${PARAM_MAP.get(key)}=${value.join(',')}`);
    const uriParameters = parameters.length > 0 ? `?${parameters.join('&')}` : '';
    const uri = `/v3/service_instances` + uriParameters;
    try {
        const json = await requestCfApi<CFAPIResponse<CFServiceInstance>>(uri);
        if (json?.resources && Array.isArray(json.resources)) {
            return json.resources.map((service: CFServiceInstance) => ({
                name: service.name,
                guid: service.guid
            }));
        }
        throw new Error('No valid JSON for service instance');
    } catch (e) {
        // log error: CFUtils.ts=>getServiceInstance with uriParameters
        throw new Error(`Failed to get service instance with params ${uriParameters}. Reason: ${e.message}`);
    }
}

/**
 * Gets the service instance keys.
 *
 * @param {ServiceInstance} serviceInstance - The service instance.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<ServiceKeys | null>} The service instance keys.
 */
async function getOrCreateServiceKeys(serviceInstance: ServiceInstance, logger: ToolsLogger): Promise<Credentials[]> {
    try {
        const credentials = await getServiceKeys(serviceInstance.guid);
        if (credentials?.length > 0) {
            return credentials;
        } else {
            const serviceKeyName = serviceInstance.name + '_key';
            logger?.log(`Creating service key '${serviceKeyName}' for service instance '${serviceInstance.name}'`);
            await createServiceKey(serviceInstance.name, serviceKeyName);
            return getServiceKeys(serviceInstance.guid);
        }
    } catch (e) {
        // log error: CFUtils.ts=>getOrCreateServiceKeys with param
        throw new Error(
            `Failed to get or create service keys for instance name ${serviceInstance.name}. Reason: ${e.message}`
        );
    }
}

/**
 * Gets the service instance credentials.
 *
 * @param {string} serviceInstanceGuid - The service instance GUID.
 * @returns {Promise<Credentials[]>} The service instance credentials.
 */
async function getServiceKeys(serviceInstanceGuid: string): Promise<Credentials[]> {
    try {
        return await CFLocal.cfGetInstanceCredentials({
            filters: [
                {
                    value: serviceInstanceGuid,
                    // key: eFilters.service_instance_guid
                    key: eFilters.service_instance_guid
                }
            ]
        });
    } catch (e) {
        // log error: CFUtils.ts=>getServiceKeys for guid
        throw new Error(
            `Failed to get service instance credentials from CFLocal for guid ${serviceInstanceGuid}. Reason: ${e.message}`
        );
    }
}

/**
 * Creates a service key.
 *
 * @param {string} serviceInstanceName - The service instance name.
 * @param {string} serviceKeyName - The service key name.
 */
async function createServiceKey(serviceInstanceName: string, serviceKeyName: string): Promise<void> {
    try {
        const cliResult = await CFToolsCli.Cli.execute([CREATE_SERVICE_KEY, serviceInstanceName, serviceKeyName], ENV);
        if (cliResult.exitCode !== 0) {
            throw new Error(cliResult.stderr);
        }
    } catch (e) {
        // log error: CFUtils.ts=>createServiceKey for serviceInstanceName
        throw new Error(`Failed to create service key for instance name ${serviceInstanceName}. Reason: ${e.message}`);
    }
}

/**
 * Format the discovery.
 *
 * @param {CFApp} app - The app.
 * @returns {string} The formatted discovery.
 */
export function formatDiscovery(app: CFApp): string {
    return `${app.title} (${app.appId} ${app.appVersion})`;
}

/**
 * Get the app host ids.
 *
 * @param {Credentials[]} credentials - The credentials.
 * @returns {Set<string>} The app host ids.
 */
export function getAppHostIds(credentials: Credentials[]): Set<string> {
    const appHostIds: string[] = [];
    credentials.forEach((credential) => {
        const appHostId = credential['html5-apps-repo']?.app_host_id;
        if (appHostId) {
            appHostIds.push(appHostId.split(',').map((item: string) => item.trim())); // there might be multiple appHostIds separated by comma
        }
    });

    // appHostIds is now an array of arrays of strings (from split)
    // Flatten the array and create a Set
    return new Set(appHostIds.flat());
}
