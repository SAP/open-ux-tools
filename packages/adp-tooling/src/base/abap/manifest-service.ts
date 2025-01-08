import ZipFile from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { isAxiosError, type AbapServiceProvider, type Ui5AppInfoContent } from '@sap-ux/axios-extension';

import { getWebappFiles } from '../helper';
import type { DescriptorVariant } from '../../types';

/**
 * Retrieves the inbound navigation configurations from the project's manifest.
 *
 * @param {Manifest} manifest - The manifest file object adhering to the SAP JSON schema for web application manifest files.
 * @returns {ManifestNamespace.Inbound | undefined} The inbound navigation configurations, or `undefined` if no configurations are present.
 */
export function getInboundsFromManifest(manifest: Manifest): ManifestNamespace.Inbound | undefined {
    return manifest?.['sap.app']?.crossNavigation?.inbounds;
}

/**
 * Extracts the registration ID from the manifest file.
 *
 * @param {Manifest} manifest - The manifest file object adhering to the SAP JSON schema for web application manifest files.
 * @returns {string | undefined} The first registration ID if available, otherwise `undefined`.
 */
export function getRegistrationIdFromManifest(manifest: Manifest): string | undefined {
    return manifest?.['sap.fiori']?.registrationIds?.[0];
}

/**
 * Service class for handling operations related to the manifest of a UI5 application.
 * The class supports operations for both base and merged manifests.
 * It provides methods to fetch the manifest, data sources and metadata of a data source.
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
     * @param {AbapServiceProvider} provider - The ABAP service provider instance.
     * @param {string} appId - The application ID.
     * @param {ToolsLogger} logger - The logger instance.
     * @returns {Promise<ManifestService>} A promise that resolves to an instance of ManifestService.
     */
    public static async initBaseManifest(
        provider: AbapServiceProvider,
        appId: string,
        logger: ToolsLogger
    ): Promise<ManifestService> {
        const manifestService = new ManifestService(provider, logger);
        await manifestService.fetchBaseManifest(appId);
        return manifestService;
    }

    /**
     * Creates an instance of the ManifestService and fetches the merged manifest of the application.
     *
     * @param {AbapServiceProvider} provider - The ABAP service provider instance.
     * @param {string} basePath - The base path of the application.
     * @param {DescriptorVariant} variant - The descriptor variant.
     * @param {ToolsLogger} logger - The logger instance.
     * @returns {Promise<ManifestService>} A promise that resolves to an instance of ManifestService.
     */
    public static async initMergedManifest(
        provider: AbapServiceProvider,
        basePath: string,
        variant: DescriptorVariant,
        logger: ToolsLogger
    ): Promise<ManifestService> {
        const manifestService = new ManifestService(provider, logger);
        await manifestService.fetchMergedManifest(basePath, variant.id);
        await manifestService.fetchAppInfo(variant.reference);
        return manifestService;
    }

    /**
     * Returns the manifest fetched by the service during initialization.
     *
     * @returns {Manifest} The current manifest.
     */
    public getManifest(): Manifest {
        return this.manifest;
    }

    /**
     * Returns the UI5 application information content.
     *
     * @returns {Ui5AppInfoContent} UI5 app info.
     */
    public getAppInfo(): Ui5AppInfoContent {
        return this.appInfo;
    }

    /**
     * Fetches the application information for a given application ID.
     *
     * @param {string} appId - The application ID.
     * @returns {Promise<void>} A promise that resolves when the application information is fetched.
     */
    private async fetchAppInfo(appId: string): Promise<void> {
        this.appInfo = (await this.provider.getAppIndex().getAppInfo(appId))[appId];
    }

    /**
     * Fetches the merged manifest for a given application.
     *
     * @param {string} basePath - The base path of the application.
     * @param {string} descriptorVariantId - The descriptor variant ID.
     * @returns {Promise<void>} A promise that resolves to the merged manifest.
     */
    private async fetchMergedManifest(basePath: string, descriptorVariantId: string): Promise<void> {
        const zip = new ZipFile();
        const files = getWebappFiles(basePath);
        for (const file of files) {
            zip.addFile(file.relativePath, Buffer.from(file.content, 'utf-8'));
        }
        const buffer = zip.toBuffer();
        const lrep = this.provider.getLayeredRepository();
        await lrep.getCsrfToken();
        const response = await lrep.mergeAppDescriptorVariant(buffer, '//');
        this.manifest = response[descriptorVariantId].manifest;
    }

    /**
     * Fetches the base manifest for a given application ID.
     *
     * @param {string} appId - The application ID.
     * @returns {Promise<void>} A promise that resolves when the base manifest is fetched.
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
}
