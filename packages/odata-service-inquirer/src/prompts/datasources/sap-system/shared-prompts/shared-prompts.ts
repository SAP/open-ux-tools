/**
 * New system prompting questions for re-use in multiple sap-system datasource prompt sets.
 */
import { type InputQuestion } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { AuthenticationType, BackendSystem, getBackendSystemType } from '@sap-ux/store';
import type { Answers } from 'inquirer';
import { t } from '../../../../i18n';
import type { ConnectedSystem } from '../../../../types';
import { promptNames } from '../../../../types';
import {
    PromptState,
    convertODataVersionType,
    isBackendSystemKeyExisting,
    removeCircularFromServiceProvider
} from '../../../../utils';
import type { ConnectionValidator, SystemAuthType } from '../../../connectionValidator';
import { type NewSystemAnswers, newSystemPromptNames } from '../new-system/types';
import { suggestSystemName } from '../prompt-helpers';
import { validateSystemName } from '../validators';
import { Severity } from '@sap-devx/yeoman-ui-types';

/**
 * Convert the system connection scheme (Service Key, Rentrance Ticket, etc) to the store specific authentication type.
 * Note the absence of CF Discovery, in this case the service key file (UAA) is also used for the Abap connectivity.
 *
 * @param systemAuthType The system authentication type
 * @returns The store specific authentication type
 */
function systemAuthTypeToAuthenticationType(
    systemAuthType: SystemAuthType | undefined
): AuthenticationType | undefined {
    switch (systemAuthType) {
        case 'serviceKey' /** @deprecated All cloud auth is reentrance ticket based, legacy stored entries are still supported */:
            return AuthenticationType.ReentranceTicket;
        case 'reentranceTicket':
            return AuthenticationType.ReentranceTicket;
        case 'basic':
            return AuthenticationType.Basic;
        default:
            return undefined;
    }
}
/**
 * Get the system url prompt. The system url prompt is used to connect to a new system using the user input system url.
 *
 * @param connectValidator a connection validator instance used to validate the system url
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 * @param requiredOdataVersion The required OData version for the system connection, only catalogs supporting the specifc odata version will be used.
 * @param cachedConnectedSystem An existing connection may be passed which will prevent reauthentication
 * @param showExistingSystemWarning if the url exists in secure store a validation message will be returned
 * @returns the system url prompt
 */
export function getSystemUrlQuestion<T extends Answers>(
    connectValidator: ConnectionValidator,
    promptNamespace?: string,
    requiredOdataVersion?: OdataVersion,
    cachedConnectedSystem?: ConnectedSystem,
    showExistingSystemWarning = true
): InputQuestion<T> {
    const promptName = `${promptNamespace ? promptNamespace + ':' : ''}${newSystemPromptNames.newSystemUrl}`;
    const newSystemUrlQuestion = {
        type: 'input',
        name: promptName,
        message: t('prompts.systemUrl.message'),
        guiOptions: {
            hint: t('prompts.systemUrl.description'),
            mandatory: true,
            breadcrumb: true
        },
        validate: async (url) => {
            PromptState.resetConnectedSystem();
            // Backend systems validation supports using a cached connections from a previous step execution to prevent re-authentication (e.g. re-opening a browser window)
            // Only in the case of re-entrance tickets will we reuse an existing connection.
            if (
                cachedConnectedSystem &&
                cachedConnectedSystem.backendSystem?.url === url &&
                cachedConnectedSystem.backendSystem?.authenticationType === 'reentranceTicket'
            ) {
                connectValidator.setConnectedSystem(cachedConnectedSystem);
            } else if (showExistingSystemWarning) {
                const existingBackend = isBackendSystemKeyExisting(PromptState.backendSystemsCache, url);
                if (existingBackend) {
                    // Not a cached connection so re-validate as new backend system entry
                    return t('prompts.validationMessages.backendSystemExistsWarning', {
                        backendName: existingBackend.name
                    });
                }
            }
            const valResult = await connectValidator.validateUrl(url, {
                isSystem: true,
                odataVersion: convertODataVersionType(requiredOdataVersion)
            });
            // If basic auth not required we should have an active connection and be authenticated
            if (valResult === true) {
                if (connectValidator.validity.authenticated && connectValidator.serviceProvider) {
                    PromptState.odataService.connectedSystem = {
                        serviceProvider: removeCircularFromServiceProvider(connectValidator.serviceProvider)
                    };
                } else {
                    // otherwise we need to try basic auth
                    connectValidator.systemAuthType = 'basic';
                }
            }
            return valResult;
        },
        additionalMessages: () => {
            if (connectValidator.ignoreCertError) {
                return {
                    message: t('warnings.certErrorIgnoredByNodeSetting'),
                    severity: Severity.warning
                };
            }
        }
    } as InputQuestion<T>;

    return newSystemUrlQuestion;
}

/**
 * Get a prompt for new system name.
 *
 * @param connectValidator A reference to the active connection validator,
 *     at prompt execution time the connection properties will be used to create a new BackendSystem, set into the PromptState.odataService.connectedSystem
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 *     This prevents conflicts with other prompts of the same types where the same prompt is used by multiple other prompts but cannot share the name.
 * @returns the new system name prompt
 */
export function getUserSystemNameQuestion(
    connectValidator: ConnectionValidator,
    promptNamespace?: string
): InputQuestion<Partial<NewSystemAnswers>> {
    let defaultSystemName: string;
    let userModifiedSystemName: boolean = false;
    const promptNamespacePart = `${promptNamespace ? promptNamespace + ':' : ''}`;
    const promptName = `${promptNamespacePart}${promptNames.userSystemName}`;

    const newSystemNamePrompt = {
        type: 'input',
        guiOptions: {
            hint: t('prompts.systemName.hint'),
            applyDefaultWhenDirty: true,
            breadcrumb: true,
            mandatory: true
        },
        name: promptName,
        message: t('prompts.systemName.message'),
        default: async () => {
            const systemName = connectValidator.connectedSystemName;
            if (systemName && !userModifiedSystemName) {
                defaultSystemName = await suggestSystemName(systemName, connectValidator.validatedClient);
                return defaultSystemName;
            }
            return defaultSystemName;
        },
        validate: async (systemName: string) => {
            if (!systemName) {
                return false;
            }
            let isValid: string | boolean = false;
            // Dont validate the suggested default system name
            if (systemName === defaultSystemName) {
                isValid = true;
            } else {
                userModifiedSystemName = true;
                defaultSystemName = systemName;
                isValid = await validateSystemName(systemName);
            }

            if (isValid === true) {
                // Update or create the BackendSystem with the new system details for persistent storage
                if (connectValidator.validatedUrl && PromptState.odataService.connectedSystem) {
                    const backendSystem = new BackendSystem({
                        authenticationType: systemAuthTypeToAuthenticationType(connectValidator.systemAuthType),
                        name: systemName,
                        url: connectValidator.validatedUrl,
                        client: connectValidator.validatedClient,
                        username: connectValidator.axiosConfig?.auth?.username,
                        password: connectValidator.axiosConfig?.auth?.password,
                        serviceKeys: connectValidator.serviceInfo, // This will not be persisted and is only used to determine cached connection equality for CF provided uaa keys
                        userDisplayName: connectValidator.connectedUserName,
                        systemType: getBackendSystemType({
                            serviceKeys: connectValidator.serviceInfo,
                            authenticationType: connectValidator.systemAuthType
                        } as BackendSystem)
                    });
                    PromptState.odataService.connectedSystem.backendSystem = backendSystem;
                    PromptState.odataService.connectedSystem.backendSystem.newOrUpdated = true;
                }
            }
            return isValid;
        }
    } as InputQuestion<Partial<NewSystemAnswers>>;

    return newSystemNamePrompt;
}
