import { withCondition } from '@sap-ux/inquirer-common';
import type { ListQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { OdataServiceAnswers, OdataServicePromptOptions } from '../../../../types';
import { PromptState } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import {
    getSystemServiceQuestion,
    getSystemUrlQuestion,
    getUserSystemNameQuestion,
    newSystemPromptNames
} from '../new-system/questions';

const abapOnBtpPromptNamespace = 'abapOnBtp';
const systemUrlPromptName = `${abapOnBtpPromptNamespace}:${newSystemPromptNames.newSystemUrl}` as const;

const abapOnBtpPromptNames = {
    'abapOnBtpAuthType': 'abapOnBtpAuthType',
    'abapOnBtpServiceUrl': 'abapOnBtpServiceUrl',
    'serviceKey': 'serviceKey',
    'cloudFoundry': 'cloudFoundry',
    'abapOnBtpServiceSelection': 'abapOnBtpServiceSelection'
} as const;

export type AbapOnBTPType = 'cloudFoundry' | 'serviceKey' | 'reentranceTicket';

interface AbapOnBtpAnswers extends Partial<OdataServiceAnswers> {
    [abapOnBtpPromptNames.abapOnBtpAuthType]?: AbapOnBTPType;
    [systemUrlPromptName]?: string;
    [abapOnBtpPromptNames.serviceKey]?: string;
    [abapOnBtpPromptNames.cloudFoundry]?: string;
}

/**
 *
 * @param promptOptions
 */
export function getAbapOnBTPSystemQuestions(promptOptions?: OdataServicePromptOptions): Question[] {
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
        message: t('prompts.abapOnBTPType.message')
    } as ListQuestion);

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
                // todo: implement the rest of the conditions
                if (answers?.abapOnBtpAuthType === 'reentranceTicket') {
                    connectValidator.systemAuthType = answers.abapOnBtpAuthType;
                    return true;
                }
                return false;
            }
        )[0]
    );

    if (promptOptions?.userSystemName?.exclude !== true) {
        // New system question will allow user to give the system a user friendly name
        questions.push(
            withCondition(
                [getUserSystemNameQuestion(connectValidator, abapOnBtpPromptNamespace)],
                (answers: AbapOnBtpAnswers) =>
                    !!answers?.[systemUrlPromptName] && // todo: should we get the prompt name and therefore the answer name from the returned question?
                    connectValidator.validity.reachable === true &&
                    (connectValidator.validity.authenticated || connectValidator.validity.authRequired !== true)
            )[0]
        );
    }

    questions.push(getSystemServiceQuestion(connectValidator, abapOnBtpPromptNamespace, promptOptions));
    return questions;
}

//** todo: Ad generic answers type (or overloaded answers type), reuse for abap-on-prem */
/* function getServiceSelectionPrompt(
    connectValidator: ConnectionValidator,
    promptOptions?: ServiceSelectionPromptOptions
): Question<AbapOnBtpAnswers> {
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system is changed
    let previousSystemUrl: string | undefined;
    let previousService: ServiceAnswer | undefined;
    // Prompt options
    const requiredOdataVersion = promptOptions?.requiredOdataVersion;
    return {
        when: (): boolean =>
            connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
        name: abapOnBtpPromptNames.abapOnBtpServiceSelection,
        type: promptOptions?.useAutoComplete ? 'autocomplete' : 'list',
        message: t('prompts.systemService.message'),
        guiOptions: {
            breadcrumb: t('prompts.systemService.breadcrumb'),
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        source: (prevAnswers: AbapOnBtpAnswers, input: string) =>
            searchChoices(input, serviceChoices as ListChoiceOptions[]),
        choices: async (answers: AbapOnBtpAnswers) => {
            if (!serviceChoices || previousSystemUrl !== answers.abapOnBtpServiceUrl) {
                let catalogs: CatalogService[] = [];
                if (requiredOdataVersion) {
                    catalogs.push(connectValidator.catalogs[requiredOdataVersion]);
                } else {
                    catalogs = Object.values(connectValidator.catalogs);
                }
                previousSystemUrl = answers.abapOnBtpServiceUrl;
                serviceChoices = await getServiceChoices(catalogs);
            }
            return serviceChoices;
        },
        additionalMessages: async (selectedService: ServiceAnswer) => {
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
        },
        default: () => (serviceChoices?.length > 1 ? undefined : 0),
        // Warning: only executes in YUI not cli
        validate: async (
            service: ServiceAnswer,
            { abapOnBtpServiceUrl }: Partial<AbapOnBtpAnswers> = {}
        ): Promise<string | boolean | ValidationLink> => {
            if (!abapOnBtpServiceUrl) {
                return false;
            }
            // Dont re-request the same service details
            if (service && previousService?.servicePath !== service.servicePath) {
                previousService = service;
                return getServiceDetails(service, abapOnBtpServiceUrl, connectValidator);
            }
            return true;
        }
    } as ListQuestion<AbapOnBtpAnswers> | AutocompleteQuestionOptions<AbapOnBtpAnswers>;
} */

/**
 * todo: Make generic abapOnBTPSystemUrl
 *
 * @param connectValidator
 * @returns
 */
/* function getAbapOnBtpServiceUrlPrompt(
    connectValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Question<AbapOnBtpAnswers> {
    return {
        type: 'input',
        name: abapOnBtpPromptNames.abapOnBtpServiceUrl,
        message: t('prompts.systemUrl.message'),
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        validate: async (url, answers: AbapOnBtpAnswers) => {
            const valResult = await connectValidator.validateUrl(url, {
                systemAuthType: answers.abapOnBtpAuthType,
                odataVersion: convertODataVersionType(requiredOdataVersion)
            });
            if (valResult === true) {
                PromptState.odataService.connectedSystem = {
                    serviceProvider: connectValidator.serviceProvider
                };
            }
            return valResult;
        }
    } as InputQuestion<AbapOnBtpAnswers>;
} */

function getServiceKeyPrompt() {}

function getCFDiscoveryPrompt() {}

/**
 * questions.push({
            when: (answers) => answers.serviceKeySource === 'FILE',
            type: 'input',
            name: 'newSystemServiceKeyPath',
            message: t('LABEL_SERVICE_KEY_MESSAGE'),
            guiType: 'file-browser',
            guiOptions: {
                hint: t('SERVICE_CONNECTION_LOCAL_FILE'),
                applyDefaultWhenDirty: true,
                mandatory: true
            },
            validate: (keyPath) => {
                const validRes = validateServiceKey(keyPath);
                if (typeof validRes === 'string' || typeof validRes === 'boolean') {
                    return validRes;
                }
                service.newSystemServiceInfo = validRes;
                return true;
            }
        } as FileBrowserQuestion);
    }
    questions.push({
        when: (answers) => (answers.serviceKeySource ?? serviceKeySource) === 'DISCOVER',
        type: 'list',
        name: 'newSystemServiceInstance',
        guiOptions: {
            breadcrumb: t('SCP_ABAP_SELECT_MESSAGE')
        },
        choices: async () => {
            const output = await getABAPInstanceChoices();
            if (output.outputError) {
                errorHandler.logErrorMsgs(output.outputError.error, output.outputError.userMsg);
                if (getPlatform() === PLATFORMS.CLI) {
                    throw new Error(t('INFO_ABAP_ENVIRONMENTS_UNAVAILABLE'));
                }
            }
            return output.choices;
        },
        message: t('SCP_ABAP_SELECT_MESSAGE'),
        // Warning: only executes in YUI not cli, temp workaround until YUI provide non validation msgs to users
        default: () => ERROR_TYPE.NO_ABAP_ENVS,
        validate: (choice): string | boolean => {
            if (choice === ERROR_TYPE.NO_ABAP_ENVS) {
                const userMsg = errorHandler.getErrorMsg('', true);
                const checkConsoleMsg = t('ERROR_SCP_ABAP_SOURCE_DISCOVER_CHECK_LOG');
                return userMsg ? `${userMsg} ${checkConsoleMsg}` : checkConsoleMsg;
            }
            resetSystemState(service);
            service.newSystemServiceInstance = choice;
            return true;
        }
    } as ListQuestion);
 
    questions.push({
        when: (answers) => (answers.serviceKeySource ?? serviceKeySource) === 'REENTRANCE_TICKET',
        type: 'input',
        name: 'newS4HCSystemUrl',
        message: t('MSG_SYSTEM_URL'),
        guiOptions: {
            mandatory: true,
            breadcrumb: t('MSG_SYSTEM_URL')
        },
        validate: (url, answers) => {
            const result = validateUrl(url);
            if (result === true) {
                service.newSystem = createNewSystem({
                    ...answers,
                    newSystemUrl: url,
                    newSystemType: SapSystemSourceType.S4HC
                });
            }
            return result;
        }
    } as InputQuestion);
 */
