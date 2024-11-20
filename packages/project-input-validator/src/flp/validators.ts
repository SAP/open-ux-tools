import { t } from '../i18n';

export type AllowedCharacters = '_';

/**
 * Validates that text input does not have zero length and optionally is less than the specified maximum length.
 * Returns an end user message if validation fails.
 *
 * @param input the text input to validate
 * @param inputName the name of the input as seen by the user
 * @param maxLength optional, the maximum length of text to allow
 * @param allowedCharacters optional, define a list of special characters that should be allowed in the input field
 * @returns true, if all validation checks pass or a message explaining the validation failure
 */
export function validateText(
    input: string,
    inputName: string,
    maxLength = 0,
    allowedCharacters?: AllowedCharacters[]
): boolean | string {
    if (!input || input?.trim().length === 0) {
        return t('flp.inputRequired', {
            inputName
        });
    }

    if (maxLength && input.length > maxLength) {
        return t('flp.maxLength', { maxLength });
    }

    // Asterisks is supported for the semantic object and action field but not the inbound title
    if (allowedCharacters) {
        const escapedChars = allowedCharacters.map((char) => `\\${char}`).join('');
        const regex = new RegExp(`^[a-zA-Z0-9${escapedChars}]+$`);
        if (!regex.test(input)) {
            return t('flp.supportedFormats', {
                allowedCharacters: allowedCharacters.join('')
            });
        }
    }

    return true;
}
