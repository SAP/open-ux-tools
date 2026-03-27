import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import type { IManifestService, DataSources } from '../../types';
import { runBuild } from '../../base/project-builder';
import { t } from '../../i18n';

/** Default build output folder used by CF ADP projects. */
const CF_BUILD_PATH = 'dist';

/**
 * Service class for handling operations related to the manifest of a CF-deployed UI5 application.
 * Extends the ABAP {@link ManifestService} API, but retrieves the manifest from the local
 * build output (`dist/`)
 *
 * The build is triggered automatically during initialization so that the `dist/` folder
 * contains the latest merged manifest before it is read.
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
     * Creates an instance of the ManifestServiceCF by building the project and
     * reading the manifest from the `dist/` folder.
     *
     * @param projectPath - The path to the adaptation project.
     * @param logger - The logger instance.
     * @returns A promise that resolves to an instance of ManifestServiceCF.
     */
    public static async init(projectPath: string, logger: ToolsLogger): Promise<ManifestServiceCF> {
        const service = new ManifestServiceCF(logger);

        logger.debug('Triggering project build to generate dist folder');
        await runBuild(projectPath);

        const manifestPath = join(projectPath, CF_BUILD_PATH, 'manifest.json');
        logger.debug(`Reading manifest from '${manifestPath}'`);
        const manifestContent = readFileSync(manifestPath, 'utf-8');
        service.manifest = JSON.parse(manifestContent) as Manifest;
        logger.debug('Manifest successfully read from dist folder');

        return service;
    }

    /**
     * Returns the manifest read from the build output during initialization.
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
