import { AbapServiceProvider, AxiosRequestConfig } from '@sap-ux/axios-extension';
import { Manifest } from '@sap-ux/project-access';

import { t } from '../../i18n';

/**
 * Evaluates whether the application described by the manifest is a SAP Fiori Elements version 4 application.
 *
 * @param {Manifest} manifest - The application manifest to evaluate.
 * @returns {boolean} True if the application uses SAP Fiori Elements version 4 libraries.
 */
export function isV4Application(manifest: Manifest): boolean {
    return !!manifest['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'];
}

/**
 * Retrieves the cached Fiori ID from the manifest.
 *
 * @param {Manifest} manifest - The manifest object containing Fiori registration IDs.
 * @returns {string} The Fiori ID as a string, or an empty string if not found.
 */
export function getCachedFioriId(manifest: Manifest): string {
    return manifest?.['sap.fiori']?.registrationIds?.toString() ?? '';
}

/**
 * Retrieves the Application Component Hierarchy (ACH) code from the manifest.
 *
 * @param {Manifest} manifest - The manifest object containing the ACH.
 * @returns {string} The ACH code as a string, or an empty string if not found.
 */
export function getCachedACH(manifest: Manifest): string {
    return manifest?.['sap.app']?.ach?.toString() ?? '';
}

/**
 * Extracts inbound IDs from the manifest's cross-navigation section.
 *
 * @param {Manifest} manifest - The manifest object containing cross-navigation data.
 * @returns {string[]} An array of inbound IDs, or an empty array if none are found.
 */
export function getInboundIds(manifest: Manifest): string[] {
    const inbounds = manifest?.['sap.app']?.crossNavigation?.inbounds;
    return inbounds ? Object.keys(inbounds) : [];
}

/**
 * Service class for handling operations related to application manifests.
 */
export class ManifestService {
    private manifestUrl: string;
    private appManifest: Manifest;

    constructor() {}

    /**
     * Gets the currently stored manifest.
     */
    public get manifest(): Manifest {
        return this.appManifest;
    }

    /**
     * Gets the currently stored manifest URL.
     */
    public get url(): string {
        return this.manifestUrl;
    }

    /**
     * Fetches and stores the manifest URL for a given application.
     *
     * @param {AbapServiceProvider} provider - The service provider.
     * @param {string} appId - The application ID.
     * @returns {Promise<string>} The manifest URL.
     */
    public async loadManifestUrl(provider: AbapServiceProvider, appId: string): Promise<void> {
        const appIndex = provider.getAppIndex();
        const data = await appIndex.getAppInfo(appId);

        if (data) {
            const appInfo = Object.values(data)[0];
            this.manifestUrl = appInfo?.manifestUrl ?? appInfo?.manifest ?? '';
        }
    }

    /**
     * Fetches and stores the application manifest from a URL.
     *
     * @param {AbapServiceProvider} provider - The service provider.
     * @param {string} manifestUrl - The URL from which to fetch the manifest.
     * @returns {Promise<Manifest>} The fetched manifest.
     */
    public async loadManifest(provider: AbapServiceProvider, manifestUrl: string): Promise<void> {
        try {
            const config: AxiosRequestConfig = {
                url: manifestUrl
            };

            const response = await provider.request(config);

            const data = JSON.parse(response.data);

            if (typeof data !== 'object' || data === null) {
                throw new Error('Manifest parsing error: Manifest is not in expected format.');
            }

            this.appManifest = data;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    /**
     * Determines if the application supports manifest-first approach.
     *
     * @param {AbapServiceProvider} provider - The service provider.
     * @param {string} appId - The application ID.
     * @returns {Promise<boolean>} True if supported, otherwise throws an error.
     */
    public async isAppSupported(provider: AbapServiceProvider, appId: string): Promise<boolean> {
        const appIndex = provider.getAppIndex();
        const isSupported = await appIndex.getIsManiFirstSupported(appId);

        if (!isSupported) {
            throw new Error(t('validators.appDoesNotSupportManifest'));
        }

        return this.checkManifestUrlExists(provider, appId);
    }

    /**
     * Checks if a manifest URL exists for a given application.
     *
     * @param {AbapServiceProvider} provider - The service provider.
     * @param {string} id - The application ID.
     * @returns {Promise<boolean>} True if the manifest URL exists, otherwise throws an error.
     */
    private async checkManifestUrlExists(provider: AbapServiceProvider, id: string) {
        await this.loadManifestUrl(provider, id);

        if (!this.url) {
            throw new Error(t('validators.adpPluginSmartTemplateProjectError'));
        }

        return true;
    }
}
