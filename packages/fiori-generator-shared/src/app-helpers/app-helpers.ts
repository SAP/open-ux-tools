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
