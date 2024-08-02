import { Manifest, UI5FlexLayer } from '@sap-ux/project-access';
import { ApplicationType } from '../../base/app-utils';
import { v4 as uuidv4 } from 'uuid';
import { CUSTOMER_BASE, SapModel } from '../../types';

export const RESOURCE_BUNDLE_TEXT = '\n\n# This is the resource bundle for ';
export const TRANSLATION_UUID_TEXT = '\n#__ldi.translation.uuid=';
export const PROPERTIES_TEXT = '.properties';

export interface ResourceModel {
    key: string;
    path: string;
    content?: string;
}

/**
 * Extracts the resource model path from a given UI5 model.
 *
 * @param {SapModel} ui5Model - The UI5 model object.
 * @param {string} modelObjectKey - The key of the model object.
 * @param {string} appId - Application ID.
 * @returns {string} The calculated resource model path.
 */
export function extractResourceModelPath(ui5Model: SapModel, modelObjectKey: string, appId: string): string {
    let resourceModelPath: string = '';
    if (ui5Model?.uri) {
        resourceModelPath = ui5Model.uri;
    } else if (ui5Model?.settings) {
        const bundleName = ui5Model.settings?.bundleName;
        if (bundleName?.indexOf(appId) === 0) {
            const fileLocation = bundleName.slice(appId.length, bundleName.length);
            resourceModelPath = fileLocation.replace(/\./g, '/').substring(1, fileLocation.length) + PROPERTIES_TEXT;
        } else {
            resourceModelPath = `i18n/${modelObjectKey}${PROPERTIES_TEXT}`;
        }
    }

    return resourceModelPath;
}

/**
 * Generates i18n content for a resource model.
 *
 * @param {boolean} isCustomerBase - Whether the application is in the customer base layer.
 * @param {string} appTitle - The title of the application.
 * @returns {string} The generated i18n content.
 */
export function getI18NContent(isCustomerBase: boolean, appTitle: string): string {
    const content =
        '#Make sure you provide a unique prefix to the newly added keys in this file, to avoid overriding of SAP Fiori application keys.';

    return isCustomerBase ? content : content + RESOURCE_BUNDLE_TEXT + appTitle + TRANSLATION_UUID_TEXT + uuidv4();
}

/**
 * Class responsible for extracting i18n models from a given manifest.
 */
export class I18nModelExtractor {
    private isCustomerBase: boolean;

    /**
     * Constructs an instance of I18nModelExtractor.
     *
     * @param {UI5FlexLayer} layer UI5 Flex layer.
     */
    constructor(layer: UI5FlexLayer) {
        this.isCustomerBase = layer === CUSTOMER_BASE;
    }

    /**
     * Retrieves i18n models from the manifest based on the application's information.
     *
     * @param {Manifest} manifest - The application manifest.
     * @param {object} appInfo - Information about the application.
     * @returns {ResourceModel[] | undefined} A list of i18n resource models or undefined if none are found.
     */
    public getI18NModels(
        manifest: Manifest,
        appInfo: { title: string; id: string; type: ApplicationType }
    ): ResourceModel[] | undefined {
        try {
            const models = manifest['sap.ui5']?.models ?? {};

            return Object.entries(models).reduce((acc, [key, ui5Model]) => {
                if (ui5Model?.type === 'sap.ui.model.resource.ResourceModel') {
                    const content = getI18NContent(this.isCustomerBase, appInfo.title);
                    const path = extractResourceModelPath(ui5Model, key, appInfo.id);
                    acc.push({ key, path, content });
                }
                return acc;
            }, [] as ResourceModel[]);
        } catch (e) {
            throw new Error('Manifest parsing error: Check manifest/i18n for missing properties');
        }
    }
}
