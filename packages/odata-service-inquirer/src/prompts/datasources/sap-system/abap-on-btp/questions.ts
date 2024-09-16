import type { IValidationLink } from '@sap-devx/yeoman-ui-types';
import type { FileBrowserQuestion, ListQuestion } from '@sap-ux/inquirer-common';
import { withCondition } from '@sap-ux/inquirer-common';
import type { ServiceInstanceInfo } from '@sap/cf-tools';
import { apiGetInstanceCredentials, cfGetTarget } from '@sap/cf-tools';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { ERROR_TYPE } from '../../../../error-handler/error-handler';
import { t } from '../../../../i18n';
import { hostEnvironment, type OdataServiceAnswers, type OdataServicePromptOptions } from '../../../../types';
import { PromptState, getDefaultChoiceIndex, getHostEnvironment } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { errorHandler } from '../../../prompt-helpers';
import { getSystemUrlQuestion, getUserSystemNameQuestion } from '../new-system/questions';
import { newSystemPromptNames } from '../new-system/types';
import { validateServiceKey } from '../validators';
import { getABAPInstanceChoices } from './cf-helper';
import { type ServiceAnswer, getSystemServiceQuestion } from '../service-selection';

const abapOnBtpPromptNamespace = 'abapOnBtp';
const systemUrlPromptName = `${abapOnBtpPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;
const cliCfAbapServicePromptName = 'cliCfAbapService';

const abapOnBtpPromptNames = {
    'abapOnBtpAuthType': 'abapOnBtpAuthType',
    'serviceKey': 'serviceKey',
    'cloudFoundryAbapSystem': 'cloudFoundryAbapSystem'
} as const;

export type AbapOnBTPType = 'cloudFoundry' | 'serviceKey' | 'reentranceTicket';

interface AbapOnBtpAnswers extends Partial<OdataServiceAnswers> {
    [abapOnBtpPromptNames.abapOnBtpAuthType]?: AbapOnBTPType;
    [systemUrlPromptName]?: string;
    [abapOnBtpPromptNames.serviceKey]?: string;
    [abapOnBtpPromptNames.cloudFoundryAbapSystem]?: ServiceInstanceInfo;
}

/**
 * Get the questions for the ABAP on BTP system. The questions will prompt the user for the system type (Cloud Foundry, Service Key, Re-entrance Ticket).
 *
 * @param promptOptions The prompt options which control the service selection and system name]
 * @returns The list of questions for the ABAP on BTP system
 */
export function getAbapOnBTPSystemQuestions(promptOptions?: OdataServicePromptOptions): Question<AbapOnBtpAnswers & ServiceAnswer>[] {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();
    const questions: Question<AbapOnBtpAnswers & ServiceAnswer>[] = [];
    questions.push({
        type: 'list',
        name: abapOnBtpPromptNames.abapOnBtpAuthType,
        choices: [
            { name: t('prompts.abapOnBTPType.choiceCloudFoundry'), value: 'cloudFoundry' as AbapOnBTPType },
            { name: t('prompts.abapOnBTPType.choiceServiceKey'), value: 'serviceKey' as AbapOnBTPType },
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
                    promptOptions?.serviceSelection?.requiredOdataVersion
                )
            ],
            (answers: AbapOnBtpAnswers) => {
                if (answers?.abapOnBtpAuthType === 'reentranceTicket') {
                    connectValidator.systemAuthType = answers.abapOnBtpAuthType;
                    return true;
                }
                return false;
            }
        )[0]
    );

    // Service Key file prompt
    questions.push(
        withCondition(
            [getServiceKeyPrompt(connectValidator)],
            (answers: AbapOnBtpAnswers) => answers?.abapOnBtpAuthType === 'serviceKey'
        )[0]
    );

    questions.push(
        ...withCondition(
            [...getCFDiscoverPrompts(connectValidator)],
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
    questions.push(...getSystemServiceQuestion(connectValidator, abapOnBtpPromptNamespace, promptOptions));
    return questions;
}

/**
 * Validate the service info for the ABAP on BTP system. This function will validate the service key file and the connection to the ABAP system.
 * Updates the prompt state with the connected system.
 *
 * @param abapService the abap service as provided by CF tools
 * @param connectionValidator connection validator instance
 * @param isCli validation on CLI ill throw rather than returning a validation message as users cannot change previous answers on CLI
 * @returns true if the service info is valid, a validation message if the service info is invalid, or a validation link if the service info is not validated but some help is available
 */
async function validateServiceInfo(
    abapService: ServiceInstanceInfo,
    connectionValidator: ConnectionValidator,
    isCli = false
): Promise<boolean | string | IValidationLink> {
    const uaaCreds = await apiGetInstanceCredentials(abapService.label);
    const valResult = await connectionValidator.validateServiceInfo(uaaCreds.credentials);
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

    if (connectionValidator.serviceProvider) {
        // Create a unique connected system name based on the selected ABAP service
        const cfTarget = await cfGetTarget(true);
        connectionValidator.connectedSystemName = `abap-cloud-${abapService.label}-${cfTarget.org}-${cfTarget.space}`
            .replace(/[^\w]/gi, '-')
            .toLowerCase();
        PromptState.odataService.connectedSystem = {
            serviceProvider: connectionValidator.serviceProvider
        };
    }
    return true;
}

/**
 * Get the Cloud Foundry Abap system discovery prompt. This prompt will list all available ABAP environments in the connected Cloud Foundry space.
 * If the Cloud Foundry connection fails, a warning message will be displayed.
 *
 * @param connectionValidator The connection validator
 * @returns The Cloud Foundry ABAP system discovery prompt
 */
export function getCFDiscoverPrompts(connectionValidator: ConnectionValidator): Question[] {
    let choices: ListChoiceOptions<ServiceInstanceInfo>[] = [];
    const questions: Question[] = [
        {
            type: 'list',
            name: abapOnBtpPromptNames.cloudFoundryAbapSystem,
            guiOptions: {
                breadcrumb: true,
                applyDefaultWhenDirty: true
            },
            choices: async () => {
                choices = await getABAPInstanceChoices();
                // Cannot continue if no ABAP environments are found on Yo CLI
                if (choices.length === 0) {
                    if (getHostEnvironment() === hostEnvironment.cli) {
                        throw new Error(t('errors.abapEnvsUnavailable'));
                    }
                }
                return choices;
            },
            default: () => getDefaultChoiceIndex(choices as Answers[]),
            message: t('prompts.cloudFoundryAbapSystem.message'),
            validate: async (abapService: ServiceInstanceInfo): Promise<string | boolean | IValidationLink> => {
                if (abapService) {
                    return await validateServiceInfo(abapService, connectionValidator);
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
    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: AbapOnBtpAnswers): Promise<boolean> => {
                const abapService = answers?.[abapOnBtpPromptNames.cloudFoundryAbapSystem];
                if (abapService) {
                    await validateServiceInfo(abapService, connectionValidator, true);
                }
                return false;
            },
            name: cliCfAbapServicePromptName
        } as Question);
    }

    return questions;
}

/**
 * Get the service key prompt for the ABAP on BTP system. This prompt will allow the user to select a service key file from the file system.
 *
 * @param connectionValidator a connection validator instance
 * @returns The service key prompt
 */
function getServiceKeyPrompt(connectionValidator: ConnectionValidator): FileBrowserQuestion {
    const question = {
        type: 'input',
        name: abapOnBtpPromptNames.serviceKey,
        message: t('prompts.serviceKey.message'),
        guiType: 'file-browser',
        guiOptions: {
            hint: t('prompts.serviceKey.hint'),
            mandatory: true
        },
        validate: async (keyPath) => {
            const serviceKeyValResult = validateServiceKey(keyPath);
            if (typeof serviceKeyValResult === 'string' || typeof serviceKeyValResult === 'boolean') {
                return serviceKeyValResult;
            }
            const connectValResult = await connectionValidator.validateServiceInfo(serviceKeyValResult);

            if (connectValResult === true && connectionValidator.serviceProvider) {
                PromptState.odataService.connectedSystem = {
                    serviceProvider: connectionValidator.serviceProvider
                };
            }
            return connectValResult;
        }
    } as FileBrowserQuestion;

    return question;
}
