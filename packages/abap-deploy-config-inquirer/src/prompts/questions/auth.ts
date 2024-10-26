import { t } from '../../i18n';
import { showPasswordQuestion, showUsernameQuestion } from '../conditions';
import { validateCredentials } from '../validators';
import { promptNames, type AbapDeployConfigAnswersInternal, type AbapDeployConfigPromptOptions } from '../../types';
import type { InputQuestion, PasswordQuestion, Question } from 'inquirer';

/**
 * Returns the username prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns input question for username
 */
function getUsernamePrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (): Promise<boolean> => showUsernameQuestion(options.backendTarget),
        type: 'input',
        name: promptNames.username,
        message: t('prompts.auth.username.message'),
        guiOptions: {
            mandatory: true
        }
    } as InputQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the password prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns password question for password
 */
function getPasswordPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (): boolean => showPasswordQuestion(),
        type: 'password',
        name: promptNames.password,
        message: t('prompts.auth.password.message'),
        mask: '*',
        guiOptions: {
            type: 'login',
            mandatory: true
        },
        validate: async (input: string, previousAnswers: AbapDeployConfigAnswersInternal): Promise<boolean | string> =>
            await validateCredentials(input, previousAnswers, options.backendTarget)
    } as PasswordQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Get the authentication prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for auth prompting
 */
export function getAuthPrompts(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal>[] {
    return [getUsernamePrompt(options), getPasswordPrompt(options)];
}
