import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { getConfiguredProvider, getSystemUI5Version } from '@sap-ux/adp-tooling';
import type { InputQuestion, PasswordQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n';
import type { Credentials } from '../../types';
import { configPromptNames } from '../../app/types';

/**
 * Returns the username prompt.
 *
 * @param {AbapTarget} abapTarget - The ABAP target.
 * @param {ToolsLogger} logger - The logger.
 * @returns {YUIQuestion<Credentials>[]} The username prompt.
 */
export function getCredentialsPrompts(abapTarget: AbapTarget, logger: ToolsLogger): YUIQuestion<Credentials>[] {
    return [getUsernamePrompt(), getPasswordPrompt(abapTarget, logger)];
}

/**
 * Returns the username prompt.
 *
 * @returns {InputQuestion<Credentials>} The username prompt.
 */
function getUsernamePrompt(): InputQuestion<Credentials> {
    return {
        type: 'input',
        name: configPromptNames.username,
        message: t('prompts.usernameLabel'),
        validate: validateEmptyString,
        guiOptions: {
            mandatory: true
        }
    };
}

/**
 * Returns the password prompt.
 *
 * @param {AbapTarget} abapTarget - The ABAP target.
 * @param {ToolsLogger} logger - The logger.
 * @returns {PasswordQuestion<Credentials>} The password prompt.
 */
function getPasswordPrompt(abapTarget: AbapTarget, logger: ToolsLogger): PasswordQuestion<Credentials> {
    const system = (isAppStudio() ? abapTarget.destination : abapTarget.url) ?? '';
    return {
        type: 'password',
        name: configPromptNames.password,
        message: t('prompts.passwordLabel'),
        mask: '*',
        guiOptions: {
            mandatory: true,
            type: 'login'
        },
        validate: async (value: string, answers: Credentials): Promise<boolean | string> => {
            const validationResult = validateEmptyString(value);
            if (typeof validationResult === 'string') {
                return validationResult;
            }

            if (!answers.username) {
                return t('error.pleaseProvideAllRequiredData');
            }

            try {
                const options = {
                    system,
                    client: abapTarget.client ?? '',
                    username: answers.username,
                    password: value
                };

                const abapProvider = await getConfiguredProvider(options, logger);
                await getSystemUI5Version(abapProvider);

                return true;
            } catch (e) {
                return e.response ? `Login failed: ${e.response.status} ${e.response.statusText}` : 'Login failed.';
            }
        }
    };
}
