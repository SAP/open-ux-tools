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
 * Falls back to the templateType value itself if no translation is found.
 *
 * @param templateType - the floorplan template type (e.g. `FloorplanFE.FE_LROP`)
 * @param odataVersion - optional OData version suffix (e.g. `'2'` or `'4'`)
 * @returns the display label (e.g. `'List Report Page V4'`)
 */
export function getFloorplanLabel(templateType: Floorplan, odataVersion?: string): string {
    return t(`floorplans.label.${templateType}`, { defaultValue: templateType, odataVersion });
}
