import { FileBrowserQuestion, withCondition, ListQuestion, PromptSeverityMessage } from '@sap-ux/inquirer-common';
import type { Question, ListChoiceOptions } from 'inquirer';
import { t } from '../../../../i18n';
import { hostEnvironment, type OdataServiceAnswers, type OdataServicePromptOptions } from '../../../../types';
import { PromptState, getDefaultChoiceIndex, getHostEnvironment } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import {
    getSystemServiceQuestion,
    getSystemUrlQuestion,
    getUserSystemNameQuestion,
} from '../new-system/questions';
import { validateServiceKey } from '../validators';
import { getABAPInstanceChoices } from './cf-helper';
import { ServiceInstanceInfo, apiGetInstanceCredentials, cfGetTarget } from '@sap/cf-tools';
import { IMessageSeverity, IValidationLink, Severity } from '@sap-devx/yeoman-ui-types';
import { errorHandler } from '../../../prompt-helpers';
import { ERROR_TYPE } from '../../../../error-handler/error-handler';
import { newSystemPromptNames } from '../new-system/types';

const abapOnBtpPromptNamespace = 'abapOnBtp';
const systemUrlPromptName = `${abapOnBtpPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;

const abapOnBtpPromptNames = {
    'abapOnBtpAuthType': 'abapOnBtpAuthType',
    'abapOnBtpServiceUrl': 'abapOnBtpServiceUrl',
    'serviceKey': 'serviceKey',
    'cloudFoundryAbapSystem': 'cloudFoundryAbapSystem',
    'abapOnBtpServiceSelection': 'abapOnBtpServiceSelection'
} as const;

export type AbapOnBTPType = 'cloudFoundry' | 'serviceKey' | 'reentranceTicket';

interface AbapOnBtpAnswers extends Partial<OdataServiceAnswers> {
    [abapOnBtpPromptNames.abapOnBtpAuthType]?: AbapOnBTPType;
    [systemUrlPromptName]?: string;
    [abapOnBtpPromptNames.serviceKey]?: string;
    [abapOnBtpPromptNames.cloudFoundryAbapSystem]?: string;
}

/**
 *
 * @param promptOptions
 */
export function getAbapOnBTPSystemQuestions(promptOptions?: OdataServicePromptOptions): Question<AbapOnBtpAnswers>[] {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();
    const questions: Question[] = [];
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
        withCondition([getServiceKeyPrompt(connectValidator)], (answers: AbapOnBtpAnswers) => {
            if (answers?.abapOnBtpAuthType === 'serviceKey') {
                connectValidator.systemAuthType = answers.abapOnBtpAuthType; // Is this needed?
                return true;
            }
            return false;
        })[0]
    );

    questions.push(
        withCondition(
            [getCFDiscoverPrompt(connectValidator)],
            (answers: AbapOnBtpAnswers) => answers?.abapOnBtpAuthType === 'cloudFoundry'
        )[0]
    );

    // New system store name propmt
    if (promptOptions?.userSystemName?.exclude !== true) {
        // New system question will allow user to give the system a user friendly name
        questions.push(
            withCondition(
                [getUserSystemNameQuestion(connectValidator, abapOnBtpPromptNamespace)],
                (answers: AbapOnBtpAnswers) =>
                    (!!answers?.[systemUrlPromptName] ||
                        !!answers?.[abapOnBtpPromptNames.serviceKey] ||
                        !!answers?.[abapOnBtpPromptNames.cloudFoundryAbapSystem]) &&
                    connectValidator.validity.reachable === true &&
                    (connectValidator.validity.authenticated || connectValidator.validity.authRequired !== true)
            )[0]
        );
    }

    // Service selection prompt
    questions.push(getSystemServiceQuestion(connectValidator, abapOnBtpPromptNamespace, promptOptions));
    return questions;
}

/**
 * Get the Cloud Foundry Abap system discovery prompt. This prompt will list all available ABAP environments in the connected Cloud Foundry space.
 * If the Cloud Foundry connection fails, a warning message will be displayed.
 *
 * @param connectionValidator
 * @returns
 */
export function getCFDiscoverPrompt(connectionValidator: ConnectionValidator): ListQuestion {
    let choices: ListChoiceOptions<ServiceInstanceInfo>[] = [];
    return {
        type: 'list',
        name: abapOnBtpPromptNames.cloudFoundryAbapSystem,
        guiOptions: {
            breadcrumb: true,
            applyDefaultWhenDirty: true,
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
        default: getDefaultChoiceIndex,
        message: t('prompts.cloudFoundryAbapSystem.message'),
        validate: async (abapService: ServiceInstanceInfo): Promise<string | boolean | IValidationLink> => {
            // todo: CLI equivalent...
            if (abapService) {
                const uaaCreds = await apiGetInstanceCredentials(abapService.label);
                const valResult = await connectionValidator.validateServiceInfo(uaaCreds.credentials);
                if (valResult !== true) {
                    return valResult;
                }

                if (connectionValidator.serviceProvider) {
                    // Create a unique connected system name based on the selected ABAP service
                    const cfTarget = await cfGetTarget(true);
                    connectionValidator.connectedSystemName =
                        `abap-cloud-${abapService.label}-${cfTarget.org}-${cfTarget.space}`
                            .replace(/[^\w]/gi, '-')
                            .toLowerCase();
                    PromptState.odataService.connectedSystem = {
                        serviceProvider: connectionValidator.serviceProvider
                    };
                }
            }
            return true;
        },
        additionalMessages: (): IMessageSeverity | undefined => {
            const errorType = errorHandler.getCurrentErrorType();
            if (errorType === ERROR_TYPE.NO_ABAP_ENVS) {
                const errorMsg = errorHandler.getErrorMsg(true);
                const seeLogMsg = t('texts.seeLogForDetails');
                return {
                    message: `${errorMsg} ${seeLogMsg}`,
                    severity: Severity.warning
                };
            }
        }
    } as ListQuestion;
}

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
