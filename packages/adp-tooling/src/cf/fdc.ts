import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import type * as AdmZip from 'adm-zip';
import CFLocal = require('@sap/cf-tools/out/src/cf-local');

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import YamlUtils from './yaml';
import HTML5RepoUtils from './html5-repo';
import CFUtils from './utils';
import type {
    Config,
    CFConfig,
    Space,
    Organization,
    HttpResponse,
    CFApp,
    RequestArguments,
    Credentials,
    ServiceKeys,
    BusinessSeviceResource,
    AppParams
} from '../types';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getApplicationType, isSupportedAppTypeForAdp } from '../source';
import { t } from '../i18n';

export default class FDCService {
    public html5RepoRuntimeGuid: string;
    public manifests: any[] = [];
    private CF_HOME = 'CF_HOME';
    private WIN32 = 'win32';
    private HOMEDRIVE = 'HOMEDRIVE';
    private HOMEPATH = 'HOMEPATH';
    private BEARER_SPACE = 'bearer ';
    private CF_FOLDER_NAME = '.cf';
    private CONFIG_JSON_FILE = 'config.json';
    private API_CF = 'api.cf.';
    private OK = 'OK';
    private HTML5_APPS_REPO = 'html5-apps-repo';
    private MTA_YAML_FILE = 'mta.yaml';
    private cfConfig: CFConfig;
    private vscode: any;
    private logger: ToolsLogger;

    constructor(logger: ToolsLogger, vscode: any) {
        this.vscode = vscode;
        this.logger = logger;
    }

    public async isCfInstalled(): Promise<boolean> {
        let isInstalled = true;
        try {
            await CFUtils.checkForCf();
        } catch (error) {
            isInstalled = false;
        }

        return isInstalled;
    }

    public loadConfig(): void {
        let cfHome = process.env[this.CF_HOME];
        if (!cfHome) {
            cfHome = path.join(this.getHomedir(), this.CF_FOLDER_NAME);
        }

        const configFileLocation = path.join(cfHome, this.CONFIG_JSON_FILE);

        let config = {} as Config;
        try {
            const configAsString = fs.readFileSync(configFileLocation, 'utf-8');
            config = JSON.parse(configAsString) as Config;
        } catch (e) {
            this.logger?.error('Cannot receive token from config.json');
        }

        const API_CF = this.API_CF;
        if (config) {
            const result = {} as CFConfig;
            if (config.Target) {
                const apiCfIndex = config.Target.indexOf(API_CF);
                result.url = config.Target.substring(apiCfIndex + API_CF.length);
            }

            if (config.AccessToken) {
                result.token = config.AccessToken.substring(this.BEARER_SPACE.length);
            }

            if (config.OrganizationFields) {
                result.org = {
                    Name: config.OrganizationFields.Name,
                    GUID: config.OrganizationFields.GUID
                };
            }

            if (config.SpaceFields) {
                result.space = {
                    Name: config.SpaceFields.Name,
                    GUID: config.SpaceFields.GUID
                };
            }

            this.cfConfig = result;
            YamlUtils.spaceGuid = this.cfConfig?.space?.GUID;
        }
    }

    public async isLoggedIn(): Promise<boolean> {
        let isLogged = false;
        let orgs;
        await CFUtils.getAuthToken();
        this.loadConfig();
        if (this.cfConfig) {
            try {
                orgs = await CFLocal.cfGetAvailableOrgs();
                this.logger?.log(`Available organizations: ${JSON.stringify(orgs)}`);
                if (orgs.length > 0) {
                    isLogged = true;
                }
            } catch (e) {
                this.logger?.error(`Error occured while trying to check if it is logged in: ${e?.message}`);
                isLogged = false;
            }
        }

        return isLogged;
    }

    public async isExternalLoginEnabled(): Promise<boolean> {
        const commands = await this.vscode.commands.getCommands();

        return commands.includes('cf.login');
    }

    public async isLoggedInToDifferentSource(organizacion: string, space: string, apiurl: string): Promise<boolean> {
        const isLoggedIn = await this.isLoggedIn();
        const cfConfig = this.getConfig();
        const isLoggedToDifferentSource =
            isLoggedIn &&
            (cfConfig.org.Name !== organizacion || cfConfig.space.Name !== space || cfConfig.url !== apiurl);

        return isLoggedToDifferentSource;
    }

    public async login(username: string, password: string, apiEndpoint: string): Promise<boolean> {
        let isSuccessful = false;
        const loginResponse = await CFLocal.cfLogin(apiEndpoint, username, password);
        if (loginResponse === this.OK) {
            isSuccessful = true;
        } else {
            throw new Error('Login failed');
        }

        return isSuccessful;
    }

    public async getOrganizations(): Promise<Organization[]> {
        let organizations: Organization[] = [];
        try {
            organizations = await CFLocal.cfGetAvailableOrgs();
            this.logger?.log(`Available organizations: ${JSON.stringify(organizations)}`);
        } catch (error) {
            this.logger?.error('Cannot get organizations');
        }

        return organizations;
    }

    public async getSpaces(spaceGuid: string): Promise<Space[]> {
        let spaces: Space[] = [];
        if (spaceGuid) {
            try {
                spaces = await CFLocal.cfGetAvailableSpaces(spaceGuid);
                this.logger?.log(`Available spaces: ${JSON.stringify(spaces)} for space guid: ${spaceGuid}.`);
            } catch (error) {
                this.logger?.error('Cannot get spaces');
            }
        } else {
            this.logger?.error('Invalid GUID');
        }

        return spaces;
    }

    public async setOrgSpace(orgName: string, spaceName: string): Promise<void> {
        if (!orgName || !spaceName) {
            throw new Error('Organization or space name is not provided.');
        }

        await CFLocal.cfSetOrgSpace(orgName, spaceName);
        this.loadConfig();
    }

    public async getServices(projectPath: string): Promise<string[]> {
        const services = await this.readMta(projectPath);
        this.logger?.log(`Available services defined in mta.yaml: ${JSON.stringify(services)}`);
        return services;
    }

    public async getBaseApps(credentials: Credentials[], includeInvalid = false): Promise<CFApp[]> {
        const appHostIds = this.getAppHostIds(credentials);
        this.logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);
        const discoveryApps = await Promise.all(
            Array.from(appHostIds).map(async (appHostId: string) => {
                try {
                    const response = await this.getFDCApps(appHostId);
                    if (response.status === 200) {
                        const results = (response.data as any)?.['results'] as CFApp[];
                        results.forEach((result) => (result.appHostId = appHostId)); // store appHostId in order to know by which appHostId was the app selected
                        return results;
                    }
                    throw new Error(
                        `Failed to connect to Flexibility Design and Configuration service for app_host_id ${appHostId}. Reason: HTTP status code ${response.status.toString()}: ${
                            response.statusText
                        }`
                    );
                } catch (error) {
                    return [{ appHostId: appHostId, messages: [error.message] }];
                }
            })
        ).then((results) => results.flat());

        const validatedApps = await this.getValidatedApps(discoveryApps, credentials);
        return includeInvalid ? validatedApps : validatedApps.filter((app) => !app.messages?.length);
    }

    public hasApprouter(projectName: string, moduleNames: string[]): boolean {
        return moduleNames.some(
            (name) =>
                name === `${projectName.toLowerCase()}-destination-content` ||
                name === `${projectName.toLowerCase()}-approuter`
        );
    }

    public getManifestByBaseAppId(appId: string) {
        return this.manifests.find((appManifest) => {
            return appManifest['sap.app'].id === appId;
        });
    }

    public getApprouterType(): string {
        return YamlUtils.getRouterType();
    }

    public getModuleNames(mtaProjectPath: string): string[] {
        YamlUtils.loadYamlContent(path.join(mtaProjectPath, this.MTA_YAML_FILE));
        return YamlUtils.yamlContent?.modules?.map((module: { name: any }) => module.name) || [];
    }

    public formatDiscovery(app: any): string {
        return `${app.title} (${app.appId} ${app.appVersion})`;
    }

    public getConfig(): CFConfig {
        return this.cfConfig;
    }

    public async getBusinessServiceKeys(businessService: string): Promise<ServiceKeys | null> {
        const serviceKeys = await CFUtils.getServiceInstanceKeys(
            {
                spaceGuids: [this.getConfig().space.GUID],
                names: [businessService]
            },
            this.logger
        );
        this.logger?.log(`Available service key instance : ${JSON.stringify(serviceKeys?.serviceInstance)}`);
        return serviceKeys;
    }

    public async validateODataEndpoints(zipEntries: AdmZip.IZipEntry[], credentials: Credentials[]): Promise<string[]> {
        const messages: string[] = [];
        let xsApp, manifest;
        try {
            xsApp = this.extractXSApp(zipEntries);
            this.logger?.log(`ODATA endpoints: ${JSON.stringify(xsApp)}`);
        } catch (error) {
            messages.push(error.message);
            return messages;
        }

        try {
            manifest = this.extractManifest(zipEntries);
            this.logger?.log(`Extracted manifest: ${JSON.stringify(manifest)}`);
        } catch (error) {
            messages.push(error.message);
            return messages;
        }

        const dataSources = manifest?.['sap.app']?.dataSources;
        const routes = (xsApp as any)?.routes;
        if (dataSources && routes) {
            const serviceKeyEndpoints = ([] as string[]).concat(
                ...credentials.map((item) => (item.endpoints ? Object.keys(item.endpoints) : []))
            );
            messages.push(...this.matchRoutesAndDatasources(dataSources, routes, serviceKeyEndpoints));
        } else if (routes && !dataSources) {
            messages.push("Base app manifest.json doesn't contain data sources specified in xs-app.json");
        } else if (!routes && dataSources) {
            messages.push("Base app xs-app.json doesn't contain data sources routes specified in manifest.json");
        }
        return messages;
    }

    private extractXSApp(zipEntries: AdmZip.IZipEntry[]) {
        let xsApp;
        zipEntries.forEach((item) => {
            if (item.entryName.endsWith('xs-app.json')) {
                try {
                    xsApp = JSON.parse(item.getData().toString('utf8'));
                } catch (e) {
                    throw new Error(`Failed to parse xs-app.json. Reason: ${e.message}`);
                }
            }
        });
        return xsApp;
    }

    private extractManifest(zipEntries: AdmZip.IZipEntry[]): Manifest | undefined {
        let manifest: Manifest | undefined;
        zipEntries.forEach((item) => {
            if (item.entryName.endsWith('manifest.json')) {
                try {
                    manifest = JSON.parse(item.getData().toString('utf8'));
                } catch (e) {
                    throw new Error(`Failed to parse manifest.json. Reason: ${e.message}`);
                }
            }
        });
        return manifest;
    }

    private matchRoutesAndDatasources(dataSources: any, routes: any, serviceKeyEndpoints: any): string[] {
        const messages: string[] = [];
        routes.forEach((route: any) => {
            if (route.endpoint && !serviceKeyEndpoints.includes(route.endpoint)) {
                messages.push(`Route endpoint '${route.endpoint}' doesn't match a corresponding OData endpoint`);
            }
        });

        Object.keys(dataSources).forEach((dataSourceName) => {
            if (
                !routes.some((route: any) =>
                    dataSources[dataSourceName].uri?.match(this.normalizeRouteRegex(route.source))
                )
            ) {
                messages.push(
                    `Data source '${dataSourceName}' doesn't match a corresponding route in xs-app.json routes`
                );
            }
        });
        return messages;
    }

    private getAppHostIds(credentials: Credentials[]): Set<string> {
        const appHostIds: string[] = [];
        credentials.forEach((credential) => {
            const appHostId = credential[this.HTML5_APPS_REPO]?.app_host_id;
            if (appHostId) {
                appHostIds.push(appHostId.split(',').map((item: any) => item.trim())); // there might be multiple appHostIds separated by comma
            }
        });

        // appHostIds is now an array of arrays of strings (from split)
        // Flatten the array and create a Set
        return new Set(appHostIds.flat());
    }

    private async filterServices(businessServices: BusinessSeviceResource[]): Promise<string[]> {
        const serviceLabels = businessServices.map((service) => service.label).filter((label) => label);
        if (serviceLabels.length > 0) {
            const url = `/v3/service_offerings?names=${serviceLabels.join(',')}`;
            const json = await CFUtils.requestCfApi(url);
            this.logger?.log(`Filtering services. Request to: ${url}, result: ${JSON.stringify(json)}`);

            const businessServiceNames = new Set(businessServices.map((service) => service.label));
            const result: string[] = [];
            json.resources.forEach((resource: any) => {
                if (businessServiceNames.has(resource.name)) {
                    const sapService = resource?.['broker_catalog']?.metadata?.sapservice;
                    if (sapService && ['v2', 'v4'].includes(sapService.odataversion)) {
                        result.push(businessServices?.find((service) => resource.name === service.label)?.name ?? '');
                    } else {
                        this.logger?.log(`Service '${resource.name}' doesn't support V2/V4 Odata and will be ignored`);
                    }
                }
            });

            if (result.length > 0) {
                return result;
            }
        }
        throw new Error(`No business services found, please specify the business services in resource section of mts.yaml:
        - name: <arbitrary name of resource, e.g. my_service>
            type: org.cloudfoundry.<managed|existing>-service
            parameters:
            service: <business service name, e.g. my-service-name>
            service-name: <business service instance name, e.g. my_service_instance_name>
            service-plan: <plan name, e.g. standard>`);
    }

    public normalizeRouteRegex(value: string) {
        return new RegExp(value.replace('^/', '^(/)*').replace('/(.*)$', '(/)*(.*)$'));
    }

    public getFDCRequestArguments(): RequestArguments {
        const cfConfig = this.getConfig();
        const fdcUrl = 'https://ui5-flexibility-design-and-configuration.';
        const cfApiEndpoint = `https://api.cf.${cfConfig.url}`;
        const endpointParts = /https:\/\/api\.cf(?:\.([^-.]*)(-\d+)?(\.hana\.ondemand\.com)|(.*))/.exec(cfApiEndpoint);
        const options: any = {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        // Public cloud
        let url = `${fdcUrl}cert.cfapps.${endpointParts?.[1]}.hana.ondemand.com`;
        if (!endpointParts?.[3]) {
            // Private cloud - if hana.ondemand.com missing as a part of CF api endpotint
            url = `${fdcUrl}sapui5flex.cfapps${endpointParts?.[4]}`;
            if (endpointParts?.[4]?.endsWith('.cn')) {
                // China has a special URL pattern
                const parts = endpointParts?.[4]?.split('.');
                parts.splice(2, 0, 'apps');
                url = `${fdcUrl}sapui5flex${parts.join('.')}`;
            }
        }
        if (!isAppStudio() || !endpointParts?.[3]) {
            // Adding authorization token for none BAS enviourment and
            // for private cloud as a temporary solution until enablement of cert auth
            options.headers['Authorization'] = `Bearer ${cfConfig.token}`;
        }
        return {
            url: url,
            options
        };
    }

    private async getFDCApps(appHostId: string): Promise<HttpResponse> {
        const requestArguments = this.getFDCRequestArguments();
        this.logger?.log(`App Host: ${appHostId}, request arguments: ${JSON.stringify(requestArguments)}`);
        const url = `${requestArguments.url}/api/business-service/discovery?appHostId=${appHostId}`;

        try {
            const isLoggedIn = await this.isLoggedIn();
            if (!isLoggedIn) {
                await CFLocal.cfGetAvailableOrgs();
                this.loadConfig();
            }
            const response = await axios.get(url, requestArguments.options);
            this.logger?.log(
                `Getting FDC apps. Request url: ${url} response status: ${
                    response.status
                }, response data: ${JSON.stringify(response.data)}`
            );
            return response;
        } catch (e) {
            this.logger?.error(
                `Getting FDC apps. Request url: ${url}, response status: ${e?.response?.status}, message: ${
                    e.message || e
                }`
            );
            throw new Error(
                `Failed to get application from Flexibility Design and Configuration service ${url}. Reason: ${
                    e.message || e
                }`
            );
        }
    }

    private async getValidatedApps(discoveryApps: any[], credentials: any): Promise<CFApp[]> {
        const validatedApps: any[] = [];
        await Promise.all(
            discoveryApps.map(async (app) => {
                if (!(app.messages && app.messages.length)) {
                    const messages = await this.validateSelectedApp(app, credentials);
                    app.messages = messages;
                }
                validatedApps.push(app);
            })
        );
        return validatedApps;
    }

    private async validateSelectedApp(appParams: AppParams, credentials: any): Promise<string[]> {
        try {
            const { entries, serviceInstanceGuid, manifest } = await HTML5RepoUtils.downloadAppContent(
                this.cfConfig.space.GUID,
                appParams,
                this.logger
            );
            this.manifests.push(manifest);
            const messages = await this.validateSmartTemplateApplication(manifest);
            this.html5RepoRuntimeGuid = serviceInstanceGuid;
            if (messages?.length === 0) {
                return this.validateODataEndpoints(entries, credentials);
            } else {
                return messages;
            }
        } catch (e) {
            return [e.message];
        }
    }

    public async validateSmartTemplateApplication(manifest: Manifest): Promise<string[]> {
        const messages: string[] = [];
        const appType = getApplicationType(manifest);

        if (isSupportedAppTypeForAdp(appType)) {
            if (manifest['sap.ui5'] && manifest['sap.ui5'].flexEnabled === false) {
                return messages.concat(t('error.appDoesNotSupportFlexibility'));
            }
        } else {
            return messages.concat(
                "Select a different application. Adaptation project doesn't support the selected application."
            );
        }
        return messages;
    }

    private async readMta(projectPath: string): Promise<string[]> {
        if (!projectPath) {
            throw new Error('Project path is missing.');
        }

        const mtaYamlPath = path.resolve(projectPath, this.MTA_YAML_FILE);
        return this.getResources([mtaYamlPath]);
    }

    private async getResources(files: string[]): Promise<string[]> {
        let finalList: string[] = [];

        await Promise.all(
            files.map(async (file) => {
                const servicesList = this.getServicesForFile(file);
                const oDataFilteredServices = await this.filterServices(servicesList);
                finalList = finalList.concat(oDataFilteredServices);
            })
        );

        return finalList;
    }

    private getServicesForFile(file: string): BusinessSeviceResource[] {
        const serviceNames: BusinessSeviceResource[] = [];
        YamlUtils.loadYamlContent(file);
        const parsed = YamlUtils.yamlContent;
        if (parsed && parsed.resources && Array.isArray(parsed.resources)) {
            parsed.resources.forEach((resource: any) => {
                const name = resource?.['parameters']?.['service-name'] || resource.name;
                const label = resource?.['parameters']?.service;
                if (name) {
                    serviceNames.push({ name, label });
                    if (!label) {
                        this.logger?.log(`Service '${name}' will be ignored without 'service' parameter`);
                    }
                }
            });
        }
        return serviceNames;
    }

    private getHomedir() {
        let homedir = os.homedir();
        const homeDrive = process.env?.[this.HOMEDRIVE];
        const homePath = process.env?.[this.HOMEPATH];
        if (process.platform === this.WIN32 && typeof homeDrive === 'string' && typeof homePath === 'string') {
            homedir = path.join(homeDrive, homePath);
        }

        return homedir;
    }
}
