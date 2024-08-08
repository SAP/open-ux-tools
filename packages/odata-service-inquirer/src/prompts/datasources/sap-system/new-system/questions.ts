/**
 * New system prompting questions for re-use in multiple sap-system datasource prompt sets.
 */
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { CatalogService, V2CatalogService } from '@sap-ux/axios-extension';
import { ODataVersion, ServiceType } from '@sap-ux/axios-extension';
import { PromptSeverityMessage, searchChoices, type ListQuestion } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { AuthenticationType, BackendSystem } from '@sap-ux/store';
import type { Answers, InputQuestion, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { OdataServiceAnswers, OdataServicePromptOptions, SapSystemType, ValidationLink } from '../../../../types';
import { promptNames } from '../../../../types';
import { PromptState, convertODataVersionType } from '../../../../utils';
import type { ConnectionValidator, SystemAuthType } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { suggestSystemName } from '../prompt-helpers';
import { validateSystemName } from '../validators';
import { getServiceChoices, getServiceDetails, getServiceType } from './service-helper';
import type { ServiceAnswer } from './types';

// New system choice value is a hard to guess string to avoid conflicts with existing system names or user named systems
// since it will be used as a new system value in the system selection prompt.
export const newSystemChoiceValue = '!@£*&937newSystem*X~qy^';

export const newSystemPromptNames = {
    newSystemType: 'newSystemType',
    newSystemUrl: 'newSystemUrl',
    newSystemAuthType: 'newSystemAuthType'
} as const;

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
export interface NewSystemAnswers {
    [newSystemPromptNames.newSystemType]?: SapSystemType;
    [newSystemPromptNames.newSystemUrl]?: string;
    [promptNames.userSystemName]?: string;
}
const systemSelectionPromptNames = {
    system: 'system'
} as const;

export interface SystemSelectionAnswer extends OdataServiceAnswers {
    [systemSelectionPromptNames.system]?: string;
}

/**
 * Convert the system connection scheme (Service Key, CF Discovery, Rentrance Ticket, etc) to the store specific authentication type.
 *
 * @param systemAuthType
 */
function systemAuthTypeToAuthenticationType(systemAuthType: SystemAuthType): AuthenticationType | undefined {
    switch (systemAuthType) {
        case 'serviceKey':
            return AuthenticationType.OAuth2RefreshToken;
        case 'cloudFoundry':
            return AuthenticationType.OAuth2ClientCredential;
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
/* export function getNewSystemQuestions(promptOptions?: OdataServicePromptOptions): Question<NewSystemAnswers>[] {
    const questions: Question<NewSystemAnswers>[] = [
        {
            type: 'list',
            name: newSystemPromptNames.newSystemType,
            choices: [
                { name: t('prompts.newSystemType.choiceAbapOnBtp'), value: 'abapOnBtp' as SapSystemType },
                { name: t('prompts.newSystemType.choiceAbapOnPrem'), value: 'abapOnPrem' as SapSystemType }
            ],
            message: t('prompts.newSystemType.message'),
            additionalMessages: (systemType: SapSystemType) => {
                if (['abapOnBtp'].includes(systemType)) {
                    LoggerHelper.logger?.warn(t('prompts.systemType.notYetImplementedWarningMessage', { systemType }));
                    return {
                        message: t('prompts.systemType.notYetImplementedWarningMessage', { systemType }),
                        severity: Severity.warning
                    };
                }
            }
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
            getAbapOnBTPSystemQuestions() as Question[],
            (answers: Answers) => (answers as NewSystemAnswers).newSystemType === 'abapOnBtp'
        )
    );

    return questions;
} */

/**
 * Get the system url prompt. The system url prompt is used to connect to a new system using the user input system url.
 *
 * @param nameModifier To support parallel re-use each instance of the propmt must have a unique name, and refer to uniquely named answers
 * @param connectValidator
 * @param promptNamespace
 * @param requiredOdataVersion
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
            if (valResult === true && !connectValidator.validity.authRequired) {
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
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers. This is used to avoid conflicts with other prompts of the same types.
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
            breadcrumb: true
        },
        name: promptName,
        message: t('prompts.systemName.message'),
        default: async (answers: Partial<NewSystemAnswers>) => {
            const systemUrl = connectValidator.validatedUrl;
            if (systemUrl && !userModifiedSystemName) {
                defaultSystemName = await suggestSystemName(systemUrl, connectValidator.axiosConfig.params?.sapClient);
                return defaultSystemName;
            }
            return answers.userSystemName;
        },
        validate: async (systemName: string) => {
            // Dont validate the suggested default system name
            if (systemName === defaultSystemName) {
                return true;
            }
            const validationResult = await validateSystemName(systemName);

            if (validationResult === true) {
                // Not the default system name, so the user modified
                userModifiedSystemName = true;
                // Update or create the BackendSystem with the new system details for persistent storage
                if (connectValidator.validatedUrl && PromptState.odataService.connectedSystem) {
                    const backendSystem = new BackendSystem({
                        authenticationType: systemAuthTypeToAuthenticationType(connectValidator.systemAuthType),
                        name: systemName,
                        url: connectValidator.validatedUrl,
                        client: connectValidator.axiosConfig.params?.sapClient,
                        username: connectValidator.axiosConfig.auth?.username,
                        password: connectValidator.axiosConfig.auth?.password
                    });
                    PromptState.odataService.connectedSystem.backendSystem = backendSystem;
                }
            }
            return isValid;
        }
    } as InputQuestion<Partial<NewSystemAnswers>>;

    return newSystemNamePrompt;
}

/**
 * Get the service selection prompt for a system connection. The service selection prompt is used to select a service from the system catalog.
 *
 * @param connectValidator A reference to the active connection validator, used to validate the service selection and retrieve service details.
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 *     This is used to avoid conflicts with other prompts of the same types.
 * @param promptOptions Options for the service selection prompt see {@link OdataServicePromptOptions}
 */
export function getSystemServiceQuestion<T extends Answers>(
    connectValidator: ConnectionValidator,
    promptNamespace: string,
    promptOptions?: OdataServicePromptOptions
): Question<T> {
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[] = [];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system is changed
    let previousSystemUrl: string | undefined;
    let previousService: ServiceAnswer | undefined;
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;

    const newSystemServiceQuestion = {
        when: (): boolean =>
            connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
        name: `${promptNamespace}:${promptNames.serviceSelection}`,
        type: promptOptions?.serviceSelection?.useAutoComplete ? 'autocomplete' : 'list',
        message: t('prompts.systemService.message'),
        guiOptions: {
            breadcrumb: t('prompts.systemService.breadcrumb'),
            mandatory: true
        },
        source: (prevAnswers: T, input: string) => searchChoices(input, serviceChoices as ListChoiceOptions[]),
        choices: async () => {
            if (serviceChoices.length === 0 || previousSystemUrl !== connectValidator.validatedUrl) {
                let catalogs: CatalogService[] = [];
                if (requiredOdataVersion) {
                    catalogs.push(connectValidator.catalogs[requiredOdataVersion]);
                } else {
                    catalogs = Object.values(connectValidator.catalogs);
                }
                previousSystemUrl = connectValidator.validatedUrl;
                serviceChoices = await getServiceChoices(catalogs);
            }
            return serviceChoices;
        },
        additionalMessages: (selectedService: ServiceAnswer) =>
            getServiceMessage(serviceChoices, selectedService, connectValidator, requiredOdataVersion),
        default: () => (serviceChoices?.length > 1 ? undefined : 0),
        // Warning: only executes in YUI not cli
        validate: async (service: ServiceAnswer): Promise<string | boolean | ValidationLink> => {
            if (!connectValidator.validatedUrl) {
                return false;
            }
            // Dont re-request the same service details
            if (service && previousService?.servicePath !== service.servicePath) {
                previousService = service;
                return getServiceDetails(service, connectValidator.validatedUrl, connectValidator);
            }
            return true;
        }
    } as ListQuestion<T>;

    return newSystemServiceQuestion;
}

/**
 *
 * @param serviceChoices
 * @param selectedService
 * @param connectValidator
 * @param requiredOdataVersion
 */
async function getServiceMessage(
    serviceChoices: ListChoiceOptions<ServiceAnswer>[],
    selectedService: ServiceAnswer,
    connectValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<IMessageSeverity | undefined> {
    if (serviceChoices?.length === 0) {
        if (requiredOdataVersion) {
            return {
                message: t('prompts.warnings.noServicesAvailableForOdataVersion', {
                    odataVersion: requiredOdataVersion
                }),
                severity: Severity.warning
            };
        } else {
            return {
                message: t('prompts.warnings.noServicesAvailable'),
                severity: Severity.warning
            };
        }
    }
    if (selectedService) {
        let serviceType = selectedService.serviceType;
        if (selectedService.serviceODataVersion === ODataVersion.v2) {
            serviceType = await getServiceType(
                selectedService.servicePath,
                selectedService.serviceType,
                connectValidator.catalogs[ODataVersion.v2] as V2CatalogService
            );
        }
        if (serviceType && serviceType !== ServiceType.UI) {
            return {
                message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
                severity: Severity.warning
            };
        }
    }
}
