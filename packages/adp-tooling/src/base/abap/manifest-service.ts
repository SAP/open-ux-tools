import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AdpPreviewConfig, DescriptorVariant } from '../../types';
import ZipFile from 'adm-zip';
import { isAxiosError, type AbapServiceProvider, type Ui5AppInfoContent } from '@sap-ux/axios-extension';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { getWebappFiles } from '../helper';

type DataSources = Record<string, ManifestNamespace.DataSource>;

/**
 * Service class for handling operations related to the manifest of a UI5 application.
 * The class supports operations for both base and merged manifests.
 * It provides methods to fetch the manifest, data sources and metadata of a data source.
 *
 */
export class ManifestService {
    private manifest: Manifest;
    private appInfo: Ui5AppInfoContent;

    /**
     * Private constructor to initialize the ManifestService.
     *
     * @param provider - The ABAP service provider.
     * @param logger - The logger instance.
     */
    private constructor(private readonly provider: AbapServiceProvider, private readonly logger: ToolsLogger) {}

    /**
     * Creates an instance of the ManifestService and fetches the base manifest of the application.
     *
     * @param appId - The application ID.
     * @param adpConfig - The ADP preview configuration.
     * @param logger - The logger instance.
     * @returns A promise that resolves to an instance of ManifestService.
     */
    public static async initBaseManifest(
        appId: string,
        adpConfig: AdpPreviewConfig,
        logger: ToolsLogger
    ): Promise<ManifestService> {
        const provider = await createAbapServiceProvider(
            adpConfig.target,
            {
                ignoreCertErrors: adpConfig.ignoreCertErrors ?? false
            },
            true,
            logger
        );
        const manifestService = new ManifestService(provider, logger);
        await manifestService.fetchBaseManifest(appId);
        return manifestService;
    }

    /**
     * Creates an instance of the ManifestService and fetches the merged manifest of the application.
     *
     * @param basePath - The base path of the application.
     * @param variant - The descriptor variant.
     * @param adpConfig - The ADP preview configuration.
     * @param logger - The logger instance.
     * @returns A promise that resolves to an instance of ManifestService.
     */
    public static async initMergedManifest(
        basePath: string,
        variant: DescriptorVariant,
        adpConfig: AdpPreviewConfig,
        logger: ToolsLogger
    ): Promise<ManifestService> {
        const provider = await createAbapServiceProvider(
            adpConfig.target,
            {
                ignoreCertErrors: adpConfig.ignoreCertErrors ?? false
            },
            true,
            logger
        );
        const manifestService = new ManifestService(provider, logger);
        manifestService.manifest = await manifestService.fetchMergedManifest(basePath, variant.id);
        await manifestService.fetchAppInfo(variant.reference);
        return manifestService;
    }

    /**
     * Fetches the base manifest for a given application ID.
     *
     * @param appId - The application ID.
     * @returns A promise that resolves when the base manifest is fetched.
     * @throws Error if the manifest URL is not found or fetching/parsing fails.
     */
    private async fetchBaseManifest(appId: string): Promise<void> {
        await this.fetchAppInfo(appId);
        const manifestUrl = this.appInfo.manifestUrl ?? this.appInfo.manifest;
        if (!manifestUrl) {
            throw new Error('Manifest URL not found');
        }
        try {
            const response = await this.provider.get(manifestUrl);
            this.manifest = JSON.parse(response.data);
        } catch (error) {
            if (isAxiosError(error)) {
                this.logger.error('Manifest fetching failed');
            } else {
                this.logger.error('Manifest parsing error: Manifest is not in expected format.');
            }
            this.logger.debug(error);
            throw error;
        }
    }

    /**
     * Fetches the application information for a given application ID.
     *
     * @param appId - The application ID.
     * @returns A promise that resolves when the application information is fetched.
     */
    private async fetchAppInfo(appId: string): Promise<void> {
        this.appInfo = (await this.provider.getAppIndex().getAppInfo(appId))[appId];
    }

    /**
     * Returns the manifest fetched by the service during initialization.
     *
     * @returns The current manifest.
     */
    public getManifest(): Manifest {
        return this.manifest;
    }

    /**
     * Fetches the merged manifest for a given application.
     *
     * @param basePath - The base path of the application.
     * @param descriptorVariantId - The descriptor variant ID.
     * @returns A promise that resolves to the merged manifest.
     */
    private async fetchMergedManifest(basePath: string, descriptorVariantId: string): Promise<Manifest> {
        const zip = new ZipFile();
        const files = getWebappFiles(basePath);
        for (const file of files) {
            zip.addFile(file.relativePath, Buffer.from(file.content, 'utf-8'));
        }
        const buffer = zip.toBuffer();
        const lrep = this.provider.getLayeredRepository();
        await lrep.getCsrfToken();
        const response = await lrep.mergeAppDescriptorVariant(buffer);
        return response[descriptorVariantId].manifest;
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
        return dataSources;
    }

    /**
     * Returns the metadata of a data source.
     *
     * @param dataSourceId - The ID of the data source.
     * @returns A promise that resolves to the metadata of the data source.
     * @throws Error if no metadata path is found in the manifest or fetching fails.
     */
    public async getDataSourceMetadata(dataSourceId: string): Promise<string> {
        const dataSource = this.manifest?.['sap.app']?.dataSources?.[dataSourceId];

        if (!dataSource) {
            throw new Error('No metadata path found in the manifest');
        }
        const baseUrl = new URL(this.appInfo.url, this.provider.defaults.baseURL as string);
        const metadataUrl = new URL(`${dataSource.uri}$metadata`, baseUrl.toString());
        try {
            const response = await this.provider.get(metadataUrl.toString());
            return response.data;
        } catch (error) {
            if (dataSource?.settings?.localUri) {
                this.logger.warn('Metadata fetching failed. Fallback to local metadata');
                try {
                    const fallbackUrl = new URL(
                        dataSource?.settings.localUri,
                        `${baseUrl.toString().endsWith('/') ? baseUrl.toString() : baseUrl.toString() + '/'}`
                    );
                    const response = await this.provider.get(fallbackUrl.toString());
                    return response.data;
                } catch (fallbackError) {
                    this.logger.error('Local metadata fallback fetching failed');
                    throw fallbackError;
                }
            }
            this.logger.error('Metadata fetching failed');
            throw error;
        }
    }
}
