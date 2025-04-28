import { FlexLayer, type Content, type UI5Version } from '../types';
import { getMinUI5VersionForManifest, shouldSetMinUI5Version } from '../ui5';

/**
 * Returns a model enhancement change configuration.
 *
 * @returns {Content} The model change configuration.
 */
export function getNewModelEnhanceWithChange(): Content {
    return {
        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
        content: {
            modelId: 'i18n',
            bundleUrl: 'i18n/i18n.properties',
            supportedLocales: [''],
            fallbackLocale: ''
        }
    };
}

/**
 * Adds support data entries for Fiori registration IDs and application component hierarchy (ACH) to a content array.
 *
 * @param {Content[]} content - The array to which support data entries will be added.
 * @param {string} [fioriId] - The Fiori ID to set in the registration.
 * @param {string} [ach] - The application component hierarchy code, which will be converted to uppercase.
 */
export function fillSupportData(content: Content[], fioriId?: string, ach?: string): void {
    content.push({
        changeType: 'appdescr_fiori_setRegistrationIds',
        content: {
            registrationIds: [fioriId]
        }
    });

    content.push({
        changeType: 'appdescr_app_setAch',
        content: {
            ach: ach?.toUpperCase()
        }
    });
}

/**
 * Generates an array of content objects for a `manifest.appdescr_variant` file based on the application configuration.
 *
 * @param {FlexLayer} layer - The deployment layer of the application (e.g., CUSTOMER_BASE or VENDOR).
 * @param {string | undefined} systemVersion - The minimum required SAPUI5 version for the application.
 * @param {UI5Version} publicVersions - Publicly available SAPUI5 versions.
 * @param {string} [fioriId] - Optional Fiori ID to be added to support information.
 * @param {string} [ach] - Optional ACH ID used for support analytics.
 * @returns {Content[]} An array of content objects describing descriptor variant changes to be applied to the manifest.
 */
export function getManifestContent(
    layer: FlexLayer,
    systemVersion: string | undefined,
    publicVersions: UI5Version,
    fioriId?: string,
    ach?: string
): Content[] {
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    const content: Content[] = [];

    if (!isCustomerBase) {
        fillSupportData(content, fioriId, ach);
    }

    if (shouldSetMinUI5Version(systemVersion)) {
        content.push({
            changeType: 'appdescr_ui5_setMinUI5Version',
            content: {
                minUI5Version: getMinUI5VersionForManifest(publicVersions, systemVersion)
            }
        });
    }

    content.push(getNewModelEnhanceWithChange());

    return content;
}
