import { isAppStudio } from '@sap-ux/btp-utils';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { getConfiguredProvider } from '@sap-ux/adp-tooling';
import type { InputQuestion, PasswordQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import { t } from '../../utils/i18n';
import type { Credentials } from '../../types';
import { configPromptNames } from '../../app/types';
import type { LayeredRepositoryService } from '@sap-ux/axios-extension';

interface ClientCredentials {
    system: string;
    client: string;
    username: string;
    password: string;
}

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
                const credentials = {
                    system,
                    client: abapTarget.client ?? '',
                    username: answers.username,
                    password: value
                };

                await assertAuthenticated(credentials, logger);

                return true;
            } catch (e) {
                return e.response ? `Login failed: ${e.response.status} ${e.response.statusText}` : 'Login failed.';
            }
        }
    };
}

/**
 * Helper function which asserts whether a client is authenticated on an ABAP system or throws.
 * Since we do not have a dedicated api call to detect if a client is authenticated we use the
 * {@link LayeredRepositoryService.getSystemInfo} call which is a protected one.
 *
 * @param {ClientCredentials} credentials - Object containing client credentials to a specific ABAP system.
 * @param {ToolsLogger} logger - The logger instance.
 * @returns {Promise<void>} A promise resolved if the client is authenticated, otherwise rejected with
 * an error.
 */
async function assertAuthenticated(credentials: ClientCredentials, logger: ToolsLogger): Promise<void> {
    const abapProvider = await getConfiguredProvider(credentials, logger);
    const layeredRepositoryService = abapProvider.getLayeredRepository();
    await layeredRepositoryService.getSystemInfo();
}
