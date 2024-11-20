import type { AllowedCharacters } from '../general/validators';
import { validateAllowedCharacters, validateEmptyString, validateMaxLength } from '../general/validators';

/**
 * Validates that text input does not have zero length and optionally is less than the specified maximum length.
 * Returns an end user message if validation fails.
 *
 * @param input the text input to validate
 * @param maxLength optional, the maximum length of text to allow
 * @param allowedCharacters optional, define a list of special characters that should be allowed in the input field
 * @returns true, if all validation checks pass or a message explaining the validation failure
 */
export function validateText(input: string, maxLength = 0, allowedCharacters?: AllowedCharacters[]): boolean | string {
    const emptyValidation = validateEmptyString(input);
    if (typeof emptyValidation === 'string') {
        return emptyValidation;
    }

    const maxLengthValidation = validateMaxLength(input, maxLength);
    if (typeof maxLengthValidation === 'string') {
        return maxLengthValidation;
    }

    const allowedCharsValidation = validateAllowedCharacters(input, allowedCharacters);
    if (typeof allowedCharsValidation === 'string') {
        return allowedCharsValidation;
    }

    return true;
}
