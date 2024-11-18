import type { PromptObject } from 'prompts';
import { NAV_CONFIG_NS, t } from '../i18n';
import type { AllowedCharacters } from '../types/';

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
    if (input?.trim().length === 0) {
        return t('prompt.validationWarning.inputRequired', {
            inputName,
            ns: NAV_CONFIG_NS
        });
    }

    if (maxLength && input.length > maxLength) {
        return t('prompt.validationWarning.maxLength', { maxLength, ns: NAV_CONFIG_NS });
    }

    // Asterisks is supported for the semantic object and action field but not the inbound title
    if (allowedCharacters) {
        const escapedChars = allowedCharacters.map((char) => `\\${char}`).join('');
        const regex = new RegExp(`^[a-zA-Z0-9${escapedChars}]+$`);
        if (!regex.test(input)) {
            return t('prompt.validationWarning.supportedFormats', {
                ns: NAV_CONFIG_NS,
                allowedCharacters: allowedCharacters.join('')
            });
        }
    }

    return true;
}

/**
 * Get the prompts for inbound navigation configuration.
 *
 * @param inboundKeys inbound navigation keys already existing
 * @returns array of prompts
 */
function getPrompts(inboundKeys: string[]): PromptObject[] {
    const semanticObjectInputMsg = t('prompt.message.semanticObject', { ns: NAV_CONFIG_NS });
    const actionInputMsg = t('prompt.message.action', { ns: NAV_CONFIG_NS });
    const titleMsg = t('prompt.message.title', { ns: NAV_CONFIG_NS });

    return [
        {
            name: 'semanticObject',
            type: 'text',
            message: semanticObjectInputMsg,
            format: (val) => val?.trim(),
            validate: (val) => validateText(val, semanticObjectInputMsg, 30, ['_'])
        },
        {
            name: 'action',
            type: 'text',
            message: actionInputMsg,
            format: (val) => val?.trim(),
            validate: (val) => validateText(val, actionInputMsg, 60, ['_'])
        },
        {
            type: (prev, values) =>
                inboundKeys.indexOf(`${values.semanticObject}-${values.action}`) > -1 ? 'confirm' : false,
            name: 'overwrite',
            message: t('prompt.message.overwrite', { ns: NAV_CONFIG_NS }),
            initial: false
        },
        {
            name: 'title',
            type: (prev, values) => (values.overwrite !== false ? 'text' : false),
            message: titleMsg,
            format: (val) => val?.trim(),
            validate: (val) => validateText(val, titleMsg)
        },
        {
            name: 'subTitle',
            type: (prev, values) => (values.overwrite !== false ? 'text' : false),
            message: t('prompt.message.subtitle', { ns: NAV_CONFIG_NS }),
            format: (val) => val?.trim()
        }
    ];
}
