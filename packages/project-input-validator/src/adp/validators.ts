/**
 * Validates a value for duplication in existing change files.
 *
 * @param value The value to check for duplication.
 * @param propertyName The property name in the change file objects to check.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean} Returns true if a content duplication is found and false if there is no content duplication.
 */
export function hasContentDuplication(
    value: string,
    propertyName: string,
    changeFiles: { content: object }[]
): boolean {
    return changeFiles.some(({ content }) => {
        const contentProperty = (content as Record<string, object>)[propertyName];
        return contentProperty && Object.keys(contentProperty).includes(value);
    });
}

/**
 * Validates a value for starting with a customer prefix.
 *
 * @param value The value to validate.
 * @returns {boolean} True if the value starts with 'customer.' and false if it does not.
 */
export function hasCustomerPrefix(value: string): boolean {
    return value.toLowerCase().startsWith('customer.');
}

/**
 * Validates if a value is a valid data source URI.
 *
 * @param uri The URI to validate.
 * @returns {boolean} True if the URI is valid, false if it is not.
 */
export function isDataSourceURI(uri: string): boolean {
    return /^(?!.*\/\/)\/([^\s]*)\/$/.test(uri);
}
