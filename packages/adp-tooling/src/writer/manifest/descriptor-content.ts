import { isFeatureSupportedVersion } from '../../ui5';
import { FlexLayer, ApplicationType } from '../../types';
import type { Content, AdpWriterConfig, ResourceModel } from '../../types';

/**
 * Creates a descriptor change object for a resource model.
 *
 * @param {string} modelId - The identifier for the model.
 * @param {string} path - The path to the resource bundle or i18n properties file.
 * @param {ApplicationType} type - The type of the application (e.g., FREE_STYLE, FIORI_ELEMENTS, etc.).
 * @param {string} ui5Version - The UI5 version to check for feature support.
 * @returns {Content} The descriptor change content object structured according to the UI5 enhancement specifications.
 *
 * This function checks if the 'fallbackLocale' feature is supported from UI5 version 1.84.0 onwards.
 * If supported and the application type is FREE_STYLE, it includes specific properties for localization.
 * Otherwise, it prepares a standard model enhancement structure.
 */
export function createDescriptorChangeForResourceModel(
    modelId: string,
    path: string,
    type?: ApplicationType,
    ui5Version?: string
): Content {
    const fallbackLocaleSupported = isFeatureSupportedVersion('1.84.0', ui5Version);

    if (type === ApplicationType.FREE_STYLE && fallbackLocaleSupported) {
        return {
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: {
                modelId,
                bundleUrl: path,
                supportedLocales: [''],
                fallbackLocale: ''
            }
        };
    }

    return {
        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
        content: {
            modelId
        },
        texts: {
            'i18n': path
        }
    };
}

/**
 * Populates a content array with descriptor changes for each resource model provided.
 *
 * @param {Content[]} content - The array to be filled with descriptor change objects.
 * @param {ApplicationType} type - The type of the application (e.g., FREE_STYLE, FIORI_ELEMENTS, etc.).
 * @param {string} systemVersion - The UI5 system version used to determine feature support.
 * @param {ResourceModel[]} [i18nModels] - Optional array of resource models from which to create descriptor changes.
 *
 * Each descriptor change is generated based on the provided system version and application type,
 * taking into account whether certain UI5 features are supported.
 */
export function fillDescriptorContent(
    content: Content[],
    type?: ApplicationType,
    systemVersion?: string,
    i18nModels?: ResourceModel[]
): void {
    if (i18nModels) {
        i18nModels.forEach((i18nModel) => {
            content.push(createDescriptorChangeForResourceModel(i18nModel.key, i18nModel.path, type, systemVersion));
        });
    }
}

/**
 * Adds support data entries for Fiori registration IDs and application component hierarchy (ACH) to a content array.
 *
 * @param {Content[]} content - The array to which support data entries will be added.
 * @param {string} [fioriId] - The Fiori ID to set in the registration.
 * @param {string} [ach] - The application component hierarchy code, which will be converted to uppercase.
 */
export function fillSupportData(content: Content[], fioriId?: string, ach?: string): void {
    if (fioriId) {
        content.push({
            changeType: 'appdescr_fiori_setRegistrationIds',
            content: {
                registrationIds: [fioriId]
            }
        });
    }

    if (ach) {
        content.push({
            changeType: 'appdescr_app_setAch',
            content: {
                ach: ach?.toUpperCase()
            }
        });
    }
}

/**
 * Generates an array of content objects for a `manifest.appdescr_variant` file based on the application configuration.
 * This function populates descriptor content and, depending on the application layer, may include additional
 * support data. It also handles setting the minimum UI5 version if specified in the configuration.
 *
 * @param {AdpWriterConfig} config - Configuration object containing application and UI5 specific settings.
 *      `app` contains properties like application type, layer, and identifiers.
 *      `ui5` may include version details and flags for setting minimum UI5 version.
 * @returns {Content[]} An array of content objects for the application manifest. Each object describes a specific
 *      change or setting necessary for the application configuration, such as setting minimum UI5 version,
 *      updating title, or adding support data.
 */
export function getManifestContent(config: AdpWriterConfig): Content[] {
    const { app, ui5 } = config;
    const { ach, fioriId, appType, layer, i18nModels } = app;
    const isCustomerBase = layer === FlexLayer.CUSTOMER_BASE;
    const content: Content[] = [];

    fillDescriptorContent(content, appType, ui5?.version, i18nModels);

    if (!isCustomerBase) {
        fillSupportData(content, fioriId, ach);
    }

    if (ui5?.shouldSetMinVersion) {
        content.push({
            changeType: 'appdescr_ui5_setMinUI5Version',
            content: {
                minUI5Version: ui5?.minVersion
            }
        });
    }

    content.push({
        changeType: 'appdescr_app_setTitle',
        content: {},
        texts: {
            i18n: 'i18n/i18n.properties'
        }
    });

    return content;
}
