import { t } from '../i18n';
import { ManifestChangeProperties } from '../types';

/**
 * Checks if the input is a non-empty string.
 *
 * @param input - input to check
 * @returns true if the input is a non-empty string
 */
export function isNotEmptyString(input: string | undefined): boolean {
    return typeof input === 'string' && input.trim().length > 0;
}

/**
 * Checks if the input is a valid SAP client.
 *
 * @param input - input to check
 * @returns true if the input is a valid SAP client
 */
export function isValidSapClient(input: string | undefined): boolean {
    return !input || (input.length < 4 && !!new RegExp(/^\d*$/).exec(input));
}

/**
 * Validates a URI to ensure it meets specific criteria.
 *
 * @param {string} value - The URI to validate.
 * @param {string | undefined} input - The name of the input field being validated, used for error messaging.
 * @param {boolean} [isMandatory=true] - Whether the URI is mandatory; if false, an empty URI is considered valid.
 * @returns {string | boolean} - Returns true if the URI is valid. If invalid, returns a localized error message.
 */
export function validateUri(value: string, input: string | undefined, isMandatory = true): string | boolean {
    if (value.length === 0) {
        return isMandatory ? t('validators.inputCannotBeEmpty', { input }) : true;
    }

    if (value.indexOf(' ') >= 0) {
        return t('validators.inpuCannotHaveSpaces', { input });
    }

    return true;
}

/**
 * Validates a string to check if it can be interpreted as valid JSON.
 *
 * @param {string} value - The string to validate.
 * @param {string} input - The name of the input field being validated.
 * @returns {string | boolean} - Returns true if the string is valid JSON. If invalid, returns an error message.
 */
export function validateAnnotationJSON(value: string, input: string): string | boolean {
    if (value.length === 0) {
        return true;
    }

    if (isValidJSON(value)) {
        return true;
    }

    return t('validators.inputInvalidValue', { input });
}

/**
 * Checks if a given string is valid JSON.
 *
 * @param {string} value - The string to test.
 * @returns {boolean} - True if the string is valid JSON, otherwise false.
 */
export function isValidJSON(value: string): boolean {
    try {
        JSON.parse(`{${value}}`);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Validates a value for duplication in existing change files.
 *
 * @param value The value to check for duplication.
 * @param propertyName The property name in the change file objects to check.
 * @param changeFiles The list of existing change files to check against.
 * @param isExternalUsage Whether the validation is for external usage.
 * @param inputName The name of the input field.
 * @param componentName The name of the component.
 *
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
 */
export function validateDuplication(
    value: string,
    propertyName: string,
    changeFiles: ManifestChangeProperties[],
    isExternalUsage: boolean,
    inputName: string,
    componentName: string
): boolean | string {
    const prevalidation = validateEmptyAndUserState(value, isExternalUsage, inputName);

    if (typeof prevalidation === 'string') {
        return prevalidation;
    }

    const isDuplicated = changeFiles.some((change: ManifestChangeProperties) => {
        if (!Object.prototype.hasOwnProperty.call(change.content, propertyName)) {
            return false;
        }

        const contentProperty = (change.content as Record<string, object>)[propertyName];
        return Object.keys(contentProperty).some((key: string) => key === value);
    });

    return isDuplicated ? t('validators.errorDuplicatedValue', { value: componentName }) : true;
}

/**
 * Validates a field for empty value and user state.
 *
 * @param value The value to validate.
 * @param isExternalUsage Whether the validation is for external usage.
 * @param input The name of the input field.
 *
 * @returns {boolean | string} True if validation passes, or an error message if validation fails.
 */
export function validateEmptyAndUserState(value: string, isExternalUsage: boolean, input: string): string | boolean {
    const validation = validateSpecialChars(value, input);

    if (typeof validation === 'string') {
        return validation;
    }

    const prefix = 'customer.';
    if (isExternalUsage && (!value.toLowerCase().startsWith(prefix) || value.length <= prefix.length)) {
        return t('validators.errorInputInvalidValuePrefix', { value: input, prefix });
    }

    return true;
}

/**
 * Validates a value for special characters.
 *
 * @param value The value to validate.
 * @param input The name of the input field.
 * @param regexp The regex expression for allowed special characters.
 * @param errorMsg The error message if validation fails.
 *
 * @returns {boolean | string} True if validation passes, or an error message if validation fails.
 */
export function validateSpecialChars(
    value: string,
    input: string,
    regexp = '^[a-zA-Z0-9_$.\\-]+$',
    errorMsg?: string
): boolean | string {
    if (value.length === 0) {
        return t('validators.inputCannotBeEmpty', { input });
    }

    if (value.indexOf(' ') >= 0) {
        return t('validators.inpuCannotHaveSpaces', { input });
    }

    const regex = new RegExp(regexp, 'g');

    if (!regex.test(value)) {
        return errorMsg ?? t('validators.errorInvalidValueForSpecialChars', { value });
    }

    return true;
}

/**
 * Validates that two field values are not the same.
 *
 * @param fieldValue The value of the first field.
 * @param comparativeValue The value of the second field to compare against.
 * @param value1 The name of the first value.
 * @param value2 The name of the second value.
 *
 * @returns {string | boolean} An error message if the values are the same, or true if they are different.
 */
export function validateDuplicateName(
    fieldValue: string,
    comparativeValue: string,
    value1: string,
    value2: string
): string | boolean {
    return fieldValue === comparativeValue ? t('validators.errorDuplicateNames', { value1, value2 }) : true;
}
