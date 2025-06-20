import type { JsonInput } from '../app/types';

/**
 * Type guard for a string values.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is of type string.
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Type guard for an adaptation project configuration json.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value conforms to the AdpJsonInput interface.
 */
export function isJsonInput(value: unknown): value is JsonInput {
    if (!isPlainObject(value)) {
        return false;
    }

    return (
        isString(value.system) &&
        isString(value.application) &&
        isOptionalString(value.applicationTitle) &&
        isOptionalString(value.client) &&
        isOptionalString(value.username) &&
        isOptionalString(value.password) &&
        isOptionalString(value.targetFolder) &&
        isOptionalString(value.projectName) &&
        isOptionalString(value.namespace)
    );
}

/**
 * Type guard for a plain javascript object.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is a plain javascripot object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Type guard for an optional strings.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is string or undefined.
 */
function isOptionalString(value: unknown): value is string | undefined {
    return typeof value === 'undefined' || isString(value);
}
