import { Agent as HttpsAgent } from 'https';
import { cyan, red } from 'chalk';
import type { AxiosBasicCredentials } from 'axios';
import axios from 'axios';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { ToolsLogger } from '@sap-ux/logger';
import { FileName } from '@sap-ux/project-access';
import type { ServiceConfig, Service, SystemDetailsResponse } from '../types';
import { UrlParameters } from '../types';
import { t } from '../i18n';
import { readUi5Config, readUi5DeployConfig } from './ui5-yaml';

/**
 * @description Combines the service parameters and returns the service url
 * @param service service information with optional sap-client
 * @returns service url to be called for smartlinks config
 */
function getSmartLinksServiceUrl(service: ServiceConfig) {
    let appendUrl = Object.values(UrlParameters).join('&');
    if (service.client) {
        appendUrl = `${appendUrl}&sap-client=${service.client}`;
    }
    return `${service.url}${appendUrl}`;
}

/**
 * @description Sends a request to service and returns the result
 * @param service service to be used for request
 * @param credentials credentials for service
 * @param logger logger to report info to the user
 * @returns response from service
 */
export async function sendRequest(
    service: ServiceConfig,
    credentials?: AxiosBasicCredentials,
    logger?: ToolsLogger
): Promise<SystemDetailsResponse> {
    const httpsAgent = new HttpsAgent({ rejectUnauthorized: false });
    const axiosConfig = { baseUrl: service.url, auth: credentials, httpsAgent };
    const serviceUrl = getSmartLinksServiceUrl(service);
    try {
        logger?.info(`${cyan(t('info.connectTo'))} ${serviceUrl}`);
        const response = await axios.get(serviceUrl, axiosConfig);
        return response.data;
    } catch (error: any) {
        logger?.error(
            red(
                t('error.statusError', {
                    code: error.code,
                    status: error.response?.status,
                    message: error.response?.statusText
                })
            )
        );
        throw new Error(error);
    }
}

/**
 * @description checks if a connection to a system can be established
 * @param service service url and client
 * @param credentials optional credentials for service
 * @param logger logger to report info to the user
 * @returns boolean
 */
export async function checkConnection(
    service: ServiceConfig,
    credentials?: AxiosBasicCredentials,
    logger?: ToolsLogger
): Promise<boolean> {
    const status = await sendRequest({ url: service.url, client: service.client }, credentials, logger);
    return !!status;
}

/**
 * Get target information of deploy system to read smart links target configuration.
 * Following enhancement strategy is applied:
 *
 * ui5-deploy.yaml exists
 * -----------------------------
 * Find target information and send request to read smart links target configuration.
 *
 * ui5-deploy.yaml does not exist
 * -----------------------------
 * If ui5.yaml exists, find target information here and read smart links configuration.
 *
 * @param basePath - path to project root, where ui5-deploy.yaml or ui5.yaml is
 * @param logger - logger
 * @param fs - mem-fs reference to be used for file access
 */
export async function getServices(basePath: string, logger?: ToolsLogger, fs?: Editor): Promise<Service[]> {
    if (!fs) {
        fs = create(createStorage());
    }
    const services: Service[] = [];
    const ui5DeployConfig = await readUi5DeployConfig(fs, basePath, logger);
    if (ui5DeployConfig) {
        services.push({ ...ui5DeployConfig, source: FileName.UI5DeployYaml });
    } else {
        const ui5Config = await readUi5Config(fs, basePath, logger);
        if (ui5Config) {
            services.push(...ui5Config);
            services.forEach((service) => (service.source = FileName.Ui5Yaml));
        }
    }
    if (services.length === 0) {
        throw new Error(t('error.noServices', { targets: `(${FileName.UI5DeployYaml}, ${FileName.Ui5Yaml})` }));
    }
    return services;
}
