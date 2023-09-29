export interface PropertiesInfo {
    defaultValue: string;
    description: string;
    propertyName: string;
    type: string;
    propertyType: string | undefined;
}
export interface Properties {
    [key: string]: PropertiesInfo;
}

export const convertCamelCaseToPascalCase = (text: string): string => {
    const string = text.replace(/([A-Z])/g, ' $1');
    return string.charAt(0).toUpperCase() + string.slice(1);
};
export enum FlexChangesEndPoints {
    changes = `/preview/api/changes`
}
