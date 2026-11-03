import type { CfJsonInput, JsonInput, JsonInputFile } from '../app/types.js';
import { MtaMode, TargetEnv } from '../app/types.js';

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
        isOptionalString(value.id) &&
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
 * Type guard for a Cloud Foundry adaptation project configuration json.
 *
 * Requires `targetEnv === 'CF'`, an `application` (the CF base-app id) and at least one of
 * `businessService` or `serviceInstanceName`. All other fields are optional and, when present,
 * must be of the expected type.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value conforms to the CfJsonInput interface.
 */
export function isCfJsonInput(value: unknown): value is CfJsonInput {
    if (!isPlainObject(value)) {
        return false;
    }

    if (value.targetEnv !== TargetEnv.CF || !isString(value.application)) {
        return false;
    }

    if (!isString(value.businessService) && !isString(value.serviceInstanceName)) {
        return false;
    }

    const isValidMtaMode =
        value.mtaMode === undefined || value.mtaMode === MtaMode.New || value.mtaMode === MtaMode.Existing;

    return (
        isOptionalString(value.id) &&
        isOptionalString(value.applicationTitle) &&
        isOptionalString(value.businessService) &&
        isOptionalString(value.serviceInstanceName) &&
        isOptionalString(value.approuter) &&
        isOptionalString(value.businessSolutionName) &&
        isOptionalString(value.mtaId) &&
        isOptionalString(value.targetFolder) &&
        isOptionalString(value.projectName) &&
        isOptionalString(value.namespace) &&
        isValidMtaMode
    );
}

/**
 * Type guard for a plain javascript object.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is a plain javascript object.
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

/**
 * Type guard for an optional array of key user change content objects.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is undefined or a valid array of key user changes.
 */
function isOptionalKeyUserChanges(value: unknown): boolean {
    if (value === undefined) {
        return true;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    return value.every(
        (item) =>
            isPlainObject(item) &&
            isPlainObject(item.content) &&
            (item.texts === undefined || isPlainObject(item.texts))
    );
}

/**
 * Type guard for JsonInputFile.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is a valid JSON input file object.
 */
export function isJsonInputFile(value: unknown): value is JsonInputFile {
    return isPlainObject(value) && isOptionalKeyUserChanges(value.keyUserChanges);
}
