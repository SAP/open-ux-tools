import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import type { IManifestService, DataSources } from '../../types';
import { getAppParamsFromUI5Yaml } from '../project/yaml';
import { downloadAppContent } from '../app/html5-repo';
import { t } from '../../i18n';

/**
 * Service class for handling operations related to the manifest of a CF-deployed UI5 application.
 * Mirrors the ABAP {@link ManifestService} API, but retrieves the manifest from the HTML5 Repository
 * instead of using an ABAP service provider.
 */
export class ManifestServiceCF implements IManifestService {
    private manifest: Manifest;

    /**
     * Private constructor to initialize the ManifestServiceCF.
     *
     * @param logger - The logger instance.
     */
    private constructor(private readonly logger: ToolsLogger) {}

    /**
     * Creates an instance of the ManifestServiceCF by downloading the manifest
     * from the CF HTML5 Repository.
     *
     * @param projectPath - The path to the adaptation project.
     * @param logger - The logger instance.
     * @returns A promise that resolves to an instance of ManifestServiceCF.
     */
    public static async init(projectPath: string, logger: ToolsLogger): Promise<ManifestServiceCF> {
        const service = new ManifestServiceCF(logger);
        const appParams = getAppParamsFromUI5Yaml(projectPath);
        logger.debug(`Downloading manifest from HTML5 Repository for app '${appParams.appName}'`);
        const appContent = await downloadAppContent(appParams.spaceGuid, appParams, logger);
        service.manifest = appContent.manifest;
        logger.debug('Manifest successfully downloaded from HTML5 Repository');

        return service;
    }

    /**
     * Returns the manifest fetched from the HTML5 Repository during initialization.
     *
     * @returns The current manifest.
     */
    public getManifest(): Manifest {
        return this.manifest;
    }

    /**
     * Returns the data sources from the manifest.
     *
     * @returns The data sources from the manifest.
     * @throws Error if no data sources are found in the manifest.
     */
    public getManifestDataSources(): DataSources {
        const dataSources = this.manifest['sap.app'].dataSources;
        if (!dataSources) {
            throw new Error('No data sources found in the manifest');
        }
        this.logger.debug(`Found ${Object.keys(dataSources).length} data source(s) in manifest`);
        return dataSources;
    }

    /**
     * Metadata fetching is not supported for CF projects because there is no ABAP service provider
     * to proxy the OData metadata request. Consumers should handle this gracefully.
     *
     * @param _dataSourceId - The ID of the data source (unused).
     * @throws Error indicating metadata fetching is not supported for CF projects.
     */
    public async getDataSourceMetadata(_dataSourceId: string): Promise<string> {
        const message = t('error.metadataFetchingNotSupportedForCF');
        this.logger.warn(message);
        throw new Error(message);
    }
}
