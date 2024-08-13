import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import { t } from '../../i18n';
import type { ProviderService } from './abap-provider-service';

export interface ManifestCache {
    url: string;
    manifest: Manifest | null;
}

/**
 * Evaluates whether the application described by the manifest is a SAP Fiori Elements version 4 application.
 *
 * @param {Manifest} manifest - The application manifest to evaluate.
 * @returns {boolean} True if the application uses SAP Fiori Elements version 4 libraries.
 */
export function isV4Application(manifest: Manifest | null): boolean {
    return !!manifest?.['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'];
}

/**
 * Retrieves the cached Fiori ID from the manifest.
 *
 * @param {Manifest} manifest - The manifest object containing Fiori registration IDs.
 * @returns {string} The Fiori ID as a string, or an empty string if not found.
 */
export function getCachedFioriId(manifest: Manifest | null): string {
    return manifest?.['sap.fiori']?.registrationIds?.toString() ?? '';
}

/**
 * Retrieves the Application Component Hierarchy (ACH) code from the manifest.
 *
 * @param {Manifest} manifest - The manifest object containing the ACH.
 * @returns {string} The ACH code as a string, or an empty string if not found.
 */
export function getCachedACH(manifest: Manifest | null): string {
    return manifest?.['sap.app']?.ach?.toString() ?? '';
}

/**
 * Extracts inbound IDs from the manifest's cross-navigation section.
 *
 * @param {Manifest} manifest - The manifest object containing cross-navigation data.
 * @returns {string[]} An array of inbound IDs, or an empty array if none are found.
 */
export function getInboundIds(manifest: Manifest | null): string[] {
    const inbounds = manifest?.['sap.app']?.crossNavigation?.inbounds;
    return inbounds ? Object.keys(inbounds) : [];
}

/**
 * Service class for handling operations related to application manifests.
 */
export class ManifestService {
    private manifestCache = new Map<string, ManifestCache>();

    /**
     * Creates an instance of ManifestService.
     *
     * @param {ProviderService} providerService - The ABAP provider service.
     * @param {ToolsLogger} [logger] - The logger.
     */
    constructor(private providerService: ProviderService, private logger?: ToolsLogger) {}

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
     * @returns {Manifest | null} The cached manifest or null if not available.
     */
    public getManifest(id: string): Manifest | null {
        const cached = this.manifestCache.get(id);
        return cached ? cached.manifest : null;
    }

    /**
     * Retrieves the cached manifest URL for a specified application.
     *
     * @param {string} id - The ID of the application whose manifest URL is needed.
     * @returns {string} The cached URL or an empty string if not available.
     */
    public getUrl(id: string): string {
        const cached = this.manifestCache.get(id);
        return cached?.url ? cached.url : '';
    }

    /**
     * Retrieves and caches the manifest URL and the manifest itself for a specific application.
     * Uses caching to avoid redundant network requests.
     *
     * @param {string} id - The ID of the application for which to load the manifest.
     * @returns {Promise<void>} The manifest URL.
     */
    public async loadManifestUrl(id: string): Promise<void> {
        const cached = this.manifestCache.get(id);
        if (cached?.url) {
            return;
        }

        const provider = this.providerService.getProvider();
        const appIndex = provider.getAppIndex();
        const data = await appIndex.getAppInfo(id);

        if (data) {
            const appInfo = Object.values(data)[0];
            const url = appInfo?.manifestUrl ?? appInfo?.manifest ?? '';
            this.manifestCache.set(id, { url, manifest: null });
        }
    }

    /**
     * Fetches and stores the application manifest from a URL.
     *
     * @param {string} id - The application ID.
     * @returns {Promise<Manifest>} The fetched manifest.
     */
    public async loadManifest(id: string): Promise<void> {
        const provider = this.providerService.getProvider();
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

            const manifest = JSON.parse(response.data);

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
     * Determines if the application supports manifest-first approach.
     *
     * @param {string} id - The application ID.
     * @returns {Promise<boolean>} True if supported, otherwise throws an error.
     */
    public async isAppSupported(id: string): Promise<boolean> {
        const provider = this.providerService.getProvider();
        const appIndex = provider.getAppIndex();
        const isSupported = await appIndex.getIsManiFirstSupported(id);

        if (!isSupported) {
            this.logger?.debug(`Application '${id}' is not supported by Adaptation Project`);
            throw new Error(t('validators.appDoesNotSupportManifest'));
        }

        return this.checkManifestUrlExists(id);
    }

    /**
     * Checks if a manifest URL exists for a given application.
     *
     * @param {string} id - The application ID.
     * @returns {Promise<boolean>} True if the manifest URL exists, otherwise throws an error.
     */
    private async checkManifestUrlExists(id: string): Promise<boolean> {
        await this.loadManifestUrl(id);

        if (!this.getUrl(id)) {
            throw new Error(t('validators.adpPluginSmartTemplateProjectError'));
        }

        return true;
    }
}
