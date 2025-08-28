import type * as AdmZip from 'adm-zip';
import axios, { type AxiosResponse } from 'axios';
import CFLocal = require('@sap/cf-tools/out/src/cf-local');

import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import type { CFConfig, CFApp, RequestArguments, Credentials, ServiceKeys, AppParams } from '../types';
import { t } from '../i18n';
import { downloadAppContent } from './html5-repo';
import { YamlUtils } from './yaml';
import { getApplicationType, isSupportedAppTypeForAdp } from '../source';
import { getServiceInstanceKeys } from './utils';
import { isLoggedInCf } from './auth';
import type { CfConfigService } from './config';
import { readMta } from './mta';

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
                manifest = JSON.parse(item.getData().toString('utf8')) as Manifest;
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
            appHostIds.push(appHostId.split(',').map((item: string) => item.trim())); // there might be multiple appHostIds separated by comma
        }
    });

    // appHostIds is now an array of arrays of strings (from split)
    // Flatten the array and create a Set
    return new Set(appHostIds.flat());
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
 * Get the FDC apps.
 *
 * @param {string[]} appHostIds - The app host ids.
 * @param {CFConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<AxiosResponse<FDCResponse>>} The FDC apps.
 */
export async function getFDCApps(
    appHostIds: string[],
    cfConfig: CFConfig,
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
 * The FDC service.
 */
export class FDCService {
    /**
     * The HTML5 repo runtime GUID.
     */
    public html5RepoRuntimeGuid: string;
    /**
     * The apps' manifests.
     */
    public manifests: Manifest[] = [];
    /**
     * The CF config service.
     */
    private cfConfigService: CfConfigService;
    /**
     * The CF config.
     */
    private cfConfig: CFConfig;
    /**
     * The logger.
     */
    private logger: ToolsLogger;

    /**
     * Creates an instance of FDCService.
     *
     * @param {ToolsLogger} logger - The logger.
     * @param {CfConfigService} cfConfigService - The CF config service.
     */
    constructor(logger: ToolsLogger, cfConfigService: CfConfigService) {
        this.logger = logger;
        this.cfConfigService = cfConfigService;
        this.cfConfig = cfConfigService.getConfig();
        if (this.cfConfig) {
            YamlUtils.spaceGuid = this.cfConfig.space.GUID;
        }
    }

    /**
     * Get the services for the project.
     *
     * @param {string} projectPath - The path to the project.
     * @returns {Promise<string[]>} The services.
     */
    public async getServices(projectPath: string): Promise<string[]> {
        const services = await readMta(projectPath, this.logger);
        this.logger?.log(`Available services defined in mta.yaml: ${JSON.stringify(services)}`);
        return services;
    }

    /**
     * Get the base apps.
     *
     * @param {Credentials[]} credentials - The credentials.
     * @param {boolean} [includeInvalid] - Whether to include invalid apps.
     * @returns {Promise<CFApp[]>} The base apps.
     */
    public async getBaseApps(credentials: Credentials[], includeInvalid = false): Promise<CFApp[]> {
        const appHostIds = getAppHostIds(credentials);
        this.logger?.log(`App Host Ids: ${JSON.stringify(appHostIds)}`);

        // Validate appHostIds array length (max 100 as per API specification)
        if (appHostIds.size > 100) {
            throw new Error(`Too many appHostIds provided. Maximum allowed is 100, but ${appHostIds.size} were found.`);
        }

        const appHostIdsArray = Array.from(appHostIds);

        try {
            const cfConfig = this.cfConfigService.getConfig();
            const response = await getFDCApps(appHostIdsArray, cfConfig, this.logger);

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

    /**
     * Get the manifest by base app id.
     *
     * @param {string} appId - The app id.
     * @returns {Manifest | undefined} The manifest.
     */
    public getManifestByBaseAppId(appId: string): Manifest | undefined {
        return this.manifests.find((appManifest) => {
            return appManifest['sap.app'].id === appId;
        });
    }

    /**
     * Validate the OData endpoints.
     *
     * @param {AdmZip.IZipEntry[]} zipEntries - The zip entries.
     * @param {Credentials[]} credentials - The credentials.
     * @returns {Promise<string[]>} The messages.
     */
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

    /**
     * Get the validated apps.
     *
     * @param {CFApp[]} discoveryApps - The discovery apps.
     * @param {Credentials[]} credentials - The credentials.
     * @returns {Promise<CFApp[]>} The validated apps.
     */
    private async getValidatedApps(discoveryApps: CFApp[], credentials: Credentials[]): Promise<CFApp[]> {
        const validatedApps: CFApp[] = [];

        for (const app of discoveryApps) {
            if (!app.messages?.length) {
                const messages = await this.validateSelectedApp(app, credentials);
                app.messages = messages;
            }
            validatedApps.push(app);
        }

        return validatedApps;
    }

    /**
     * Validate the selected app.
     *
     * @param {AppParams} appParams - The app parameters.
     * @param {Credentials[]} credentials - The credentials.
     * @returns {Promise<string[]>} The messages.
     */
    private async validateSelectedApp(appParams: AppParams, credentials: Credentials[]): Promise<string[]> {
        try {
            const cfConfig = this.cfConfigService.getConfig();
            const { entries, serviceInstanceGuid, manifest } = await downloadAppContent(
                cfConfig.space.GUID,
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
}
