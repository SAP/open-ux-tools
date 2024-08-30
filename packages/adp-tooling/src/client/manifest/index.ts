import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { t } from '../../i18n';
import type { AbapProvider } from '../abap-provider';

export interface ManifestCache {
    url: string;
    manifest: Manifest | undefined;
}

/**
 * Service class for handling operations related to application manifests.
 */
export class ManifestManager {
    private manifestCache = new Map<string, ManifestCache>();

    /**
     * Creates an instance of ManifestManager.
     *
     * @param {AbapProvider} provider - The ABAP provider service.
     * @param {ToolsLogger} [logger] - The logger.
     */
    constructor(private provider: AbapProvider, private logger?: ToolsLogger) {}

    /**
     * Resets the manifest cache.
     */
    public resetCache(): void {
        this.manifestCache = new Map();
    }

    /**
     * Retrieves the cached manifest for a specified application.
     *
     * @param {string} id - The ID of the application whose manifest is needed.
     * @returns {Promise<Manifest | undefined>} The cached manifest or null if not available.
     */
    public async getManifest(id: string): Promise<Manifest | undefined> {
        await this.loadManifest(id);
        return this.manifestCache.get(id)?.manifest;
    }

    /**
     * Retrieves the cached manifest URL for a specified application.
     *
     * @param {string} id - The ID of the application whose manifest URL is needed.
     * @returns {Promise<string | undefined>} The cached URL or an empty string if not available.
     */
    public async getUrl(id: string): Promise<string | undefined> {
        await this.loadManifestUrl(id);
        return this.manifestCache.get(id)?.url;
    }

    /**
     * Retrieves and caches the manifest URL and the manifest itself for a specific application.
     * Uses caching to avoid redundant network requests.
     *
     * @param {string} id - The ID of the application for which to load the manifest.
     * @returns {Promise<void>} The manifest URL.
     */
    private async loadManifestUrl(id: string): Promise<void> {
        const cached = this.manifestCache.get(id);
        if (cached?.url) {
            return;
        }

        const provider = this.provider.getProvider();
        const appIndex = provider.getAppIndex();
        const data = await appIndex.getAppInfo(id);

        if (data) {
            const appInfo = Object.values(data)[0];
            const url = appInfo?.manifestUrl ?? appInfo?.manifest ?? '';
            this.manifestCache.set(id, { url, manifest: undefined });
        }
    }

    /**
     * Fetches and stores the application manifest from a URL.
     *
     * @param {string} id - The application ID.
     * @returns {Promise<Manifest>} The fetched manifest.
     */
    private async loadManifest(id: string): Promise<void> {
        const provider = this.provider.getProvider();
        let cached = this.manifestCache.get(id);

        if (cached?.manifest) {
            return;
        }

        if (!cached?.url) {
            await this.loadManifestUrl(id);
            cached = this.manifestCache.get(id);
        }

        if (!cached?.url) {
            throw new Error('Manifest URL could not be loaded.');
        }

        try {
            const response = await provider.request({ url: cached.url });

            const manifest = JSON.parse(response.data) as Manifest;

            if (typeof manifest !== 'object' || manifest === null) {
                throw new Error('Manifest parsing error. Manifest is not in expected format.');
            }

            this.manifestCache.set(id, { url: cached.url, manifest });
        } catch (e) {
            this.logger?.debug(`Failed to load manifest, error: ${e.message}`);
            throw new Error(`Failed to load manifest from URL: ${e.message}`);
        }
    }

    /**
     * Determines if the application supports manifest-first approach and manifest url exists.
     *
     * @param {string} id - The application ID.
     * @returns {Promise<boolean>} True if supported, otherwise throws an error.
     */
    public async isAppSupported(id: string): Promise<boolean> {
        const provider = this.provider.getProvider();
        const appIndex = provider.getAppIndex();
        const isSupported = await appIndex.getIsManiFirstSupported(id);

        if (!isSupported) {
            this.logger?.debug(`Application '${id}' is not supported by Adaptation Project`);
            throw new Error(t('validators.appDoesNotSupportManifest'));
        }

        const url = await this.getUrl(id);

        if (!url) {
            this.logger?.debug(`Manifest url for app '${id}' was not found!`);
            throw new Error(t('validators.adpDoesNotSupportSelectedApp'));
        }

        return true;
    }
}
