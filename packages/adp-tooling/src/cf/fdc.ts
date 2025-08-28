import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { YamlUtils } from './project/yaml';
import type { CfConfigService } from './core/config';
import type { CFConfig, CFApp, Credentials } from '../types';
import { filterCfApps, discoverCfApps, AppContentService, AppValidationService } from './app';

/**
 * FDC Service - Orchestrates app discovery, content downloading, and validation.
 */
export class FDCService {
    /**
     * The CF config.
     */
    private cfConfig: CFConfig;
    /**
     * The app content service.
     */
    private appContent: AppContentService;
    /**
     * The app validation service.
     */
    private appValidation: AppValidationService;

    /**
     * Creates an instance of FDCService.
     *
     * @param {ToolsLogger} logger - The logger.
     * @param {CfConfigService} cfConfigService - The CF config service.
     */
    constructor(private logger: ToolsLogger, private cfConfigService: CfConfigService) {
        this.cfConfig = cfConfigService.getConfig();

        this.appContent = new AppContentService(logger);
        this.appValidation = new AppValidationService(logger, this.appContent);

        if (this.cfConfig) {
            YamlUtils.spaceGuid = this.cfConfig.space.GUID;
        }
    }

    /**
     * Get the base apps.
     *
     * @param {Credentials[]} credentials - The credentials.
     * @param {boolean} [includeInvalid] - Whether to include invalid apps.
     * @returns {Promise<CFApp[]>} The base apps.
     */
    public async getBaseApps(credentials: Credentials[], includeInvalid: boolean = false): Promise<CFApp[]> {
        const cfConfig = this.cfConfigService.getConfig();

        const apps = await discoverCfApps(credentials, cfConfig, this.logger);

        const validatedApps = await this.appValidation.getValidatedApps(apps, credentials, cfConfig);

        return filterCfApps(validatedApps, includeInvalid);
    }

    /**
     * Get the manifest by base app id.
     *
     * @param {string} appId - The app id.
     * @returns {Manifest | undefined} The manifest.
     */
    public getManifestByBaseAppId(appId: string): Manifest | undefined {
        return this.appContent.getManifestByBaseAppId(appId);
    }

    /**
     * Get the HTML5 repo runtime GUID.
     *
     * @returns {string} The runtime GUID.
     */
    public getHtml5RepoRuntimeGuid(): string {
        return this.appContent.getHtml5RepoRuntimeGuid();
    }
}
