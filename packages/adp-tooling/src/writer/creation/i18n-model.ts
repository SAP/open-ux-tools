import { v4 as uuidv4 } from 'uuid';
import { Manifest } from '@sap-ux/project-access';

import { FlexLayer, SapModel } from '../../types';
import { ApplicationType } from '../../base/app-utils';

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

export function getI18nDescription(layer: FlexLayer, appTitle?: string): string {
    const i18nDescription =
        '#Make sure you provide a unique prefix to the newly added keys in this file, to avoid overriding of SAP Fiori application keys.';

    return layer === FlexLayer.CUSTOMER_BASE
        ? i18nDescription
        : i18nDescription + RESOURCE_BUNDLE_TEXT + appTitle + TRANSLATION_UUID_TEXT + uuidv4();
}

export function getI18nModels(
    manifest: Manifest,
    layer: FlexLayer,
    appInfo: { title?: string; id: string; type: ApplicationType }
): ResourceModel[] | undefined {
    try {
        const models = manifest['sap.ui5']?.models ?? {};

        return Object.entries(models).reduce((acc, [key, ui5Model]) => {
            if (ui5Model?.type === 'sap.ui.model.resource.ResourceModel') {
                const content = getI18nDescription(layer, appInfo?.title);
                const path = extractResourceModelPath(ui5Model, key, appInfo.id);
                acc.push({ key, path, content });
            }
            return acc;
        }, [] as ResourceModel[]);
    } catch (e) {
        throw new Error('Manifest parsing error: Check manifest/i18n for missing properties');
    }
}
