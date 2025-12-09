import * as fs from 'node:fs';
import axios from 'axios';
import * as path from 'node:path';
import type { AxiosRequestConfig } from 'axios';
import { Cli } from '@sap/cf-tools';

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
    MtaYaml,
    ServiceInfo,
    CfUi5AppInfo
} from '../../types';
import { t } from '../../i18n';
import { getProjectNameForXsSecurity } from '../project';
import { createServiceKey, getServiceKeys, requestCfApi } from './cli';

interface FDCResponse {
    results: CFApp[];
}

interface CreateServiceOptions {
    xsSecurityProjectName?: string;
    templatePathOverwrite?: string;
    logger?: ToolsLogger;
}

const PARAM_MAP: Map<string, string> = new Map([
    ['spaceGuids', 'space_guids'],
    ['planNames', 'service_plan_names'],
    ['names', 'names']
]);

/**
 * Get the business service info.
 *
 * @param {string} businessService - The business service.
 * @param {CfConfig} config - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<ServiceInfo | null>} The service info.
 */
export async function getBusinessServiceInfo(
    businessService: string,
    config: CfConfig,
    logger: ToolsLogger
): Promise<ServiceInfo | null> {
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
    const isBAS = isAppStudio();

    if (endpointParts?.[3]) {
        // Public cloud
        const region = endpointParts[1];
        // Use mTLS enabled domain with "cert" prefix only in BAS, otherwise use regular domain
        if (isBAS) {
            url = `${fdcUrl}cert.cfapps.${region}.hana.ondemand.com`;
        } else {
            url = `${fdcUrl}cfapps.${region}.hana.ondemand.com`;
        }
    } else if (endpointParts?.[4]?.endsWith('.cn')) {
        // China has a special URL pattern
        const parts = endpointParts[4].split('.');
        parts.splice(2, 0, 'apps');
        url = `${fdcUrl}sapui5flex${parts.join('.')}`;
    } else {
        url = `${fdcUrl}sapui5flex.cfapps${endpointParts?.[4]}`;
    }

    if (!isBAS || !endpointParts?.[3]) {
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
 * @returns {Promise<CFApp[]>} The FDC apps.
 */
export async function getFDCApps(appHostIds: string[], cfConfig: CfConfig, logger: ToolsLogger): Promise<CFApp[]> {
    const requestArguments = getFDCRequestArguments(cfConfig);
    logger?.log(`App Hosts: ${JSON.stringify(appHostIds)}, request arguments: ${JSON.stringify(requestArguments)}`);

    const appHostIdParams = appHostIds.map((id) => `appHostId=${encodeURIComponent(id)}`).join('&');
    const url = `${requestArguments.url}/api/business-service/discovery?${appHostIdParams}`;

    try {
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
 * Get ui5AppInfo.json from FDC service.
 *
 * @param {string} appId - The application ID.
 * @param {string[]} appHostIds - The app host IDs.
 * @param {CfConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<CfUi5AppInfo>} The ui5AppInfo.json content.
 */
export async function getCfUi5AppInfo(
    appId: string,
    appHostIds: string[],
    cfConfig: CfConfig,
    logger: ToolsLogger
): Promise<CfUi5AppInfo> {
    const requestArguments = getFDCRequestArguments(cfConfig);

    const appHostIdParams = appHostIds.map((id) => `appHostId=${encodeURIComponent(id)}`).join('&');
    const url = `${requestArguments.url}/discovery/ui5_app_info_json?appId=${encodeURIComponent(
        appId
    )}&${appHostIdParams}`;

    logger?.log(`Fetching ui5AppInfo.json from FDC: ${url}`);

    try {
        const response = await axios.get(url, requestArguments.options);

        if (response.status === 200) {
            logger?.log('Successfully retrieved ui5AppInfo.json from FDC');
            return response.data as CfUi5AppInfo;
        } else {
            throw new Error(t('error.failedToConnectToFDCService', { status: response.status }));
        }
    } catch (error) {
        logger?.error(`Getting ui5AppInfo.json failed. Request url: ${url}. ${error}`);
        throw new Error(`Failed to get ui5AppInfo.json from FDC: ${error.message}`);
    }
}

/**
 * Creates a service instance.
 *
 * @param {string} plan - The service plan.
 * @param {string} serviceInstanceName - The service instance name.
 * @param {string} serviceName - The service name.
 * @param {CreateServiceOptions} [options] - Additional options.
 * @returns {Promise<void>} The promise.
 */
export async function createServiceInstance(
    plan: string,
    serviceInstanceName: string,
    serviceName: string,
    options?: CreateServiceOptions
): Promise<void> {
    const { xsSecurityProjectName, templatePathOverwrite, logger } = options ?? {};

    try {
        logger?.log(
            `Creating service instance '${serviceInstanceName}' of service '${serviceName}' with '${plan}' plan`
        );

        const commandParameters: string[] = ['create-service', serviceName, plan, serviceInstanceName];

        if (xsSecurityProjectName) {
            let xsSecurity = null;
            try {
                const baseTmplPath = path.join(__dirname, '../../../templates');
                const templatePath = templatePathOverwrite ?? baseTmplPath;
                const filePath = path.resolve(templatePath, 'cf/xs-security.json');
                const xsContent = fs.readFileSync(filePath, 'utf-8');
                xsSecurity = JSON.parse(xsContent) as unknown as { xsappname?: string };
                xsSecurity.xsappname = xsSecurityProjectName;
            } catch (err) {
                logger?.error(`Failed to parse xs-security.json file: ${err}`);
                throw new Error(t('error.xsSecurityJsonCouldNotBeParsed'));
            }

            commandParameters.push('-c', JSON.stringify(xsSecurity));
        }

        await Cli.execute(commandParameters);
        logger?.log(`Service instance '${serviceInstanceName}' created successfully`);
    } catch (e) {
        logger?.error(e);
        throw new Error(t('error.failedToCreateServiceInstance', { serviceInstanceName, error: e.message }));
    }
}

/**
 * Gets the service name by tags.
 *
 * @param {string} spaceGuid - The space GUID.
 * @param {string[]} tags - The service tags for discovery.
 * @returns {Promise<string>} The service name.
 */
export async function getServiceNameByTags(spaceGuid: string, tags: string[]): Promise<string> {
    const json: CfAPIResponse<CfServiceOffering> = await requestCfApi<CfAPIResponse<CfServiceOffering>>(
        `/v3/service_offerings?per_page=1000&space_guids=${spaceGuid}`
    );
    const serviceOffering = json?.resources?.find(
        (resource: CfServiceOffering) => resource.tags && tags.every((tag) => resource.tags?.includes(tag))
    );
    return serviceOffering?.name ?? '';
}

/**
 * Creates the services.
 *
 * @param {MtaYaml} yamlContent - The YAML content.
 * @param {string[]} initialServices - The initial services.
 * @param {string} timestamp - The timestamp.
 * @param {string} [templatePathOverwrite] - The template path overwrite.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<void>} The promise.
 */
export async function createServices(
    yamlContent: MtaYaml,
    initialServices: string[],
    timestamp: string,
    templatePathOverwrite?: string,
    logger?: ToolsLogger
): Promise<void> {
    const excludeServices = new Set([...initialServices, 'portal', 'html5-apps-repo']);
    const xsSecurityProjectName = getProjectNameForXsSecurity(yamlContent, timestamp);
    for (const resource of yamlContent.resources ?? []) {
        if (!excludeServices.has(resource?.parameters?.service ?? '')) {
            if (resource?.parameters?.service === 'xsuaa') {
                await createServiceInstance(
                    resource.parameters['service-plan'] ?? '',
                    resource.parameters['service-name'] ?? '',
                    resource.parameters.service,
                    {
                        xsSecurityProjectName,
                        templatePathOverwrite,
                        logger
                    }
                );
            } else {
                await createServiceInstance(
                    resource.parameters['service-plan'] ?? '',
                    resource.parameters['service-name'] ?? '',
                    resource.parameters.service ?? '',
                    {
                        templatePathOverwrite,
                        logger
                    }
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
 * @returns {Promise<ServiceInfo | null>} The service instance keys.
 */
export async function getServiceInstanceKeys(
    serviceInstanceQuery: GetServiceInstanceParams,
    logger: ToolsLogger
): Promise<ServiceInfo | null> {
    try {
        const serviceInstances = await getServiceInstance(serviceInstanceQuery);
        if (serviceInstances?.length > 0) {
            // We can use any instance in the list to connect to HTML5 Repo
            logger?.log(`Use '${serviceInstances[0].name}' HTML5 Repo instance`);
            return {
                serviceKeys: await getOrCreateServiceKeys(serviceInstances[0], logger),
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
 * @returns {Promise<ServiceKeys[]>} The service instance keys.
 */
export async function getOrCreateServiceKeys(
    serviceInstance: ServiceInstance,
    logger: ToolsLogger
): Promise<ServiceKeys[]> {
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
