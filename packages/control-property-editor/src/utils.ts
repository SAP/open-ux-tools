export const convertCamelCaseToPascalCase = (text: string): string => {
    const string = text.replace(/([A-Z])/g, ' $1');
    return string.charAt(0).toUpperCase() + string.slice(1);
};
