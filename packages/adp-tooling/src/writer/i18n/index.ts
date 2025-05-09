import { v4 as uuidv4 } from 'uuid';

import { FlexLayer } from '../../types';
import { RESOURCE_BUNDLE_TEXT, TRANSLATION_UUID_TEXT, BASE_I18N_DESCRIPTION } from '../..';

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
