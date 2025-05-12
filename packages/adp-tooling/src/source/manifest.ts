import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { t } from '../i18n';

/**
 * Evaluates whether the application described by the manifest is a SAP Fiori Elements version 4 application.
 *
 * @param {Manifest} manifest - The application manifest to evaluate.
 * @returns {boolean} True if the application uses SAP Fiori Elements version 4 libraries.
 */
export function isV4Application(manifest?: Manifest): boolean {
    return !!manifest?.['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'];
}

/**
 * Retrieves the default Fiori ID from the application's manifest.
 *
 * @param {Manifest | undefined} manifest - The manager responsible for fetching and handling the application manifest.
 * @returns {Promise<string>} The Fiori registration IDs as a string if available, otherwise an empty string.
 */
export function getFioriId(manifest: Manifest | undefined): string {
    return manifest?.['sap.fiori']?.registrationIds?.toString() ?? '';
}

/**
 * Retrieves the default Application Component Hierarchy (ACH) from the application's manifest.
 *
 * @param {Manifest | undefined} manifest - The manager responsible for fetching and handling the application manifest.
 * @returns {Promise<string>} The ACH code as a string if available, otherwise an empty string.
 */
export function getAch(manifest: Manifest | undefined): string {
    return manifest?.['sap.app']?.ach?.toString() ?? '';
}

/**
 * Checks if views are loaded synchronously or asynchronously in the UI5 settings of the manifest.
 * Sets the isAppSync property based on the loading method.
 *
 * @param {Manifest['sap.ui5']} ui5Settings - The UI5 settings part of the manifest.
 * @returns {boolean} Boolean if views are loaded synchronously or asynchronously.
 */
export function isSyncLoadedView(ui5Settings?: Manifest['sap.ui5']): boolean {
    if (ui5Settings?.rootView) {
        const rootView = ui5Settings?.rootView as ManifestNamespace.RootViewDefFlexEnabled;
        return !rootView.async;
    }
    if (ui5Settings?.routing && ui5Settings['routing']['config']) {
        return !ui5Settings['routing']['config']['async'];
    }

    return false;
}

/**
 * Service class for handling operations related to application manifests.
 * Manifest and URL are lazily loaded and stored internally.
 */
export class SourceManifest {
    /**
     * The parsed manifest object, loaded once and cached internally.
     */
    private manifest?: Manifest;

    /**
     * The manifest URL for the specified application, loaded once and cached internally.
     */
    private manifestUrl?: string;

    /**
     * Creates an instance of SourceManifest.
     *
     * @param {AbapServiceProvider} provider - The ABAP service provider for communicating with the system.
     * @param {string} appId - The ID of the application whose manifest should be managed.
     * @param {ToolsLogger} logger - Optional logger for debugging purposes.
     */
    constructor(
        private readonly provider: AbapServiceProvider,
        private readonly appId: string,
        private readonly logger?: ToolsLogger
    ) {}

    /**
     * Returns the manifest URL, loading it if not already available.
     *
     * @returns {Promise<string>} A promise resolving to the manifest URL string.
     */
    public async getManifestUrl(): Promise<string> {
        if (!this.manifestUrl) {
            this.manifestUrl = await this.loadManifestUrl();
        }
        return this.manifestUrl;
    }

    /**
     * Returns the parsed manifest, loading it if not already available.
     *
     * @returns A promise resolving to the parsed manifest object.
     */
    public async getManifest(): Promise<Manifest> {
        if (!this.manifest) {
            this.manifest = await this.loadManifest();
        }
        return this.manifest;
    }

    /**
     * Loads the manifest URL from the system using the application ID.
     * The result is stored internally for future access.
     *
     * @returns {Promise<string>} A promise that resolves once the URL has been fetched and set.
     */
    private async loadManifestUrl(): Promise<string> {
        const appIndex = this.provider.getAppIndex();
        const data = await appIndex.getAppInfo(this.appId);

        const appInfo = data ? Object.values(data)[0] : undefined;
        const url = appInfo?.manifestUrl ?? appInfo?.manifest ?? '';

        if (!url) {
            this.logger?.debug(`Manifest URL for app '${this.appId}' was not found!`);
            throw new Error(t('validators.appDoesNotSupportManifest'));
        }

        return url;
    }

    /**
     * Loads the manifest from the system and stores it internally.
     * Requires a manifest URL to be available (loads it if necessary).
     *
     * @returns {Promise<Manifest>} A promise that resolves once the manifest has been fetched and parsed.
     */
    private async loadManifest(): Promise<Manifest> {
        const url = this.manifestUrl ?? (await this.loadManifestUrl());

        try {
            const response = await this.provider.request({ url });
            const manifest = JSON.parse(response.data) as Manifest;

            if (typeof manifest !== 'object' || manifest === null) {
                throw new Error('Manifest parsing error. Manifest is not in expected format.');
            }

            return manifest;
        } catch (e) {
            this.logger?.debug(`Failed to load manifest for '${this.appId}', error: ${e.message}`);
            throw new Error(`Failed to load manifest from URL: ${e.message}`);
        }
    }
}
