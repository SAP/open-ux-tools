import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Ui5AppInfoContent } from '@sap-ux/axios-extension';
import type { AdpPreviewConfig, DescriptorVariant } from '../../types';
import ZipFile from 'adm-zip';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { getWebappFiles } from '../helper';

type DataSources = Record<string, ManifestNamespace.DataSource>;

export class ManifestService {
    private manifest: Manifest;
    private appInfo: Ui5AppInfoContent;

    private constructor(private provider: AbapServiceProvider, private logger: ToolsLogger) {}

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

    private async fetchAppInfo(appId: string): Promise<void> {
        this.appInfo = (await this.provider.getAppIndex().getAppInfo(appId))[appId];
    }

    public getManifest(): Manifest {
        return this.manifest;
    }

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

    public getManifestDataSources(): DataSources {
        const dataSources = this.manifest['sap.app'].dataSources;
        if (!dataSources) {
            throw new Error('No data sources found in the manifest');
        }
        return dataSources;
    }

    public async getDataSourceMetadata(dataSourceId: string): Promise<any> {
        const metadataPath = this.manifest?.['sap.app']?.dataSources?.[dataSourceId];

        if (!metadataPath) {
            throw new Error('No metadata path found in the manifest');
        }

        try {
            const response = await this.provider.get(`${metadataPath.uri}$metadata`);
            return response.data;
        } catch (error) {
            if (metadataPath?.settings?.localUri) {
                try {
                    const response = await this.provider.get(`${this.appInfo.url}/${metadataPath?.settings?.localUri}`);
                    return response.data;
                } catch (fallbackError) {
                    this.logger.error('Metadata fetching failed');
                }
            }
            this.logger.error('Metadata fetching failed');
            throw error;
        }
    }
}
