import * as fs from 'fs';
import axios from 'axios';
import * as path from 'path';
import type { AxiosRequestConfig } from 'axios';
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
import { t } from '../../i18n';
import { isLoggedInCf } from '../core/auth';
import { getProjectNameForXsSecurity } from '../project';
import { createServiceKey, getServiceKeys, requestCfApi } from './cli';

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
export function getFDCRequestArguments(cfConfig: CfConfig): RequestArguments {
    const fdcUrl = 'https://ui5-flexibility-design-and-configuration.';
    const cfApiEndpoint = `https://api.cf.${cfConfig.url}`;
    const endpointParts = /https:\/\/api\.cf(?:\.([^-.]*)(-\d+)?(\.hana\.ondemand\.com)|(.*))/.exec(cfApiEndpoint);
    const options: AxiosRequestConfig = {
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
        options.headers!['Authorization'] = `Bearer ${cfConfig.token}`;
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
export async function getFDCApps(appHostIds: string[], cfConfig: CfConfig, logger: ToolsLogger): Promise<CFApp[]> {
    const requestArguments = getFDCRequestArguments(cfConfig);
    logger?.log(`App Hosts: ${JSON.stringify(appHostIds)}, request arguments: ${JSON.stringify(requestArguments)}`);

    const appHostIdParams = appHostIds.map((id) => `appHostId=${encodeURIComponent(id)}`).join('&');
    const url = `${requestArguments.url}/api/business-service/discovery?${appHostIdParams}`;

    try {
        const isLoggedIn = await isLoggedInCf(cfConfig, logger);
        if (!isLoggedIn) {
            await CFLocal.cfGetAvailableOrgs();
        }

        const response = await axios.get<FDCResponse>(url, requestArguments.options);

        if (response.status === 200) {
            logger?.log(`Retrieved FDC apps with request url: ${JSON.stringify(response.data)}`);
            return response.data.results;
        } else {
            throw new Error(t('error.failedToConnectToFDCService', { status: response.status }));
        }
    } catch (error) {
        logger?.error(`Getting FDC apps failed. Request url: ${url}. ${error}`);
        throw new Error(t('error.failedToGetFDCApps', { error: error.message }));
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
                logger?.error(`Failed to parse xs-security.json file: ${err}`);
                throw new Error(t('error.xsSecurityJsonCouldNotBeParsed'));
            }

            commandParameters.push('-c');
            commandParameters.push(JSON.stringify(xsSecurity));
        }

        await CFToolsCli.Cli.execute(commandParameters);
        logger?.log(`Service instance '${serviceInstanceName}' created successfully`);
    } catch (e) {
        logger?.error(e);
        throw new Error(t('error.failedToCreateServiceInstance', { serviceInstanceName, error: e.message }));
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
        const errorMessage = t('error.failedToGetServiceInstanceKeys', { error: e.message });
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
        if (!json?.resources || !Array.isArray(json.resources)) {
            throw new Error(t('error.noValidJsonForServiceInstance'));
        }

        return json.resources.map((service: CfServiceInstance) => ({
            name: service.name,
            guid: service.guid
        }));
    } catch (e) {
        throw new Error(t('error.failedToGetServiceInstance', { uriParameters, error: e.message }));
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
    const serviceInstanceName = serviceInstance.name;
    try {
        const credentials = await getServiceKeys(serviceInstance.guid);
        if (credentials?.length > 0) {
            return credentials;
        } else {
            const serviceKeyName = serviceInstanceName + '_key';
            logger?.log(`Creating service key '${serviceKeyName}' for service instance '${serviceInstanceName}'`);
            await createServiceKey(serviceInstanceName, serviceKeyName);
            return getServiceKeys(serviceInstance.guid);
        }
    } catch (e) {
        throw new Error(t('error.failedToGetOrCreateServiceKeys', { serviceInstanceName, error: e.message }));
    }
}
