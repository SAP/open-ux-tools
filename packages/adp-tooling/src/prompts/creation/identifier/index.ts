import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { t } from '../../../i18n';
import { isV4Application } from './utils';
import { FlexLayer } from '../../../types';
import type { Application } from '../../../types';

/**
 * Manages and validates application identifiers and compatibility for adaptation projects,
 * particularly focusing on UI5 applications.
 */
export class AppIdentifier {
    private isCustomerBase: boolean;

    public appSync: boolean;
    public isV4AppInternalMode: boolean;
    public isSupported: boolean;
    public isPartiallySupported: boolean;

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
     * Validates the selected application for adaptation projects, checking for specific support flags
     * and validating the application manifest.
     *
     * @param {Application} application - The application to validate.
     * @param {Manifest | null} manifest - The application manifest to validate; can be null.
     * @param {boolean} checkFullSupport - Flag to check for full AdpOverAdp support.
     * @param {boolean} checkPartialSupport - Flag to check for partial AdpOverAdp support.
     * @returns {void}} Returns when validation is complete.
     */
    public validateSelectedApplication(
        application: Application,
        manifest: Manifest | undefined,
        checkFullSupport: boolean,
        checkPartialSupport: boolean
    ): void {
        if (!application) {
            throw new Error(t('validators.selectCannotBeEmptyError', { value: 'Application' }));
        }

        if (!manifest) {
            throw new Error(t('validators.manifestCouldNotBeValidated'));
        }

        this.isSupported = !(checkFullSupport && application.fileType === 'appdescr_variant');
        this.isPartiallySupported = checkPartialSupport && application.fileType === 'appdescr_variant';
        this.isV4AppInternalMode = isV4Application(manifest) && !this.isCustomerBase;

        if (manifest['sap.ui5']) {
            if (!manifest['sap.ui5'].flexEnabled) {
                throw new Error(t('validators.appDoesNotSupportAdaptation'));
            }

            this.checkForSyncLoadedViews(manifest['sap.ui5']);
        }
    }

    /**
     * Checks if views are loaded synchronously or asynchronously in the UI5 settings of the manifest.
     * Sets the appSync property based on the loading method.
     *
     * @param {Manifest['sap.ui5']} ui5Settings - The UI5 settings part of the manifest.
     */
    public checkForSyncLoadedViews(ui5Settings: Manifest['sap.ui5']): void {
        if (ui5Settings?.rootView) {
            const rootView = ui5Settings?.rootView as ManifestNamespace.RootViewDefFlexEnabled;
            this.appSync = !rootView.async;
            return;
        }
        if (ui5Settings?.routing && ui5Settings['routing']['config']) {
            this.appSync = !ui5Settings['routing']['config']['async'];
            return;
        }

        this.appSync = false;
    }
}
