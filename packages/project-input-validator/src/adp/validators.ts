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
    const isDuplicated = changeFiles.some((change: { content: object }) => {
        if (!Object.prototype.hasOwnProperty.call(change.content, propertyName)) {
            return false;
        }

        const contentProperty = (change.content as Record<string, object>)[propertyName];
        return Object.keys(contentProperty).some((key: string) => key === value);
    });

    return isDuplicated;
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
