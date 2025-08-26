import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type * as AdmZip from 'adm-zip';
import axios, { type AxiosResponse } from 'axios';
import CFLocal = require('@sap/cf-tools/out/src/cf-local');

import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import type {
    Config,
    CFConfig,
    Space,
    Organization,
    CFApp,
    RequestArguments,
    Credentials,
    ServiceKeys,
    BusinessSeviceResource,
    AppParams,
    CFServiceOffering,
    CFAPIResponse
} from '../types';
import { t } from '../i18n';
import { downloadAppContent } from './html5-repo';
import { YamlUtils, getRouterType } from './yaml';
import { getApplicationType, isSupportedAppTypeForAdp } from '../source';
import { checkForCf, getAuthToken, getServiceInstanceKeys, requestCfApi } from './utils';

const HOMEDRIVE = 'HOMEDRIVE';
const HOMEPATH = 'HOMEPATH';
const WIN32 = 'win32';

interface FDCResponse {
    results: CFApp[];
}

/**
 * Validate the smart template application.
 *
 * @param {Manifest} manifest - The manifest.
 * @returns {Promise<string[]>} The messages.
 */
async function validateSmartTemplateApplication(manifest: Manifest): Promise<string[]> {
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

/**
 * Get the home directory.
 *
 * @returns {string} The home directory.
 */
function getHomedir() {
    let homedir = os.homedir();
    const homeDrive = process.env?.[HOMEDRIVE];
    const homePath = process.env?.[HOMEPATH];
    if (process.platform === WIN32 && typeof homeDrive === 'string' && typeof homePath === 'string') {
        homedir = path.join(homeDrive, homePath);
    }

    return homedir;
}

/**
 * Check if CF is installed.
 *
 * @returns {Promise<boolean>} True if CF is installed, false otherwise.
 */
export async function isCfInstalled(): Promise<boolean> {
    let isInstalled = true;
    try {
        await checkForCf();
    } catch (error) {
        isInstalled = false;
    }

    return isInstalled;
}

/**
 * Get the business service keys.
 *
 * @param {string} businessService - The business service.
 * @param {CFConfig} config - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<ServiceKeys | null>} The service keys.
 */
export async function getBusinessServiceKeys(
    businessService: string,
    config: CFConfig,
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
 * @param {CFConfig} cfConfig - The CF config.
 * @returns {RequestArguments} The request arguments.
 */
function getFDCRequestArguments(cfConfig: CFConfig): RequestArguments {
    const fdcUrl = 'https://ui5-flexibility-design-and-configuration.';
    const cfApiEndpoint = `https://api.cf.${cfConfig.url}`;
    const endpointParts = /https:\/\/api\.cf(?:\.([^-.]*)(-\d+)?(\.hana\.ondemand\.com)|(.*))/.exec(cfApiEndpoint);
    const options: any = {
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Determine the appropriate domain based on environment
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
 * Normalize the route regex.
 *
 * @param {string} value - The value.
 * @returns {RegExp} The normalized route regex.
 */
function normalizeRouteRegex(value: string): RegExp {
    return new RegExp(value.replace('^/', '^(/)*').replace('/(.*)$', '(/)*(.*)$'));
}

/**
 * Match the routes and data sources.
 *
 * @param {any} dataSources - The data sources.
 * @param {any} routes - The routes.
 * @param {any} serviceKeyEndpoints - The service key endpoints.
 * @returns {string[]} The messages.
 */
function matchRoutesAndDatasources(dataSources: any, routes: any, serviceKeyEndpoints: any): string[] {
    const messages: string[] = [];
    routes.forEach((route: any) => {
        if (route.endpoint && !serviceKeyEndpoints.includes(route.endpoint)) {
            messages.push(`Route endpoint '${route.endpoint}' doesn't match a corresponding OData endpoint`);
        }
    });

    Object.keys(dataSources).forEach((dataSourceName) => {
        if (!routes.some((route: any) => dataSources[dataSourceName].uri?.match(normalizeRouteRegex(route.source)))) {
            messages.push(`Data source '${dataSourceName}' doesn't match a corresponding route in xs-app.json routes`);
        }
    });
    return messages;
}

/**
 * Extract the xs-app.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {any} The xs-app.json.
 */
function extractXSApp(zipEntries: AdmZip.IZipEntry[]): any {
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

/**
 * Extract the manifest.json from the zip entries.
 *
 * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
 * @returns {Manifest | undefined} The manifest.
 */
function extractManifest(zipEntries: AdmZip.IZipEntry[]): Manifest | undefined {
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

/**
 * Get the app host ids.
 *
 * @param {Credentials[]} credentials - The credentials.
 * @returns {Set<string>} The app host ids.
 */
function getAppHostIds(credentials: Credentials[]): Set<string> {
    const appHostIds: string[] = [];
    credentials.forEach((credential) => {
        const appHostId = credential['html5-apps-repo']?.app_host_id;
        if (appHostId) {
            appHostIds.push(appHostId.split(',').map((item: any) => item.trim())); // there might be multiple appHostIds separated by comma
        }
    });

    // appHostIds is now an array of arrays of strings (from split)
    // Flatten the array and create a Set
    return new Set(appHostIds.flat());
}

/**
 * Get the spaces.
 *
 * @param {string} spaceGuid - The space guid.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<Space[]>} The spaces.
 */
export async function getSpaces(spaceGuid: string, logger: ToolsLogger): Promise<Space[]> {
    let spaces: Space[] = [];
    if (spaceGuid) {
        try {
            spaces = await CFLocal.cfGetAvailableSpaces(spaceGuid);
            logger?.log(`Available spaces: ${JSON.stringify(spaces)} for space guid: ${spaceGuid}.`);
        } catch (error) {
            logger?.error('Cannot get spaces');
        }
    } else {
        logger?.error('Invalid GUID');
    }

    return spaces;
}

export class FDCService {
    public html5RepoRuntimeGuid: string;
    public manifests: any[] = [];
    private CF_HOME = 'CF_HOME';
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

    public loadConfig(): void {
        let cfHome = process.env[this.CF_HOME];
        if (!cfHome) {
            cfHome = path.join(getHomedir(), this.CF_FOLDER_NAME);
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
        await getAuthToken();
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
        const appHostIds = getAppHostIds(credentials);
        this.logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);

        // Validate appHostIds array length (max 100 as per API specification)
        if (appHostIds.size > 100) {
            throw new Error(`Too many appHostIds provided. Maximum allowed is 100, but ${appHostIds.size} were found.`);
        }

        const appHostIdsArray = Array.from(appHostIds);

        try {
            const response = await this.getFDCApps(appHostIdsArray);

            if (response.status === 200) {
                // TODO: Remove this once the FDC API is updated to return the appHostId
                const apps = response.data.results.map((app) => ({ ...app, appHostId: appHostIdsArray[0] }));
                return this.processApps(apps, credentials, includeInvalid);
            } else {
                throw new Error(
                    `Failed to connect to Flexibility Design and Configuration service. Reason: HTTP status code ${response.status}: ${response.statusText}`
                );
            }
        } catch (error) {
            this.logger?.error(`Error in getBaseApps: ${error.message}`);

            // Create error apps for each appHostId and validate them to maintain original behavior
            const errorApps: CFApp[] = appHostIdsArray.map((appHostId) => ({
                appId: '',
                appName: '',
                appVersion: '',
                serviceName: '',
                title: '',
                appHostId,
                messages: [error.message]
            }));

            return this.processApps(errorApps, credentials, includeInvalid);
        }
    }

    /**
     * Process and validate apps, then filter based on includeInvalid flag.
     *
     * @param apps - Array of apps to process
     * @param credentials - Credentials for validation
     * @param includeInvalid - Whether to include invalid apps in the result
     * @returns Processed and filtered apps
     */
    private async processApps(apps: CFApp[], credentials: Credentials[], includeInvalid: boolean): Promise<CFApp[]> {
        const validatedApps = await this.getValidatedApps(apps, credentials);
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
        return getRouterType(YamlUtils.yamlContent);
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

    public async validateODataEndpoints(zipEntries: AdmZip.IZipEntry[], credentials: Credentials[]): Promise<string[]> {
        const messages: string[] = [];
        let xsApp, manifest;
        try {
            xsApp = extractXSApp(zipEntries);
            this.logger?.log(`ODATA endpoints: ${JSON.stringify(xsApp)}`);
        } catch (error) {
            messages.push(error.message);
            return messages;
        }

        try {
            manifest = extractManifest(zipEntries);
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
            messages.push(...matchRoutesAndDatasources(dataSources, routes, serviceKeyEndpoints));
        } else if (routes && !dataSources) {
            messages.push("Base app manifest.json doesn't contain data sources specified in xs-app.json");
        } else if (!routes && dataSources) {
            messages.push("Base app xs-app.json doesn't contain data sources routes specified in manifest.json");
        }
        return messages;
    }

    private async filterServices(businessServices: BusinessSeviceResource[]): Promise<string[]> {
        const serviceLabels = businessServices.map((service) => service.label).filter((label) => label);
        if (serviceLabels.length > 0) {
            const url = `/v3/service_offerings?names=${serviceLabels.join(',')}`;
            const json = await requestCfApi<CFAPIResponse<CFServiceOffering>>(url);
            this.logger?.log(`Filtering services. Request to: ${url}, result: ${JSON.stringify(json)}`);

            const businessServiceNames = new Set(businessServices.map((service) => service.label));
            const result: string[] = [];
            json?.resources?.forEach((resource: CFServiceOffering) => {
                if (businessServiceNames.has(resource.name)) {
                    const sapService = resource?.['broker_catalog']?.metadata?.sapservice;
                    if (sapService && ['v2', 'v4'].includes(sapService?.odataversion ?? '')) {
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

    private async getFDCApps(appHostIds: string[]): Promise<AxiosResponse<FDCResponse>> {
        const requestArguments = getFDCRequestArguments(this.cfConfig);
        this.logger?.log(
            `App Hosts: ${JSON.stringify(appHostIds)}, request arguments: ${JSON.stringify(requestArguments)}`
        );

        // Construct the URL with multiple appHostIds as separate query parameters
        // Format: ?appHostId=<id1>&appHostId=<id2>&appHostId=<id3>
        const appHostIdParams = appHostIds.map((id) => `appHostId=${encodeURIComponent(id)}`).join('&');
        const url = `${requestArguments.url}/api/business-service/discovery?${appHostIdParams}`;

        try {
            const isLoggedIn = await this.isLoggedIn();
            if (!isLoggedIn) {
                await CFLocal.cfGetAvailableOrgs();
                this.loadConfig();
            }
            const response = await axios.get<FDCResponse>(url, requestArguments.options);
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

    private async getValidatedApps(discoveryApps: CFApp[], credentials: Credentials[]): Promise<CFApp[]> {
        const validatedApps: CFApp[] = [];

        for (const app of discoveryApps) {
            if (!(app.messages && app.messages.length)) {
                const messages = await this.validateSelectedApp(app, credentials);
                app.messages = messages;
            }
            validatedApps.push(app);
        }

        return validatedApps;
    }

    private async validateSelectedApp(appParams: AppParams, credentials: Credentials[]): Promise<string[]> {
        try {
            const { entries, serviceInstanceGuid, manifest } = await downloadAppContent(
                this.cfConfig.space.GUID,
                appParams,
                this.logger
            );
            this.manifests.push(manifest);
            const messages = await validateSmartTemplateApplication(manifest);
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

    private async readMta(projectPath: string): Promise<string[]> {
        if (!projectPath) {
            throw new Error('Project path is missing.');
        }

        const mtaYamlPath = path.resolve(projectPath, this.MTA_YAML_FILE);
        return this.getResources([mtaYamlPath]);
    }

    private async getResources(files: string[]): Promise<string[]> {
        let finalList: string[] = [];

        for (const file of files) {
            const servicesList = this.getServicesForFile(file);
            const oDataFilteredServices = await this.filterServices(servicesList);
            finalList = finalList.concat(oDataFilteredServices);
        }

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
}
