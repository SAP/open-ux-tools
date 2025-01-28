import type Generator from 'yeoman-generator';
import { t } from '../utils/i18n';

export type Credentials = { username: string; password: string };
export type ValidationResults = { valid: boolean; message?: string };

/**
 * Prompts the user for credentials.
 *
 * @param {Function} callback - Optional callback function called in the validation phase of password prompt.
 * Object containing the username and password is passed to the callback. Also, the validation results object is passed that can be used to set the validation status in the callback.
 * @returns {Array} The prompts for username and password.
 */
export function getCredentialsPrompts(
    callback?: (credentials: Credentials, validationResults: ValidationResults) => Promise<void>
): Array<object> {
    return [
        {
            type: 'input',
            name: t('prompts.username.name'),
            message: t('prompts.username.message'),
            guiOptions: {
                mandatory: true
            },
            store: false,
            validate: (value: string): string | boolean => {
                return value ? true : t('error.cannotBeEmpty', { field: t('prompts.username.message') });
            }
        },
        {
            type: 'password',
            guiType: 'login',
            name: t('prompts.password.name'),
            message: t('prompts.password.message'),
            mask: '*',
            guiOptions: {
                mandatory: true
            },
            store: false,
            validate: async (value: string, answers: Generator.Answers): Promise<string | boolean | undefined> => {
                const validationResults: ValidationResults = { valid: true };
                if (!value) {
                    return t('error.cannotBeEmpty', { field: t('prompts.password.message') });
                }

                if (!answers.username) {
                    return t('error.cannotBeEmpty', { field: t('prompts.username.message') });
                }
                if (callback) {
                    await callback({ username: answers.username, password: value }, validationResults);
                    return validationResults.valid ? true : validationResults.message;
                }
                return true;
            }
        }
    ];
}
