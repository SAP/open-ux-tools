/**
 * Type guard for a string values.
 *
 * @param value The value being checked.
 * @returns True if the value is of type string.
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Type guard for objects containing only string values.
 *
 * @param object The object being checked.
 * @returns True if all object values are of type string.
 */
export function isRecordOfStrings(object: unknown): object is Record<string, string> {
    if (!isPlainObject(object)) {
        return false;
    }

    return Object.values(object).every((value) => isString(value));
}

/**
 * Type guard for a plain javascript object.
 *
 * @param value The value being checked.
 * @returns True if the value is a plain javascripot object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
