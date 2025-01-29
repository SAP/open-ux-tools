import { t, addi18nResourceBundle } from '../i18n';
import type { YUIQuestion, InputQuestion, PasswordQuestion } from '../types';

export type CredentialsAnswers = { username: string; password: string };
export type AdditionalValidation = (credentials: CredentialsAnswers) => Promise<boolean | string>;

/**
 * Prompts the user for credentials.
 *
 * @param {Function} additionalValidation - Optional callback function called in the validation phase of password prompt. Callback function should return a boolean or a message.
 * @returns {Array} An array of prompts.
 */
export async function getCredentialsPrompts(
    additionalValidation?: AdditionalValidation
): Promise<YUIQuestion<CredentialsAnswers>[]> {
    addi18nResourceBundle();
    return [
        {
            type: 'input',
            name: 'username',
            message: t('prompts.username.message'),
            guiOptions: {
                mandatory: true
            },
            store: false,
            validate: (value: string): string | boolean => {
                return value ? true : t('errors.cannotBeEmpty', { field: t('prompts.username.message') });
            }
        } as InputQuestion,
        {
            type: 'password',
            guiType: 'login',
            name: 'password',
            message: t('prompts.password.message'),
            mask: '*',
            guiOptions: {
                mandatory: true
            },
            store: false,
            validate: async (value: string, answers: CredentialsAnswers): Promise<string | boolean> => {
                if (!value) {
                    return t('errors.cannotBeEmpty', { field: t('prompts.password.message') });
                }

                if (!answers.username) {
                    return t('errors.cannotBeEmpty', { field: t('prompts.username.message') });
                }
                if (additionalValidation) {
                    return await additionalValidation({ username: answers.username, password: value });
                }
                return true;
            }
        } as PasswordQuestion
    ];
}
