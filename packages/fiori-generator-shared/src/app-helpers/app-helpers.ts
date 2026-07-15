import { t } from '../i18n.js';
import type { Floorplan } from '../types/index.js';

/**
 * Creates a value suitable for use as a semantic object for navigation intents.
 * Removes specific characters that would break the navigation.
 *
 * @param appId
 * @returns
 */
export const getSemanticObject = (appId: string): string => {
    const semanticObject = appId.replace(/[-_.#]/g, '');
    return semanticObject.length > 30 ? semanticObject.substring(0, 30) : semanticObject;
};

export const getFlpId = (appId: string, action?: string | undefined): string => {
    return `${getSemanticObject(appId)}${action ? '-' + action : ''}`;
};

/**
 * Returns the display label for a given floorplan template type.
 *
 * @param {Floorplan} templateType - template type (e.g. 'lrop', 'fpm')
 * @param {string} odataVersion - optional OData version (e.g. '2', '4')
 * @returns the display label (e.g. 'List Report Page V4')
 */
export function getFloorplanLabel(templateType: Floorplan, odataVersion?: string): string {
    return t(`floorplans.label.${templateType}`, { defaultValue: templateType, odataVersion });
}