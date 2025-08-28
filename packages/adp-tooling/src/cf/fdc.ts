import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import type { CFConfig, CFApp, Credentials, AppParams } from '../types';
import { downloadAppContent } from './html5-repo';
import { YamlUtils } from './yaml';
import { getAppHostIds } from './utils';
import type { CfConfigService } from './config';
import { readMta } from './mta';
import { validateODataEndpoints, validateSmartTemplateApplication } from './validation';
import { getFDCApps } from './api';

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
                return validateODataEndpoints(entries, credentials, this.logger);
            } else {
                return messages;
            }
        } catch (e) {
            return [e.message];
        }
    }
}
