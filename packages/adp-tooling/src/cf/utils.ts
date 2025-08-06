import fs from 'fs';
import path from 'path';
import CFLocal = require('@sap/cf-tools/out/src/cf-local');
import CFToolsCli = require('@sap/cf-tools/out/src/cli');
import { eFilters } from '@sap/cf-tools/out/src/types';

import YamlUtils from './yaml';
import type { ToolsLogger } from '@sap-ux/logger';
import type { GetServiceInstanceParams, ServiceKeys, ServiceInstance } from '../types';

export default class CFUtils {
    private static ENV = { env: { 'CF_COLOR': 'false' } };
    private static CREATE_SERVICE_KEY = 'create-service-key';

    public static async getServiceInstanceKeys(
        serviceInstanceQuery: GetServiceInstanceParams,
        logger: ToolsLogger
    ): Promise<ServiceKeys | null> {
        try {
            const serviceInstances = await this.getServiceInstance(serviceInstanceQuery);
            if (serviceInstances?.length > 0) {
                // we can use any instance in the list to connect to HTML5 Repo
                logger?.log(`Use '${serviceInstances[0].name}' HTML5 Repo instance`);
                return {
                    credentials: await this.getOrCreateServiceKeys(serviceInstances[0], logger),
                    serviceInstance: serviceInstances[0]
                };
            }
            return null;
        } catch (e) {
            // const errorMessage = Messages.FAILED_TO_GET_SERVICE_INSTANCE_KEYS(error.message);
            const errorMessage = `Failed to get service instance keys. Reason: ${e.message}`;
            logger?.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    public static async createService(
        spaceGuid: string,
        plan: string,
        serviceInstanceName: string,
        logger: ToolsLogger,
        tags: string[] = [],
        securityFilePath: string | null = null,
        serviceName: string | null = null
    ): Promise<void> {
        try {
            if (!serviceName) {
                const json = await this.requestCfApi(`/v3/service_offerings?per_page=1000&space_guids=${spaceGuid}`);
                serviceName = json.resources.find(
                    (resource: any) => resource.tags && tags.every((tag) => resource.tags.includes(tag))
                ).name;
            }

            logger?.log(
                `Creating service instance '${serviceInstanceName}' of service '${serviceName}' with '${plan}' plan`
            );
            const commandParameters: string[] = ['create-service', serviceName ?? '', plan, serviceInstanceName];
            if (securityFilePath) {
                let xsSecurity = null;
                try {
                    const filePath = path.resolve(__dirname, '../templates/cf/xs-security.json');
                    const xsContent = fs.readFileSync(filePath, 'utf-8');
                    xsSecurity = JSON.parse(xsContent);
                    xsSecurity.xsappname = YamlUtils.getProjectNameForXsSecurity();
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
            // const errorMessage = Messages.FAILED_TO_CREATE_SERVICE_INSTANCE(serviceInstanceName, spaceGuid, e.message);
            const errorMessage = `Cannot create a service instance '${serviceInstanceName}' in space '${spaceGuid}'. Reason: ${e.message}`;
            logger?.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    public static async requestCfApi(url: string) {
        try {
            const response = await CFToolsCli.Cli.execute(['curl', url], this.ENV);
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

    public static async getAuthToken(): Promise<string> {
        const response = await CFToolsCli.Cli.execute(['oauth-token'], this.ENV);
        if (response.exitCode === 0) {
            return response.stdout;
        }
        return response.stderr;
    }

    public static async checkForCf(): Promise<void> {
        try {
            const response = await CFToolsCli.Cli.execute(['version'], this.ENV);
            if (response.exitCode !== 0) {
                throw new Error(response.stderr);
            }
        } catch (error) {
            // log error: CFUtils.ts=>checkForCf
            throw new Error('Cloud Foundry is not installed in your space.');
        }
    }

    public static async cFLogout(): Promise<void> {
        await CFToolsCli.Cli.execute(['logout']);
    }

    private static async getServiceInstance(params: GetServiceInstanceParams): Promise<ServiceInstance[]> {
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
            const json = await this.requestCfApi(uri);
            if (json && json.resources && Array.isArray(json.resources)) {
                return json.resources.map((service: any) => ({
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

    private static async getOrCreateServiceKeys(serviceInstance: ServiceInstance, logger: ToolsLogger) {
        try {
            const credentials = await this.getServiceKeys(serviceInstance.guid);
            if (credentials?.length > 0) {
                return credentials;
            } else {
                const serviceKeyName = serviceInstance.name + '_key';
                logger?.log(`Creating service key '${serviceKeyName}' for service instance '${serviceInstance.name}'`);
                await this.createServiceKey(serviceInstance.name, serviceKeyName);
                return this.getServiceKeys(serviceInstance.guid);
            }
        } catch (e) {
            // log error: CFUtils.ts=>getOrCreateServiceKeys with param
            throw new Error(
                `Failed to get or create service keys for instance name ${serviceInstance.name}. Reason: ${e.message}`
            );
        }
    }

    private static async getServiceKeys(serviceInstanceGuid: string): Promise<any> {
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

    private static async createServiceKey(serviceInstanceName: string, serviceKeyName: any) {
        try {
            const cliResult = await CFToolsCli.Cli.execute(
                [this.CREATE_SERVICE_KEY, serviceInstanceName, serviceKeyName],
                this.ENV
            );
            if (cliResult.exitCode !== 0) {
                throw new Error(cliResult.stderr);
            }
        } catch (e) {
            // log error: CFUtils.ts=>createServiceKey for serviceInstanceName
            throw new Error(
                `Failed to create service key for instance name ${serviceInstanceName}. Reason: ${e.message}`
            );
        }
    }
}
