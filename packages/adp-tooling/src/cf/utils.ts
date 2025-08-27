import fs from 'fs';
import path from 'path';
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
    CFServiceOffering
} from '../types';

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
 * Creates a service.
 *
 * @param {string} spaceGuid - The space GUID.
 * @param {string} plan - The plan.
 * @param {string} serviceInstanceName - The service instance name.
 * @param {ToolsLogger} logger - The logger.
 * @param {string[]} tags - The tags.
 * @param {string | null} securityFilePath - The security file path.
 * @param {string | null} serviceName - The service name.
 * @param {string} [xsSecurityProjectName] - The project name for XS security.
 */
export async function createService(
    spaceGuid: string,
    plan: string,
    serviceInstanceName: string,
    logger?: ToolsLogger,
    tags: string[] = [],
    securityFilePath: string | null = null,
    serviceName: string | undefined = undefined,
    xsSecurityProjectName?: string
): Promise<void> {
    try {
        if (!serviceName) {
            const json: CFAPIResponse<CFServiceOffering> = await requestCfApi<CFAPIResponse<CFServiceOffering>>(
                `/v3/service_offerings?per_page=1000&space_guids=${spaceGuid}`
            );
            const serviceOffering = json?.resources?.find(
                (resource: CFServiceOffering) => resource.tags && tags.every((tag) => resource.tags?.includes(tag))
            );
            serviceName = serviceOffering?.name;
        }
        logger?.log(
            `Creating service instance '${serviceInstanceName}' of service '${serviceName}' with '${plan}' plan`
        );

        const commandParameters: string[] = ['create-service', serviceName ?? '', plan, serviceInstanceName];
        if (securityFilePath) {
            let xsSecurity = null;
            try {
                const filePath = path.resolve(__dirname, '../../templates/cf/xs-security.json');
                const xsContent = fs.readFileSync(filePath, 'utf-8');
                xsSecurity = JSON.parse(xsContent);
                xsSecurity.xsappname = xsSecurityProjectName;
            } catch (err) {
                throw new Error('xs-security.json could not be parsed.');
            }

            commandParameters.push('-c');
            commandParameters.push(JSON.stringify(xsSecurity));
        }

        const query = await CFToolsCli.Cli.execute(commandParameters);
        if (query.exitCode !== 0) {
            throw new Error(query.stderr);
        }
    } catch (e) {
        const errorMessage = `Cannot create a service instance '${serviceInstanceName}' in space '${spaceGuid}'. Reason: ${e.message}`;
        logger?.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Requests the CF API.
 *
 * @param {string} url - The URL to request.
 * @returns {Promise<T>} The response from the CF API.
 * @template T - The type of the response.
 */
export async function requestCfApi<T = unknown>(url: string): Promise<T> {
    try {
        const response = await CFToolsCli.Cli.execute(['curl', url], ENV);
        if (response.exitCode === 0) {
            try {
                return JSON.parse(response.stdout);
            } catch (e) {
                throw new Error(`Failed to parse response from request CF API: ${e.message}`);
            }
        }
        throw new Error(response.stderr);
    } catch (e) {
        // log error: CFUtils.ts=>requestCfApi(params)
        throw new Error(`Request to CF API failed. Reason: ${e.message}`);
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
