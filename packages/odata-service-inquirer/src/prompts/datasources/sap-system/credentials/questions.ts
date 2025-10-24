import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ServiceProvider } from '@sap-ux/axios-extension';
import { isFullUrlDestination, isPartialUrlDestination, type Destination } from '@sap-ux/btp-utils';
import type { InputQuestion, PasswordQuestion } from '@sap-ux/inquirer-common';
import type { BackendSystem } from '@sap-ux/store';
import type { Answers } from 'inquirer';
import { t } from '../../../../i18n';
import { promptNames } from '../../../../types';
import { PromptState, removeCircularFromServiceProvider } from '../../../../utils';
import type { ConnectionValidator } from '../../../connectionValidator';
import type { ValidationResult } from '../../../types';
import type { SystemSelectionAnswerType } from '../system-selection/prompt-helpers';
import type { NewSystemAnswers } from '../new-system/types';

export enum BasicCredentialsPromptNames {
    systemUsername = 'systemUsername',
    systemPassword = 'systemPassword'
}
/**
 * Re-usable credentials prompts for connection to systems using basic auth.
 *
 * @param connectionValidator the connection validator to be used for the credentials validation
 * @param promptNamespace the namespace to be used for the prompts when used multiple times in the same prompt set
 * @param sapClient
 * @param sapClient.sapClient the sapClient value to be used along with the credentials validation
 * @param sapClient.isValid validation of credentials is deferred until a valid sapClient is provided or undefined
 * @returns the credentials prompts
 */
export function getCredentialsPrompts<T extends Answers>(
    connectionValidator: ConnectionValidator,
    promptNamespace?: string,
    sapClient?: { sapClient: string | undefined; isValid: boolean }
): (InputQuestion<T> | PasswordQuestion<T>)[] {
    const usernamePromptName = `${promptNamespace ? promptNamespace + ':' : ''}${
        BasicCredentialsPromptNames.systemUsername
    }`;
    const passwordPromptName = `${promptNamespace ? promptNamespace + ':' : ''}${
        BasicCredentialsPromptNames.systemPassword
    }`;

    // Optimization to prevent re-checking of auth
    let authRequired: boolean | undefined;

    return [
        {
            when: async () => {
                authRequired = await connectionValidator.isAuthRequired();
                return (
                    connectionValidator.systemAuthType === 'basic' && authRequired && (!sapClient || sapClient.isValid)
                );
            },
            type: 'input',
            name: usernamePromptName,
            message: t('prompts.systemUsername.message'),
            guiOptions: {
                mandatory: true
            },
            default: '',
            validate: (user: string) => user?.length > 0
        } as InputQuestion<T>,
        {
            when: () =>
                !!(connectionValidator.systemAuthType === 'basic' && authRequired && (!sapClient || sapClient.isValid)),
            type: 'password',
            guiOptions: {
                mandatory: true,
                applyDefaultWhenDirty: true // Reset when the system changes, this avoids automatic reauth with the existing creds if the user changes the system selection
            },
            guiType: 'login',
            name: passwordPromptName,
            message: t('prompts.systemPassword.message'),
            mask: '*',
            default: '',
            validate: async (password: string, answers: T): Promise<ValidationResult> => {
                if (
                    !(
                        connectionValidator.validatedUrl &&
                        answers?.[usernamePromptName] &&
                        password &&
                        (!sapClient || sapClient.isValid)
                    )
                ) {
                    return false;
                }
                // We may have a previously selected system
                const selectedSystem = answers?.[promptNames.systemSelection] as SystemSelectionAnswerType;
                let selectedSystemClient;
                let isSystem = true;
                if (selectedSystem?.type === 'backendSystem') {
                    selectedSystemClient = (selectedSystem.system as BackendSystem)?.client;
                } else if (selectedSystem?.type === 'destination') {
                    // Note no need to set the client as its specified by the destination itself
                    const destination = selectedSystem.system as Destination;
                    if (isFullUrlDestination(destination) || isPartialUrlDestination(destination)) {
                        isSystem = false;
                    }
                }

                const { valResult } = await connectionValidator.validateAuth(
                    connectionValidator.validatedUrl,
                    answers?.[usernamePromptName],
                    password,
                    {
                        sapClient: sapClient?.sapClient || selectedSystemClient,
                        isSystem
                    }
                );
                if (valResult === true && connectionValidator.serviceProvider) {
                    updatePromptStateWithConnectedSystem(connectionValidator.serviceProvider, selectedSystem, {
                        username: answers?.[usernamePromptName],
                        password: password
                    });
                    return true;
                }
                return valResult;
            },
            additionalMessages: (password: string, answers: T) => {
                // Since the odata service URL prompt has its own credentials prompts its safe to assume
                // that `ignoreCertError` when true means that the user has set the node setting to ignore cert errors and
                // not that the user has chosen to ignore the cert error for this specific connection (this is only supported by the odata service URL prompts).
                if (
                    connectionValidator.ignoreCertError &&
                    // This condition prevents showing the message twice as it will already be shown under the new system URL prompt.
                    (answers as NewSystemAnswers)?.newSystemType !== 'abapOnPrem'
                ) {
                    return {
                        message: t('warnings.certErrorIgnoredByNodeSetting'),
                        severity: Severity.warning
                    };
                }
            }
        } as PasswordQuestion<T>
    ];
}

/**
 * Updates the prompt state with the connected system.
 *
 * @param serviceProvider the connected system service provider which is used to update the prompt state
 * @param selectedSystem  the selected system, either a backend system or a destination
 * @param credentials
 * @param credentials.username the username
 * @param credentials.password the password
 */
function updatePromptStateWithConnectedSystem(
    serviceProvider: ServiceProvider,
    selectedSystem: SystemSelectionAnswerType,
    { username, password }: { username: string; password: string }
): void {
    PromptState.odataService.connectedSystem = {
        serviceProvider: removeCircularFromServiceProvider(serviceProvider)
    };
    // Update the existing backend system with the new credentials that may be used to update in the store.
    if (selectedSystem?.type === 'backendSystem') {
        const backendSystem = selectedSystem.system as BackendSystem;
        // Have the credentials changed..
        if (backendSystem.username !== username || backendSystem.password !== password) {
            PromptState.odataService.connectedSystem.backendSystem = Object.assign(backendSystem, {
                username: username,
                password,
                userDisplayName: username,
                newOrUpdated: true
            } as Partial<BackendSystem>);
        }
        // If the connection is successful and a destination was selected, assign the connected destination to the prompt state.
    } else if (selectedSystem?.type === 'destination') {
        PromptState.odataService.connectedSystem.destination = selectedSystem.system as Destination;
    }
}
