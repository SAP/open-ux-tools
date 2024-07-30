/**
 * Validates a value for duplication in existing change files.
 *
 * @param value The value to check for duplication.
 * @param propertyName The property name in the change file objects to check.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
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
 * Validates a field for starting with a customer prefix.
 *
 * @param value The value to validate.
 * @returns {boolean} True if validation passes, or an error message if validation fails.
 */
export function hasCustomerPrefix(value: string): boolean {
    return value.toLowerCase().startsWith('customer.');
}
