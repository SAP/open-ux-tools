import { Editor } from 'mem-fs-editor';
import { UI5FlexLayer } from '@sap-ux/project-access';

import { CUSTOMER_BASE, Content } from '../../types';
import { writeI18nModels } from './i18n-model-writer';
import { I18nModelExtractor, ResourceModel } from './i18n-model';
import { ApplicationType, getApplicationType } from '../../base/app-utils';
import { ManifestService, UI5VersionService, isFeatureSupportedVersion } from '../../base/services';

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
    type: ApplicationType,
    ui5Version: string
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
    type: ApplicationType,
    systemVersion: string,
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
 * @param {string} fioriId - The Fiori ID to set in the registration.
 * @param {string} ach - The application component hierarchy code, which will be converted to uppercase.
 */
export function fillSupportData(content: Content[], fioriId: string, ach: string): void {
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
 * Class responsible for generating descriptor content for UI5 applications.
 * This includes integrating manifest data, internationalization models, and various
 * deployment settings based on the application's environment and configuration.
 */
export class DescriptorContent {
    private fs: Editor;
    private basePath: string;
    private isCustomerBase: boolean;
    private i18nExtractor: I18nModelExtractor;

    /**
     * Constructs an instance of DescriptorContent, initializing required services
     * and settings for descriptor generation.
     *
     * @param {ManifestService} manifestService - Service for managing application manifests.
     * @param {UI5VersionService} ui5Service - Service for handling UI5 version information.
     * @param {UI5FlexLayer} layer - The UI5 Flex layer, indicating the deployment layer (e.g., CUSTOMER_BASE).
     * @param {string} basePath - The base path where the project files are located.
     * @param {Editor} fs - File system editor used to write internationalization models and other files.
     */
    constructor(
        private manifestService: ManifestService,
        private ui5Service: UI5VersionService,
        layer: UI5FlexLayer,
        basePath: string,
        fs: Editor
    ) {
        this.fs = fs;
        this.basePath = basePath;
        this.isCustomerBase = layer === CUSTOMER_BASE;
        this.i18nExtractor = new I18nModelExtractor(layer);
    }

    /**
     * Generates and returns descriptor content for a given application based on its manifest.
     *
     * @param {string} id - The unique identifier of the application.
     * @param {string} systemVersion - The system version of UI5.
     * @param {string} title - The title of the application.
     * @param {string} fioriId - Fiori application ID for registration purposes.
     * @param {string} ach - Achievement ID for the application.
     * @throws {Error} Throws an error if the manifest cannot be found.
     * @returns {Content[]} An array of descriptor contents including various configurations and settings.
     */
    public getManifestContent(
        id: string,
        systemVersion: string,
        title: string,
        fioriId: string,
        ach: string
    ): Content[] {
        const manifest = this.manifestService.getManifest(id);
        if (!manifest) {
            throw new Error('Manifest of the application was not found!');
        }

        const type = getApplicationType(manifest);
        const content: Content[] = [];

        const i18nModels = this.i18nExtractor.getI18NModels(manifest, {
            title,
            id,
            type
        });

        writeI18nModels(this.fs, this.basePath, i18nModels);
        fillDescriptorContent(content, type, systemVersion, i18nModels);

        if (!this.isCustomerBase) {
            fillSupportData(content, fioriId, ach);
        }

        if (this.ui5Service.shouldSetMinUI5Version()) {
            const minUI5Version = this.ui5Service.getMinUI5VersionForManifest();
            content.push({
                changeType: 'appdescr_ui5_setMinUI5Version',
                content: {
                    minUI5Version
                }
            });
        }

        return content;
    }
}
