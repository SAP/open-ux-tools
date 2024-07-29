import { t } from '../../i18n';
import { showPasswordQuestion, showUsernameQuestion } from '../conditions';
import { validateCredentials } from '../validators';
import {
    abapDeployConfigInternalPromptNames,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions
} from '../../types';
import type { InputQuestion, PasswordQuestion, Question } from 'inquirer';

/**
 * Returns the username prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns input question for username
 */
function getUsernamePrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers> {
    return {
        when: (): Promise<boolean> => showUsernameQuestion(options),
        type: 'input',
        name: abapDeployConfigInternalPromptNames.username,
        message: t('prompts.auth.username.message'),
        guiOptions: {
            mandatory: true
        }
    } as InputQuestion<AbapDeployConfigAnswers>;
}

/**
 * Returns the password prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns password question for password
 */
function getPasswordPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers> {
    return {
        when: (): boolean => showPasswordQuestion(),
        type: 'password',
        name: abapDeployConfigInternalPromptNames.password,
        message: t('prompts.auth.password.message'),
        mask: '*',
        guiOptions: {
            type: 'login',
            mandatory: true
        },
        validate: (input: string, previousAnswers: AbapDeployConfigAnswers): Promise<boolean | string> =>
            validateCredentials(options, input, previousAnswers)
    } as PasswordQuestion<AbapDeployConfigAnswers>;
}

/**
 * Get the authentication prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for auth prompting
 */
export function getAuthPrompts(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers>[] {
    return [getUsernamePrompt(options), getPasswordPrompt(options)];
}
