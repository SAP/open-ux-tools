import { t } from '../i18n';
import type { ManifestChangeProperties } from '../types';

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
 * Checks if the input is a non-empty string.
 *
 * @param input - input to check
 * @returns true if the input is a non-empty string
 */
export function isNotEmptyString(input: string | undefined): boolean {
    return typeof input === 'string' && input.trim().length > 0;
}

/**
 * Checks if the given string contains any whitespace characters.
 *
 * @param {string} value - The string to check for whitespace characters.
 * @returns {boolean} Returns true if the string contains any whitespace; otherwise, returns false.
 */
export function hasEmptySpaces(value: string): boolean {
    return /\s/.test(value);
}

/**
 * Validates that the input is non-empty and contains no whitespace characters.
 *
 * @param {string} value - The input value to validate.
 * @param {string | undefined} input - The name of the input field being validated, used for error messaging.
 * @param {boolean} isMandatory - Indicates whether the input is mandatory.
 * @returns {string | boolean} Returns true if the input is valid. If invalid, returns a localized error message.
 */
export function validateNonEmptyNoSpaces(
    value: string,
    input: string | undefined,
    isMandatory = true
): string | boolean {
    if (!isNotEmptyString(value)) {
        return isMandatory ? t('validators.cannotBeEmpty', { input }) : true;
    }

    if (hasEmptySpaces(value)) {
        return t('validators.cannotHaveSpaces', { input });
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
export function validateJSON(value: string, input: string): string | boolean {
    if (value.length === 0) {
        return true;
    }

    if (isValidJSON(value)) {
        return true;
    }

    return t('validators.invalidValue', { input });
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
 * @param isCustomerBase Whether the validation is for customer usage.
 * @param inputName The name of the input field.
 * @param componentName The name of the component.
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
 */
export function validateContentDuplication(
    value: string,
    propertyName: string,
    changeFiles: ManifestChangeProperties[],
    isCustomerBase: boolean,
    inputName: string,
    componentName: string
): boolean | string {
    const prevalidation = validateEmptyAndUserState(value, isCustomerBase, inputName);

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
 * @param isCustomerBase Whether the validation is for customer usage.
 * @param input The name of the input field.
 * @returns {boolean | string} True if validation passes, or an error message if validation fails.
 */
export function validateEmptyAndUserState(value: string, isCustomerBase: boolean, input: string): string | boolean {
    const validation = validateSpecialChars(value, input);

    if (typeof validation === 'string') {
        return validation;
    }

    const prefix = 'customer.';
    if (isCustomerBase && (!value.toLowerCase().startsWith(prefix) || value.length <= prefix.length)) {
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
 * @returns {boolean | string} True if validation passes, or an error message if validation fails.
 */
export function validateSpecialChars(
    value: string,
    input: string,
    regexp = '^[a-zA-Z0-9_$.\\-]+$',
    errorMsg?: string
): boolean | string {
    if (value.length === 0) {
        return t('validators.cannotBeEmpty', { input });
    }

    if (value.indexOf(' ') >= 0) {
        return t('validators.cannotHaveSpaces', { input });
    }

    const regex = new RegExp(regexp, 'g');

    if (!regex.test(value)) {
        return errorMsg ?? t('validators.errorInvalidValueForSpecialChars', { value });
    }

    return true;
}
