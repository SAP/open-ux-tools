import type Generator from 'yeoman-generator';
import { t } from '../utils/i18n';
import type { YUIQuestion, InputQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';

export type CredentialsAnswers = { username: string; password: string };

/**
 * Prompts the user for credentials.
 *
 * @param {Function} additionalValidation - Optional callback function called in the validation phase of password prompt. Callback function should return a boolean or a message.
 * @returns {Array} An array of prompts.
 */
export function getCredentialsPrompts(
    additionalValidation?: (credentials: CredentialsAnswers) => Promise<boolean | string>
): YUIQuestion<CredentialsAnswers>[] {
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
        } as InputQuestion,
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
            validate: async (value: string, answers: Generator.Answers): Promise<string | boolean> => {
                if (!value) {
                    return t('error.cannotBeEmpty', { field: t('prompts.password.message') });
                }

                if (!answers.username) {
                    return t('error.cannotBeEmpty', { field: t('prompts.username.message') });
                }
                if (additionalValidation) {
                    return await additionalValidation({ username: answers.username, password: value });
                }
                return true;
            }
        } as PasswordQuestion
    ];
}
