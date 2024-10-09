import { t } from '../i18n';
import type { CfSystemChoice } from '../types';

/**
 *
 * @param input The input string to check for emptiness.
 * @returns returns true if the input string is not empty, otherwise false.
 */
function isNotEmpty(input: string): boolean {
    return !!input?.trim();
}

/**
 * Validates the input string for the following:
 * - It must not be empty after trimming whitespace.
 * - It must contain only alphanumeric characters, underscores, or dashes.
 * - It must not exceed 200 characters.
 *
 * @param {string} input - The input string to validate.
 * @returns {boolean|string} `true` if the input is valid, otherwise an error message.
 */
function validateInput(input: string): boolean | string {
    if (!isNotEmpty(input)) {
        return t('errors.emptyDestinationNameError');
    }
    const result = /^[a-z0-9_-]+$/i.test(input);
    if (!result) {
        return t('errors.destinationNameError');
    }
    if (input.length > 200) {
        return t('errors.destinationNameLengthError');
    }
    return true;
}

/**
 * Validates the destination name or input string. If `allowEmptyChoice` is true,
 * the validation will pass immediately. Otherwise, the input will be validated
 * against rules (non-empty, valid characters, length check).
 *
 * @param {string} input - The destination name or input string to validate.
 * @param {boolean} allowEmptyChoice - Whether to allow an empty input as a valid choice.
 * @returns {boolean|string} `true` if the input is valid or empty choices are allowed, otherwise an error message.
 */
export function validateDestinationQuestion(
    input: string | CfSystemChoice,
    allowEmptyChoice: boolean = false
): boolean | string {
    return allowEmptyChoice || typeof input !== 'string' ? true : validateInput(input);
}
