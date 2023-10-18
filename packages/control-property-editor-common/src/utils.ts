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

export const toSpacedWords = (str: string): string => {
    return (
        str
            // Ensure sequences of uppercase letters are separated
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
            .replace(/([a-z\d])([A-Z]+)/g, '$1 $2')
            // Capitalize the first letter of each word
            .replace(/\b\w/g, (char) => char.toUpperCase())
            // Replace underscores and hyphens with spaces
            .replace(/[_-]/g, ' ')
            // Trim extra spaces
            .trim()
    );
};

export enum FlexChangesEndPoints {
    changes = `/preview/api/changes`
}
