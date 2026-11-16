import { t } from '../../i18n.js';
import { showPasswordQuestion, showUsernameQuestion } from '../conditions.js';
import { validateCredentials } from '../validators.js';
import {
    promptNames,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapDeployConfigQuestion
} from '../../types.js';
import type { Validator } from '@sap-ux/inquirer-common';
import type { IValidationLink } from '@sap-devx/yeoman-ui-types';

/**
 * Returns the username prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns input question for username
 */
function getUsernamePrompt(options: AbapDeployConfigPromptOptions): AbapDeployConfigQuestion {
    return {
        when: (): Promise<boolean> => showUsernameQuestion(options.backendTarget),
        type: 'input',
        name: promptNames.username,
        message: t('prompts.auth.username.message'),
        guiOptions: {
            mandatory: true
        }
    };
}

/**
 * Returns the password prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns password question for password
 */
function getPasswordPrompt(options: AbapDeployConfigPromptOptions): AbapDeployConfigQuestion {
    // `validateCredentials` returns a rich `IValidationLink`, which inquirer 13's password arm
    // `validate` (mirrored by `Validator`) does not permit — YeomanUI renders the link, the CLI
    // relies on its `toString()`. Casting only the validator keeps the rest of the prompt checked.
    const validate = (async (
        input: string,
        previousAnswers: Partial<AbapDeployConfigAnswersInternal> = {}
    ): Promise<boolean | string | IValidationLink> =>
        await validateCredentials(
            input,
            previousAnswers,
            options.backendTarget,
            options.adpProjectType
        )) as Validator<AbapDeployConfigAnswersInternal>;
    return {
        when: (): boolean => showPasswordQuestion(),
        type: 'password',
        name: promptNames.password,
        message: t('prompts.auth.password.message'),
        mask: '*',
        guiOptions: {
            type: 'login',
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        default: '',
        validate
    };
}

/**
 * Get the authentication prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for auth prompting
 */
export function getAuthPrompts(options: AbapDeployConfigPromptOptions): AbapDeployConfigQuestion[] {
    return [getUsernamePrompt(options), getPasswordPrompt(options)];
}
