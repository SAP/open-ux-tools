import { t } from '../i18n';

export type AllowedCharacters = '_';

/**
 * SAP client number is either empty or 3 digit string.
 *
 * @param client ABAP system client number
 * @returns true or error message
 */
export function validateClient(client: string): boolean | string {
    const formattedInput = client?.trim() || '';

    const isValid = formattedInput === '' || /^\d{3}$/.test(formattedInput);

    if (isValid) {
        return true;
    } else {
        return t('general.invalidClient', { client });
    }
}

/**
 * Validate url input is valid url format.
 *
 * @param input Backend ABAP system url
 * @returns true or error message
 */
export function validateUrl(input: string): boolean | string {
    try {
        const url = new URL(input);
        return !!url.protocol && !!url.host;
    } catch {
        return t('general.invalidUrl', { input });
    }
}

/**
 * Validate input is not empty string.
 *
 * @param input input string to be validated
 * @returns true or error message
 */
export function validateEmptyString(input: string): boolean | string {
    const formattedInput = input?.trim() || '';

    if (formattedInput.trim().length > 0) {
        return true;
    }

    return t('general.inputCannotBeEmpty');
}

/**
 * Validate input does not contain any whitespace characters.
 *
 * @param value The string to check for whitespace characters.
 * @returns true or error message
 */
export function validateEmptySpaces(value: string): boolean | string {
    if (/\s/.test(value)) {
        return t('general.inputCannotHaveSpaces');
    }

    return true;
}

/**
 * Validates that the given string does not exceed the specified maximum length.
 *
 * @param {string} value - The string value to validate.
 * @param {number} [maxLength] - The maximum allowed length of the string. If 0 or not provided, no length validation is performed.
 * @returns {boolean | string} Returns `true` if the validation passes, or an error message string if it fails.
 */
export function validateMaxLength(value: string, maxLength: number = 0): boolean | string {
    if (maxLength > 0 && value.length > maxLength) {
        return t('general.maxLength', { maxLength });
    }
    return true;
}

/**
 * Validates whether the input contains only alphanumeric characters and allowed special characters.
 *
 * @param {string} value - The input string to validate.
 * @param {string[]} allowedCharacters - An array of allowed special characters.
 * @returns {boolean | string} Returns `true` if validation passes, or an error message string if validation fails.
 */
export function validateAllowedCharacters(value: string, allowedCharacters?: AllowedCharacters[]): boolean | string {
    // Asterisks is supported for the semantic object and action field but not the inbound title
    if (allowedCharacters && allowedCharacters.length > 0) {
        const escapedChars = allowedCharacters.map((char) => `\\${char}`).join('');
        const regex = new RegExp(`^[a-zA-Z0-9${escapedChars}]+$`);
        if (!regex.test(value)) {
            return t('general.supportedFormats', {
                allowedCharacters: allowedCharacters.join('')
            });
        }
    }
    return true;
}

/**
 * Validate input is valid JSON.
 *
 * @param value The string to test.
 * @returns true or error message
 */
export function validateJSON(value: string): boolean | string {
    try {
        JSON.parse(`{${value}}`);
        return true;
    } catch {
        return t('general.invalidJSON');
    }
}

/**
 * Validates a value for special characters.
 *
 * @param value The value to validate.
 * @param regexp The regex expression for allowed special characters.
 * @returns {boolean} True if validation passes, or an error message if validation fails.
 */
export function validateSpecialChars(value: string, regexp = '^[a-zA-Z0-9_$.\\-]+$'): boolean | string {
    const regex = new RegExp(regexp, 'g');
    if (regex.test(value)) {
        return true;
    }

    return t('general.invalidValueForSpecialChars');
}
