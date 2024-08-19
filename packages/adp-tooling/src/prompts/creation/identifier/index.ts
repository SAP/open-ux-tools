import { t } from 'i18next';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import { Application, ApplicationType, FlexLayer } from '../../../types';
import { getApplicationType } from '../../../common/app-type';

/**
 * Checks if the given application type is a Fiori Elements application.
 *
 * @param {string} type - The application type to check.
 * @returns {boolean} True if the application is a Fiori Elements or Fiori Elements OVP app.
 */
export function isFioriElementsApp(type: string): boolean {
    return type === ApplicationType.FIORI_ELEMENTS || type === ApplicationType.FIORI_ELEMENTS_OVP;
}

/**
 * Determines if the application type is specifically a Fiori Elements Overview Page (OVP).
 *
 * @param {string} type - The application type to check.
 * @returns {boolean} True if the application type is Fiori Elements OVP.
 */
export function isOVPApp(type: string): boolean {
    return type === ApplicationType.FIORI_ELEMENTS_OVP;
}

/**
 * Checks if the application type is supported for adaptation projects.
 *
 * @param {string} type - The application type to evaluate.
 * @returns {boolean} True if the type is either Fiori Elements or a free style application.
 */
export function isSupportedType(type: string): boolean {
    return isFioriElementsApp(type) || type === ApplicationType.FREE_STYLE;
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
 * Manages and validates application identifiers and compatibility for adaptation projects,
 * particularly focusing on UI5 applications.
 */
export class AppIdentifier {
    private isCustomerBase: boolean;

    public appSync: boolean;
    public isV4AppInternalMode: boolean;
    public isSupportedAdpOverAdp: boolean;
    public isPartiallySupportedAdpOverAdp: boolean;

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
    public getIsSupportedAdpOverAdp(): boolean {
        return this.isSupportedAdpOverAdp && !this.isPartiallySupportedAdpOverAdp;
    }

    /**
     * Determines if there is partial support for adaptation over adaptation (Adp over Adp).
     *
     * @returns {boolean} True if partially supported, otherwise false.
     */
    public getIsPartiallySupportedAdpOverAdp(): boolean {
        return this.isPartiallySupportedAdpOverAdp;
    }

    /**
     * Validates the selected application for adaptation projects, checking for specific support flags
     * and validating the application manifest.
     *
     * @param {Application} application - The application to validate.
     * @param {Manifest | null} manifest - The application manifest to validate; can be null.
     * @param {boolean} checkFullSupport - Flag to check for full AdpOverAdp support.
     * @param {boolean} checkPartialSupport - Flag to check for partial AdpOverAdp support.
     * @returns {Promise<void>} Resolves when validation is complete.
     */
    public async validateSelectedApplication(
        application: Application,
        manifest: Manifest | null,
        checkFullSupport: boolean,
        checkPartialSupport: boolean
    ): Promise<void> {
        if (!application) {
            throw new Error(t('validators.selectCannotBeEmptyError', { value: 'Application' }));
        }

        if (!manifest) {
            throw new Error(t('validators.manifestCouldNotBeValidated'));
        }

        this.isV4AppInternalMode = false;
        this.isSupportedAdpOverAdp = !(checkFullSupport && application.fileType === 'appdescr_variant');
        this.isPartiallySupportedAdpOverAdp = checkPartialSupport && application.fileType === 'appdescr_variant';

        await this.validateFioriApplication(manifest);
    }

    /**
     * Validates a smart template application manifest, checking for compatibility with adaptation projects.
     *
     * @param {Manifest} manifest - The manifest of the application to validate.
     * @returns {Promise<void>} Resolves when the validation is complete.
     * @throws {Error} When the application does not support adaptation or is incompatible.
     */
    public async validateFioriApplication(manifest: Manifest): Promise<void> {
        const isV4App = isV4Application(manifest);

        this.isV4AppInternalMode = isV4App && !this.isCustomerBase;

        const appType = getApplicationType(manifest);

        if (isSupportedType(appType)) {
            if (manifest['sap.ui5']) {
                if (manifest['sap.ui5'].flexEnabled === false) {
                    throw new Error(t('validators.appDoesNotSupportAdaptation'));
                }
                this.checkForSyncLoadedViews(manifest['sap.ui5']);
            }
        } else {
            throw new Error(t('validators.adpPluginSmartTemplateProjectError'));
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
