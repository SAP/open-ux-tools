import * as fs from 'fs';
import * as path from 'path';
import axios, { type AxiosResponse } from 'axios';
import CFLocal = require('@sap/cf-tools/out/src/cf-local');
import CFToolsCli = require('@sap/cf-tools/out/src/cli');

import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';

import type {
    CfConfig,
    CFApp,
    RequestArguments,
    ServiceKeys,
    CfAPIResponse,
    CfServiceOffering,
    GetServiceInstanceParams,
    ServiceInstance,
    CfServiceInstance,
    CfCredentials,
    MtaYaml
} from '../../types';
import { isLoggedInCf } from '../core/auth';
import { createServiceKey, getServiceKeys } from './cli';
import { getProjectNameForXsSecurity } from '../project';

interface FDCResponse {
    results: CFApp[];
}

const PARAM_MAP: Map<string, string> = new Map([
    ['spaceGuids', 'space_guids'],
    ['planNames', 'service_plan_names'],
    ['names', 'names']
]);

/**
 * Get the business service keys.
 *
 * @param {string} businessService - The business service.
 * @param {CfConfig} config - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<ServiceKeys | null>} The service keys.
 */
export async function getBusinessServiceKeys(
    businessService: string,
    config: CfConfig,
    logger: ToolsLogger
): Promise<ServiceKeys | null> {
    const serviceKeys = await getServiceInstanceKeys(
        {
            spaceGuids: [config.space.GUID],
            names: [businessService]
        },
        logger
    );
    logger?.log(`Available service key instance : ${JSON.stringify(serviceKeys?.serviceInstance)}`);
    return serviceKeys;
}

/**
 * Get the FDC request arguments.
 *
 * @param {CfConfig} cfConfig - The CF config.
 * @returns {RequestArguments} The request arguments.
 */
function getFDCRequestArguments(cfConfig: CfConfig): RequestArguments {
    const fdcUrl = 'https://ui5-flexibility-design-and-configuration.';
    const cfApiEndpoint = `https://api.cf.${cfConfig.url}`;
    const endpointParts = /https:\/\/api\.cf(?:\.([^-.]*)(-\d+)?(\.hana\.ondemand\.com)|(.*))/.exec(cfApiEndpoint);
    const options: any = {
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    let url: string;

    if (endpointParts?.[3]) {
        // Public cloud - use mTLS enabled domain with "cert" prefix
        const region = endpointParts[1];
        url = `${fdcUrl}cert.cfapps.${region}.hana.ondemand.com`;
    } else {
        // Private cloud or other environments
        if (endpointParts?.[4]?.endsWith('.cn')) {
            // China has a special URL pattern
            const parts = endpointParts[4].split('.');
            parts.splice(2, 0, 'apps');
            url = `${fdcUrl}sapui5flex${parts.join('.')}`;
        } else {
            url = `${fdcUrl}sapui5flex.cfapps${endpointParts?.[4]}`;
        }
    }

    // Add authorization token for non-BAS environments or private cloud
    // For BAS environments with mTLS, the certificate authentication is handled automatically
    if (!isAppStudio() || !endpointParts?.[3]) {
        options.headers['Authorization'] = `Bearer ${cfConfig.token}`;
    }

    return {
        url: url,
        options
    };
}

/**
 * Get the FDC apps.
 *
 * @param {string[]} appHostIds - The app host ids.
 * @param {CfConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<AxiosResponse<FDCResponse>>} The FDC apps.
 */
export async function getFDCApps(
    appHostIds: string[],
    cfConfig: CfConfig,
    logger: ToolsLogger
): Promise<AxiosResponse<FDCResponse>> {
    const requestArguments = getFDCRequestArguments(cfConfig);
    logger?.log(`App Hosts: ${JSON.stringify(appHostIds)}, request arguments: ${JSON.stringify(requestArguments)}`);

    // Construct the URL with multiple appHostIds as separate query parameters
    // Format: ?appHostId=<id1>&appHostId=<id2>&appHostId=<id3>
    const appHostIdParams = appHostIds.map((id) => `appHostId=${encodeURIComponent(id)}`).join('&');
    const url = `${requestArguments.url}/api/business-service/discovery?${appHostIdParams}`;

    try {
        const isLoggedIn = await isLoggedInCf(cfConfig, logger);
        if (!isLoggedIn) {
            await CFLocal.cfGetAvailableOrgs();
        }
        const response = await axios.get<FDCResponse>(url, requestArguments.options);
        logger?.log(
            `Getting FDC apps. Request url: ${url} response status: ${response.status}, response data: ${JSON.stringify(
                response.data
            )}`
        );
        return response;
    } catch (e) {
        logger?.error(
            `Getting FDC apps. Request url: ${url}, response status: ${e?.response?.status}, message: ${e.message || e}`
        );
        throw new Error(
            `Failed to get application from Flexibility Design and Configuration service ${url}. Reason: ${
                e.message || e
            }`
        );
    }
}

/**
 * Request CF API.
 *
 * @param {string} url - The URL.
 * @returns {Promise<T>} The response.
 */
export async function requestCfApi<T = unknown>(url: string): Promise<T> {
    try {
        const response = await CFToolsCli.Cli.execute(['curl', url], { env: { 'CF_COLOR': 'false' } });
        if (response.exitCode === 0) {
            try {
                return JSON.parse(response.stdout);
            } catch (e) {
                throw new Error(`Failed to parse response from request CF API: ${e.message}`);
            }
        }
        throw new Error(response.stderr);
    } catch (e) {
        throw new Error(`Request to CF API failed. Reason: ${e.message}`);
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
            const json: CfAPIResponse<CfServiceOffering> = await requestCfApi<CfAPIResponse<CfServiceOffering>>(
                `/v3/service_offerings?per_page=1000&space_guids=${spaceGuid}`
            );
            const serviceOffering = json?.resources?.find(
                (resource: CfServiceOffering) => resource.tags && tags.every((tag) => resource.tags?.includes(tag))
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
                const filePath = path.resolve(__dirname, '../../../templates/cf/xs-security.json');
                const xsContent = fs.readFileSync(filePath, 'utf-8');
                xsSecurity = JSON.parse(xsContent) as unknown as { xsappname?: string };
                xsSecurity.xsappname = xsSecurityProjectName;
            } catch (err) {
                throw new Error('xs-security.json could not be parsed.');
            }

            commandParameters.push('-c');
            commandParameters.push(JSON.stringify(xsSecurity));
        }

        await CFToolsCli.Cli.execute(commandParameters);
        logger?.log(`Service instance '${serviceInstanceName}' created successfully`);
    } catch (e) {
        const errorMessage = `Failed to create service instance '${serviceInstanceName}'. Reason: ${e.message}`;
        logger?.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Creates the services.
 *
 * @param {string} projectPath - The project path.
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string[]} initialServices - The initial services.
 * @param {string} timestamp - The timestamp.
 * @param {string} spaceGuid - The space GUID.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<void>} The promise.
 */
export async function createServices(
    projectPath: string,
    yamlContent: MtaYaml,
    initialServices: string[],
    timestamp: string,
    spaceGuid: string,
    logger?: ToolsLogger
): Promise<void> {
    const excludeServices = initialServices.concat(['portal', 'html5-apps-repo']);
    const xsSecurityPath = path.join(projectPath, 'xs-security.json');
    const xsSecurityProjectName = getProjectNameForXsSecurity(yamlContent, timestamp);
    for (const resource of yamlContent.resources ?? []) {
        if (!excludeServices.includes(resource?.parameters?.service ?? '')) {
            if (resource?.parameters?.service === 'xsuaa') {
                await createService(
                    spaceGuid,
                    resource.parameters['service-plan'] ?? '',
                    resource.parameters['service-name'] ?? '',
                    logger,
                    [],
                    xsSecurityPath,
                    resource.parameters.service,
                    xsSecurityProjectName
                );
            } else {
                await createService(
                    spaceGuid,
                    resource.parameters['service-plan'] ?? '',
                    resource.parameters['service-name'] ?? '',
                    logger,
                    [],
                    '',
                    resource.parameters.service,
                    xsSecurityProjectName
                );
            }
        }
    }
}

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
            // We can use any instance in the list to connect to HTML5 Repo
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
 * Gets the service instance.
 *
 * @param {GetServiceInstanceParams} params - The service instance parameters.
 * @returns {Promise<ServiceInstance[]>} The service instance.
 */
async function getServiceInstance(params: GetServiceInstanceParams): Promise<ServiceInstance[]> {
    const parameters = Object.entries(params)
        .filter(([_, value]) => value?.length > 0)
        .map(([key, value]) => `${PARAM_MAP.get(key)}=${value.join(',')}`);
    const uriParameters = parameters.length > 0 ? `?${parameters.join('&')}` : '';
    const uri = `/v3/service_instances` + uriParameters;
    try {
        const json = await requestCfApi<CfAPIResponse<CfServiceInstance>>(uri);
        if (json?.resources && Array.isArray(json.resources)) {
            return json.resources.map((service: CfServiceInstance) => ({
                name: service.name,
                guid: service.guid
            }));
        }
        throw new Error('No valid JSON for service instance');
    } catch (e) {
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
async function getOrCreateServiceKeys(serviceInstance: ServiceInstance, logger: ToolsLogger): Promise<CfCredentials[]> {
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
        throw new Error(
            `Failed to get or create service keys for instance name ${serviceInstance.name}. Reason: ${e.message}`
        );
    }
}
