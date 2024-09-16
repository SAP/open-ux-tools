/**
 * New system prompting questions for re-use in multiple sap-system datasource prompt sets.
 */
import { withCondition, type InputQuestion, type ListQuestion } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { AuthenticationType, BackendSystem } from '@sap-ux/store';
import type { Answers, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { OdataServicePromptOptions, SapSystemType } from '../../../../types';
import { promptNames } from '../../../../types';
import { PromptState, convertODataVersionType } from '../../../../utils';
import type { ConnectionValidator, SystemAuthType } from '../../../connectionValidator';
import { getAbapOnBTPSystemQuestions } from '../abap-on-btp/questions';
import { getAbapOnPremQuestions } from '../abap-on-prem/questions';
import { suggestSystemName } from '../prompt-helpers';
import { validateSystemName } from '../validators';
import { newSystemPromptNames } from './types';

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
export interface NewSystemAnswers {
    [newSystemPromptNames.newSystemType]?: SapSystemType;
    [promptNames.userSystemName]?: string;
}

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
        case 'serviceKey':
            return AuthenticationType.OAuth2RefreshToken;
        case 'reentranceTicket':
            return AuthenticationType.ReentranceTicket;
        case 'basic':
            return AuthenticationType.Basic;
        default:
            return undefined;
    }
}

/**
 * Provides prompts that allow the creation of a new system connection.
 *
 * @param promptOptions options for the new system prompts see {@link OdataServicePromptOptions}
 * @returns questions for creating a new system connection
 */
export function getNewSystemQuestions(promptOptions?: OdataServicePromptOptions): Question<NewSystemAnswers>[] {
    const questions: Question<NewSystemAnswers>[] = [
        {
            type: 'list',
            name: newSystemPromptNames.newSystemType,
            choices: [
                { name: t('prompts.newSystemType.choiceAbapOnBtp'), value: 'abapOnBtp' as SapSystemType },
                { name: t('prompts.newSystemType.choiceAbapOnPrem'), value: 'abapOnPrem' as SapSystemType }
            ],
            message: t('prompts.newSystemType.message')
        } as ListQuestion<NewSystemAnswers>
    ];
    questions.push(
        ...withCondition(
            getAbapOnPremQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnPrem'
        )
    );
    questions.push(
        ...withCondition(
            getAbapOnBTPSystemQuestions(promptOptions) as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnBtp'
        )
    );
    return questions;
}

/**
 * Get the system url prompt. The system url prompt is used to connect to a new system using the user input system url.
 *
 * @param connectValidator a connection validator instance used to validate the system url
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 * @param requiredOdataVersion The required OData version for the system connection, only catalogs supporting the specifc odata version will be used.
 * @returns the system url prompt
 */
export function getSystemUrlQuestion<T extends Answers>(
    connectValidator: ConnectionValidator,
    promptNamespace?: string,
    requiredOdataVersion?: OdataVersion
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
            const valResult = await connectValidator.validateUrl(url, {
                isSystem: true,
                odataVersion: convertODataVersionType(requiredOdataVersion)
            });
            // If basic auth not required we should have an active connection
            if (valResult === true && !connectValidator.validity.authRequired && connectValidator.serviceProvider) {
                PromptState.odataService.connectedSystem = {
                    serviceProvider: connectValidator.serviceProvider
                };
            }
            return valResult;
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
                        serviceKeys: connectValidator.serviceInfo,
                        userDisplayName: connectValidator.connectedUserName,
                        refreshToken: connectValidator.refreshToken,
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

