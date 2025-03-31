import type { TargetApplication } from '@sap-ux/adp-tooling';
import { FlexLayer } from '@sap-ux/adp-tooling';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { t } from '../../utils/i18n';
import { isV4Application } from './utils';

/**
 * Manages and validates application identifiers and compatibility for adaptation projects,
 * particularly focusing on UI5 applications.
 */
export class AppIdentifier {
    /**
     * Indicates whether the adaptation layer is CUSTOMER_BASE.
     */
    private readonly isCustomerBase: boolean;

    /**
     * Indicates whether views are loaded synchronously.
     */
    private isAppSync = false;

    /**
     * Flag indicating if the application is an internal V4 application.
     */
    private isV4AppInternalMode = false;

    /**
     * Flag indicating that full adaptation-over-adaptation is supported.
     */
    private isSupported = false;

    /**
     * Flag indicating that only partial adaptation-over-adaptation is supported.
     */
    private isPartiallySupported = false;

    /**
     * Initializes the AppIdentifier with specified base settings.
     *
     * @param {boolean} layer - Indicates whether the application is based on a customer base layer.
     */
    constructor(layer: FlexLayer) {
        this.isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    }

    /**
     * Determines if adaptation over adaptation (Adp over Adp) is fully supported.
     *
     * @returns {boolean} True if fully supported and not partially supported, otherwise false.
     */
    public getIsSupported(): boolean {
        return this.isSupported && !this.isPartiallySupported;
    }

    /**
     * Determines if there is partial support for adaptation over adaptation (Adp over Adp).
     *
     * @returns {boolean} True if partially supported, otherwise false.
     */
    public getIsPartiallySupported(): boolean {
        return this.isPartiallySupported;
    }

    /**
     * Indicates whether the application loads views synchronously.
     *
     * @returns {boolean} True if views are sync-loaded.
     */
    public get appSync(): boolean {
        return this.isAppSync;
    }

    /**
     * Indicates whether the app is a V4 application in internal mode (i.e., not customer base).
     *
     * @returns {boolean}
     */
    public get v4AppInternalMode(): boolean {
        return this.isV4AppInternalMode;
    }

    /**
     * Validates the selected application for adaptation projects, checking for specific support flags
     * and validating the application manifest.
     *
     * @param {TargetApplication} application - The application to validate.
     * @param {Manifest | null} manifest - The application manifest to validate; can be null.
     * @param {boolean} isFullSupport - Flag to check for full AdpOverAdp support.
     * @param {boolean} isPartialSupport - Flag to check for partial AdpOverAdp support.
     * @returns {void} Returns when validation is complete.
     */
    public validateSelectedApplication(
        application: TargetApplication,
        manifest: Manifest | undefined,
        isFullSupport: boolean,
        isPartialSupport: boolean
    ): void {
        if (!manifest) {
            throw new Error(t('error.manifestCouldNotBeValidated'));
        }

        this.setSupportFlags(application, manifest, isFullSupport, isPartialSupport);

        if (manifest['sap.ui5']) {
            if (manifest['sap.ui5']?.flexEnabled === false) {
                throw new Error(t('error.appDoesNotSupportAdaptation'));
            }

            this.checkForSyncLoadedViews(manifest['sap.ui5']);
        }
    }

    /**
     * Checks if views are loaded synchronously or asynchronously in the UI5 settings of the manifest.
     * Sets the isAppSync property based on the loading method.
     *
     * @param {Manifest['sap.ui5']} ui5Settings - The UI5 settings part of the manifest.
     */
    private checkForSyncLoadedViews(ui5Settings: Manifest['sap.ui5']): void {
        if (ui5Settings?.rootView) {
            const rootView = ui5Settings?.rootView as ManifestNamespace.RootViewDefFlexEnabled;
            this.isAppSync = !rootView.async;
            return;
        }
        if (ui5Settings?.routing && ui5Settings['routing']['config']) {
            this.isAppSync = !ui5Settings['routing']['config']['async'];
            return;
        }

        this.isAppSync = false;
    }

    /**
     * Sets the support flags for given application.
     *
     * @param {TargetApplication} application - The application to validate.
     * @param {Manifest | null} manifest - The application manifest to validate; can be null.
     * @param {boolean} isFullSupport - Flag to check for full AdpOverAdp support.
     * @param {boolean} isPartialSupport - Flag to check for partial AdpOverAdp support.
     * @returns {void} Returns when flags are set.
     */
    private setSupportFlags(
        application: TargetApplication,
        manifest: Manifest,
        isFullSupport: boolean,
        isPartialSupport: boolean
    ): void {
        this.isSupported = !(isFullSupport && application.fileType === 'appdescr_variant');
        this.isPartiallySupported = isPartialSupport && application.fileType === 'appdescr_variant';
        this.isV4AppInternalMode = isV4Application(manifest) && !this.isCustomerBase;
    }
}
