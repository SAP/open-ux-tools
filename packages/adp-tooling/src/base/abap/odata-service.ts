import type { Logger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { AbapServiceProvider, Ui5AppInfoContent } from '@sap-ux/axios-extension';

import { fetchMetadata, fetchFallbackMetadata } from './metadata-fetchers';

type DataSources = Record<string, ManifestNamespace.DataSource>;

/**
 * Retrieves all data sources from the manifest.
 *
 * @param {Manifest} manifest - The UI5 manifest object.
 * @returns {DataSources} The data sources from the manifest.
 * @throws Error if no data sources are found in the manifest.
 */
export function getDataSources(manifest: Manifest): DataSources {
    const dataSources = manifest?.['sap.app']?.dataSources;
    if (!dataSources) {
        throw new Error('No data sources found in the manifest');
    }
    return dataSources;
}

/**
 * Retrieves a specific data source by ID from the manifest.
 *
 * @param {Manifest} manifest - The UI5 manifest object.
 * @param {string} dataSourceId - The ID of the data source to retrieve.
 * @returns {ManifestNamespace.DataSource} The corresponding data source object.
 * @throws Error if the data source ID is not found in the manifest.
 */
export function getDataSourceById(manifest: Manifest, dataSourceId: string): ManifestNamespace.DataSource {
    const dataSources = getDataSources(manifest);
    const dataSource = dataSources?.[dataSourceId];
    if (!dataSource) {
        throw new Error(`Data source '${dataSourceId}' was not found in the manifest.`);
    }
    return dataSource;
}

/**
 * Class responsible for making calls to get the metadata of a specific data source.
 */
export class ODataService {
    /**
     * The constructor requires all objects needed for metadata fetching:
     * - An already-loaded manifest (or partial manifest focusing on dataSources).
     * - The AbapServiceProvider for making requests.
     * - appInfo containing the base URL.
     * - The logger.
     */
    constructor(
        private readonly manifest: Manifest,
        private readonly appInfo: Ui5AppInfoContent,
        private readonly provider: AbapServiceProvider,
        private readonly logger: Logger
    ) {}

    /**
     * A helper to build the base URL used by fetchMetadata/fetchFallbackMetadata.
     *
     * @returns {URL} The built base url.
     */
    private buildBaseUrl(): URL {
        return new URL(this.appInfo.url, this.provider.defaults.baseURL as string);
    }

    /**
     * Fetches the main OData metadata for a given data source ID from the manifest.
     *
     * @param {string} dataSourceId - The ID of the data source in the manifest.
     * @returns {Promise<string>} The metadata as a string.
     */
    public async getMetadata(dataSourceId: string): Promise<string> {
        const dataSource = getDataSourceById(this.manifest, dataSourceId);
        const baseUrl = this.buildBaseUrl();

        this.logger.debug(`Fetching remote metadata for data source '${dataSourceId}'`);
        return fetchMetadata(dataSource, baseUrl, this.provider, this.logger);
    }

    /**
     * Fetch OData metadata for a given data source ID, with fallback to localUri if the remote fails.
     *
     * @param {string} dataSourceId - The ID of the data source in the manifest.
     * @returns The metadata as a string.
     * @throws Error if neither remote nor fallback metadata can be fetched.
     */
    public async getMetadataWithFallback(dataSourceId: string): Promise<string> {
        const dataSource = getDataSourceById(this.manifest, dataSourceId);
        const baseUrl = this.buildBaseUrl();

        this.logger.debug(`Fetching metadata with fallback for data source '${dataSourceId}'...`);
        try {
            return await fetchMetadata(dataSource, baseUrl, this.provider, this.logger);
        } catch (error) {
            this.logger.warn(`Metadata fetching failed for '${dataSourceId}'. Will attempt fallback. Reason: ${error}`);

            if (dataSource.settings?.localUri) {
                try {
                    return await fetchFallbackMetadata(dataSource, baseUrl, this.provider, this.logger);
                } catch (fallbackError) {
                    this.logger.error(`Local metadata fallback also failed for '${dataSourceId}'`);
                    throw fallbackError;
                }
            }

            this.logger.error(`Metadata fetching failed, no local fallback available for '${dataSourceId}'`);
            throw error;
        }
    }
}
