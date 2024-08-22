import { t } from '../i18n';

/**
 * Checks if the input is a empty string.
 *
 * @param input - input to check
 * @returns true if the input is a empty string
 */
export function isEmptyString(input: string): boolean {
    return input?.trim().length === 0 || !input;
}

/**
 * Checks if the input contain any whitespace characters.
 *
 * @param input - input to check
 * @returns true if the input contain any whitespace characters.
 */
export function hasEmptySpaces(input: string): boolean {
    return /\s/.test(input);
}

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
    if (isEmptyString(input)) {
        return t('general.inputCannotBeEmpty');
    }

    return true;
}

/**
 * Validate input does not contain any whitespace characters.
 *
 * @param value The string to check for whitespace characters.
 * @returns true or error message
 */
export function validateEmptySpaces(value: string): boolean | string {
    if (hasEmptySpaces(value)) {
        return t('general.inputCannotHaveSpaces');
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
 * @param errorMessage The error message if validation fails.
 * @returns {boolean} True if validation passes, or an error message if validation fails.
 */
export function validateSpecialChars(
    value: string,
    regexp = '^[a-zA-Z0-9_$.\\-]+$',
    errorMessage = ''
): boolean | string {
    if (isEmptyString(value)) {
        return t('general.inputCannotBeEmpty');
    }

    const regex = new RegExp(regexp, 'g');
    if (regex.test(value)) {
        return true;
    }

    return errorMessage != '' ? errorMessage : t('general.invalidValueForSpecialChars');
}

/**
 * Validate input is not empty string and does not contain any whitespace characters.
 *
 * @param value The string to check for whitespace characters.
 * @returns true or error message
 */
export function validateEmptyStringAndEmptySpaces(value: string): boolean | string {
    if (isEmptyString(value)) {
        return t('general.inputCannotBeEmpty');
    }

    if (hasEmptySpaces(value)) {
        return t('general.inputCannotHaveSpaces');
    }

    return true;
}
