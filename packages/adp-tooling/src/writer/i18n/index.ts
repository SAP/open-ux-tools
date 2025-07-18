import type { Editor } from 'mem-fs-editor';
import { v4 as uuidv4 } from 'uuid';

import type { Manifest } from '@sap-ux/project-access';

import { RESOURCE_BUNDLE_TEXT, TRANSLATION_UUID_TEXT, BASE_I18N_DESCRIPTION, MAIN_I18N_PATH } from '../..';
import { FlexLayer, type ResourceModel, type SapModel } from '../../types';

/**
 * Generates an internationalization description string for a specific layer within an application.
 *
 * @param {FlexLayer} layer - The UI5 Flex layer.
 * @param {string} [appTitle] - The title of the application used in generating the i18n description.
 * @returns {string} The internationalization description string.
 */
export function getI18nDescription(layer: FlexLayer, appTitle?: string): string {
    return layer === FlexLayer.CUSTOMER_BASE
        ? BASE_I18N_DESCRIPTION
        : BASE_I18N_DESCRIPTION + RESOURCE_BUNDLE_TEXT + appTitle + TRANSLATION_UUID_TEXT + uuidv4();
}

/**
 * Writes internationalization (i18n) model files to the specified paths within the project structure.
 *
 * @param {string} basePath - The base path of the project where i18n files are located, typically the root.
 * @param {ResourceModel[]} [i18nModels] - An optional array of i18n models to be written. Each model contains
 *                                         the key, path, and content for an i18n file.
 * @param {Editor} fs - The file system editor interface used for writing files.
 
 *
 * This function ensures that:
 * - Only i18n models that are not the main i18n file (`i18n/i18n.properties`) are processed.
 * - Models are written only if they have content and do not match the main i18n path.
 * - The file path for each model is constructed using the provided base path and model's specified path.
 */
export function writeI18nModels(basePath: string, i18nModels: ResourceModel[] | undefined, fs: Editor): void {
    if (!i18nModels?.length) {
        return;
    }

    for (const { key, path, content } of i18nModels) {
        const isMainFile = key === 'i18n' || path === MAIN_I18N_PATH;
        if (!isMainFile && content) {
            const i18nPath = `${basePath}/webapp/${path}`;
            fs.write(i18nPath, content);
        }
    }
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
            resourceModelPath = fileLocation.replace(/\./g, '/').substring(1, fileLocation.length) + '.properties';
        } else {
            resourceModelPath = `i18n/${modelObjectKey}.properties`;
        }
    }

    return resourceModelPath;
}

/**
 * Extracts and constructs resource models from the application manifest based on the specified layer and application information.
 * This function filters out resource models and attaches a generated i18n description, along with the path derived from the model.
 *
 * @param {Manifest| undefined} manifest - The application manifest containing model configurations.
 * @param {FlexLayer} layer - The UI5 Flex layer.
 * @param {string} id - The application identifier.
 * @param {string} [title] - The application title.
 * @returns {ResourceModel[] | undefined} An array of resource models or undefined if no models meet the criteria.
 */
export function getI18nModels(
    manifest: Manifest | undefined,
    layer: FlexLayer,
    id: string,
    title?: string
): ResourceModel[] | undefined {
    if (!manifest) {
        return undefined;
    }

    const models = manifest['sap.ui5']?.models ?? {};

    return Object.entries(models).reduce((acc, [key, ui5Model]) => {
        if (ui5Model?.type === 'sap.ui.model.resource.ResourceModel') {
            const content = getI18nDescription(layer, title);
            const path = extractResourceModelPath(ui5Model, key, id);
            acc.push({ key, path, content });
        }
        return acc;
    }, [] as ResourceModel[]);
}
