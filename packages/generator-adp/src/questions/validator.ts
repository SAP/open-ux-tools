/**
 * Validates that a prompt value is not empty.
 *
 * @param value        The entered value
 * @param propertyName The name of the property used in the error message
 * @returns `true` when valid, otherwise a human-readable error message.
 */
export function validateForEmptyValue(value: string, propertyName: string): true | string {
    return value && value.trim().length > 0 ? true : `${propertyName} cannot be empty.`;
} 