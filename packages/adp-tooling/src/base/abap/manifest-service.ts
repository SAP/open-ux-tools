import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Ui5AppInfoContent } from '@sap-ux/axios-extension';
import type { AdpPreviewConfig } from '../../types';
import { isAxiosError, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { createAbapServiceProvider } from '@sap-ux/system-access';

type DataSources = Record<string, ManifestNamespace.DataSource>;

export class ManifestService {
    private manifest: Manifest;
    private appInfo: Ui5AppInfoContent;
    private constructor(private provider: AbapServiceProvider, private logger: ToolsLogger) {}

    public static async init(
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
        await manifestService.fetchManifest(appId);
        return manifestService;
    }

    private async fetchManifest(appId: string) {
        this.appInfo = (await this.provider.getAppIndex().getAppInfo(appId))[appId];
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

    public getManifest(): Manifest {
        return this.manifest;
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

        let metadataUrl = '';
        if (metadataPath?.settings?.localUri) {
            metadataUrl = `${this.appInfo.url}/${metadataPath.settings.localUri}`;
        } else if (metadataPath?.uri) {
            metadataUrl = `${this.appInfo.url}/${metadataPath.uri}$metadata`;
        }

        try {
            const response = await this.provider.get(metadataUrl);
            return response.data;
        } catch (error) {
            if (isAxiosError(error)) {
                this.logger.error('Metadata fetching failed');
            }
            this.logger.debug(error);
            throw error;
        }
    }
}
