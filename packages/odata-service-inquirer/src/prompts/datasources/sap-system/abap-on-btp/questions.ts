import {
    type Destination,
    type ServiceInfo,
    createOAuth2UserTokenExchangeDest,
    generateABAPCloudDestinationName,
    isAppStudio
} from '@sap-ux/btp-utils';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { type ListQuestion, ERROR_TYPE, getCFAbapInstanceChoices, withCondition } from '@sap-ux/inquirer-common';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { type ServiceInstanceInfo, apiGetInstanceCredentials } from '@sap/cf-tools';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { ConnectedSystem, OdataServiceAnswers, OdataServicePromptOptions } from '../../../../types';
import {
    getDefaultChoiceIndex,
    getPromptHostEnvironment,
    isBackendSystemKeyExisting,
    PromptState,
    removeCircularFromServiceProvider
} from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { errorHandler } from '../../../prompt-helpers';
import type { ValidationResult } from '../../../types';
import { newSystemPromptNames } from '../new-system/types';
import { type ServiceAnswer, getSystemServiceQuestion } from '../service-selection';
import { getSystemUrlQuestion, getUserSystemNameQuestion } from '../shared-prompts/shared-prompts';
import { connectWithDestination } from '../system-selection/prompt-helpers';

const abapOnBtpPromptNamespace = 'abapOnBtp';
const systemUrlPromptName = `${abapOnBtpPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;
const cliCfAbapServicePromptName = 'cliCfAbapService';

const abapOnBtpPromptNames = {
    'abapOnBtpAuthType': 'abapOnBtpAuthType',
    'cloudFoundryAbapSystem': 'cloudFoundryAbapSystem'
} as const;

export type AbapOnBTPType = 'cloudFoundry' | 'reentranceTicket';

interface AbapOnBtpAnswers extends Partial<OdataServiceAnswers> {
    [abapOnBtpPromptNames.abapOnBtpAuthType]?: AbapOnBTPType;
    [systemUrlPromptName]?: string;
    [abapOnBtpPromptNames.cloudFoundryAbapSystem]?: ServiceInstanceInfo;
}

/**
 * Get the questions for the ABAP on BTP system within the VSCode platform. The questions will prompt the user for the system type (Cloud Foundry, Service Key, Re-entrance Ticket).
 *
 * @param promptOptions The prompt options which control the service selection and system name]
 * @param cachedConnectedSystem if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns The list of questions for the ABAP on BTP system
 */
export function getAbapOnBTPSystemQuestions(
    promptOptions?: OdataServicePromptOptions,
    cachedConnectedSystem?: ConnectedSystem
): Question<AbapOnBtpAnswers & ServiceAnswer>[] {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();
    const questions: Question<AbapOnBtpAnswers & ServiceAnswer>[] = [];
    questions.push({
        type: 'list',
        name: abapOnBtpPromptNames.abapOnBtpAuthType,
        choices: [
            { name: t('prompts.abapOnBTPType.choiceCloudFoundry'), value: 'cloudFoundry' as AbapOnBTPType },
            { name: t('prompts.abapOnBTPType.choiceReentranceTicket'), value: 'reentranceTicket' as AbapOnBTPType }
        ],
        message: t('prompts.abapOnBTPType.message'),
        // Only runs on YUI, but we only need to reset on YUI as the user cannot change previous values on the Yo CLI
        validate: () => {
            connectValidator.resetConnectionState();
            return true;
        }
    } as ListQuestion);

    // Re-entrance ticket system prompt
    questions.push(
        withCondition(
            [
                getSystemUrlQuestion<AbapOnBtpAnswers>(
                    connectValidator,
                    abapOnBtpPromptNamespace,
                    promptOptions?.serviceSelection?.requiredOdataVersion,
                    cachedConnectedSystem
                )
            ],
            (answers: AbapOnBtpAnswers) => {
                if (answers?.abapOnBtpAuthType === 'reentranceTicket') {
                    connectValidator.systemAuthType = answers.abapOnBtpAuthType;
                    return true;
                }
                return false;
            }
        )[0],
        ...withCondition(
            [...getCFDiscoverPrompts(connectValidator, undefined, undefined, cachedConnectedSystem)],
            (answers: AbapOnBtpAnswers) => answers?.abapOnBtpAuthType === 'cloudFoundry'
        )
    );

    // New system store name propmt
    if (promptOptions?.userSystemName?.hide !== true) {
        // New system question will allow user to give the system a user friendly name
        questions.push(
            withCondition(
                [getUserSystemNameQuestion(connectValidator, abapOnBtpPromptNamespace)],
                () =>
                    !!connectValidator.validatedUrl &&
                    connectValidator.validity.reachable === true &&
                    (connectValidator.validity.authenticated ?? connectValidator.validity.authRequired !== true)
            )[0]
        );
    }

    // Service selection prompt
    questions.push(
        ...getSystemServiceQuestion(connectValidator, abapOnBtpPromptNamespace, promptOptions?.serviceSelection)
    );
    return questions;
}

/**
 * Validate the service info (returned from cf-tools APIs) for an ABAP on BTP system. This function will validate the service key file, or on BAS will create a new destination,
 * and validate the connection to the ABAP system. Updates the prompt state with the connected system to be later used for catalog service selection.
 *
 * @param abapService the abap service as provided by CF tools {@link ServiceInstanceInfo}
 * @param connectionValidator connection validator instance
 * @param requiredOdataVersion
 * @param isCli validation on CLI ill throw rather than returning a validation message as users cannot change previous answers on CLI
 * @param cachedConnectedSystem
 * @returns true if the service info is valid, a validation message if the service info is invalid, or a validation link if the service info is not validated but some help is available
 */
async function validateCFServiceInfo(
    abapService: ServiceInstanceInfo,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion,
    isCli = false,
    cachedConnectedSystem?: ConnectedSystem
): Promise<ValidationResult> {
    PromptState.resetConnectedSystem();
    const cfAbapServiceName = abapService.label;
    const uaaCreds = await apiGetInstanceCredentials(cfAbapServiceName); // should be abapService.serviceName in BAS?

    if (!uaaCreds?.credentials?.uaa) {
        return t('errors.cfInstanceCredentialsNotReturned', { serviceInstanceName: cfAbapServiceName });
    }

    let valResult: ValidationResult = true;
    let destination: Destination | undefined;
    if (getPromptHostEnvironment() === hostEnvironment.bas) {
        try {
            destination = await createOAuth2UserTokenExchangeDest(
                cfAbapServiceName,
                {
                    uaaCredentials: uaaCreds.credentials.uaa,
                    hostUrl: uaaCreds.credentials.url
                },
                LoggerHelper.logger
            );
            valResult = await connectWithDestination(destination, connectionValidator, requiredOdataVersion);
        } catch (error) {
            // If a user doesn't have subaccount admin rights they can't create/update destinations on CF
            valResult = error.message;
        }
    } else {
        // Backend systems validation supports using a cached connections from a previous step execution to prevent re-authentication (e.g. re-opening a browser window)
        // In case the user has changed the URL, do not use the cached connection.
        if (
            cachedConnectedSystem &&
            cachedConnectedSystem.backendSystem?.url === (uaaCreds.credentials as ServiceInfo).url &&
            JSON.stringify((cachedConnectedSystem.backendSystem.serviceKeys as ServiceInfo)?.uaa) ===
                JSON.stringify((uaaCreds.credentials as ServiceInfo).uaa)
        ) {
            connectionValidator.setConnectedSystem(cachedConnectedSystem);
        }
        valResult = await connectionValidator.validateServiceInfo(uaaCreds.credentials);
    }

    if (!isCli && valResult !== true) {
        return valResult;
    }
    // CLI only - we throw to exit as the user cannot change the previous answers
    // Cannot authenticate, nothing can be done
    if (isCli && typeof valResult === 'string') {
        LoggerHelper.logger.error(valResult);
        throw new Error(valResult);
    }
    // Cannot authenticate, nothing can be done
    if (isCli && valResult === false) {
        LoggerHelper.logger.error(errorHandler.getErrorMsg() ?? t('errors.abapServiceAuthenticationFailed'));
        throw new Error(t('errors.abapServiceAuthenticationFailed'));
    }
    // CLI only ^^^

    if (connectionValidator.serviceProvider && getPromptHostEnvironment() !== hostEnvironment.bas) {
        // Connected system name is only used for VSCode as a default stored system name
        connectionValidator.connectedSystemName = await generateABAPCloudDestinationName(cfAbapServiceName);
        PromptState.odataService.connectedSystem = {
            serviceProvider: removeCircularFromServiceProvider(connectionValidator.serviceProvider)
        };
    }
    return true;
}

/**
 * Get the Cloud Foundry Abap system discovery prompt. This prompt will list all available ABAP environments in the connected Cloud Foundry space.
 * If the Cloud Foundry connection fails, a warning message will be displayed.
 *
 * @param connectionValidator The connection validator
 * @param promptNamespace
 * @param requiredOdataVersion
 * @param cachedConnectedSystem if available passing an already connected system connection will prevent re-authentication for re-entrance ticket and service keys connection types
 * @returns The Cloud Foundry ABAP system discovery prompt
 */
export function getCFDiscoverPrompts(
    connectionValidator: ConnectionValidator,
    promptNamespace?: string,
    requiredOdataVersion?: OdataVersion,
    cachedConnectedSystem?: ConnectedSystem
): Question[] {
    let choices: ListChoiceOptions<ServiceInstanceInfo>[] = [];
    const promptName = `${promptNamespace ? promptNamespace + ':' : ''}${abapOnBtpPromptNames.cloudFoundryAbapSystem}`;

    const questions: Question[] = [
        {
            type: 'list',
            name: promptName,
            guiOptions: {
                breadcrumb: true,
                applyDefaultWhenDirty: true
            },
            choices: async () => {
                choices = await getCFAbapInstanceChoices(errorHandler);
                // Cannot continue if no ABAP environments are found on Yo CLI
                if (choices.length === 0) {
                    if (getPromptHostEnvironment() === hostEnvironment.cli) {
                        throw new Error(t('errors.abapEnvsUnavailable'));
                    }
                }
                return choices;
            },
            default: () => getDefaultChoiceIndex(choices as Answers[]),
            message: t('prompts.cloudFoundryAbapSystem.message'),
            validate: async (abapService: ServiceInstanceInfo): Promise<ValidationResult> => {
                if (abapService) {
                    const valResult = await validateCFServiceInfo(
                        abapService,
                        connectionValidator,
                        requiredOdataVersion,
                        getPromptHostEnvironment() === hostEnvironment.cli,
                        cachedConnectedSystem
                    );
                    // If the system exists already stop progress
                    if (!isAppStudio() && valResult === true && connectionValidator.validatedUrl) {
                        const existingBackend = isBackendSystemKeyExisting(
                            PromptState.backendSystemsCache,
                            connectionValidator.validatedUrl,
                            connectionValidator.validatedClient
                        );
                        if (existingBackend) {
                            // Invalidate the connection to prevent service selection
                            // This is a temp workaround until multiple systems with the same url/client key is supported
                            // This is necessary since the ServiceInstanceInfo does not include url/client information
                            connectionValidator.resetConnectionState(true);
                            // Cannot create a new store system with the same key
                            return t('prompts.validationMessages.backendSystemExistsWarning', {
                                backendName: existingBackend.name
                            });
                        }
                    }
                    return valResult;
                }
                const errorType = errorHandler.getCurrentErrorType();
                if (errorType === ERROR_TYPE.NO_ABAP_ENVS) {
                    const errorMsg = errorHandler.getErrorMsg(true);
                    const seeLogMsg = t('texts.seeLogForDetails');
                    return `${errorMsg} ${seeLogMsg}`;
                }
                return false;
            }
        } as ListQuestion
    ];

    // Only for CLI use as `list` prompt validation does not run on CLI
    if (getPromptHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: AbapOnBtpAnswers): Promise<boolean> => {
                const abapService = answers?.[abapOnBtpPromptNames.cloudFoundryAbapSystem];
                if (abapService) {
                    await validateCFServiceInfo(abapService, connectionValidator, requiredOdataVersion, true);
                }
                return false;
            },
            name: cliCfAbapServicePromptName
        } as Question);
    }

    return questions;
}
