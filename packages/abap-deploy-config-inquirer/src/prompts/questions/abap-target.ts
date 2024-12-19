import { showClientChoiceQuestion, showClientQuestion, showScpQuestion, showUrlQuestion } from '../conditions';
import {
    validateClientChoiceQuestion,
    validateClient,
    validateDestinationQuestion,
    validateTargetSystem,
    validateTargetSystemUrlCli,
    validateUrl,
    updateDestinationPromptState
} from '../validators';
import { t } from '../../i18n';
import { getClientChoicePromptChoices, getAbapSystemChoices, updatePromptStateUrl } from '../helpers';
import { defaultTargetSystem, defaultUrl } from '../defaults';
import { getAbapSystems } from '../../utils';
import { PromptState } from '../prompt-state';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { isAppStudio, isOnPremiseDestination, type Destinations } from '@sap-ux/btp-utils';
import {
    promptNames,
    ClientChoiceValue,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapSystemChoice,
    type BackendTarget,
    type TargetSystemPromptOptions
} from '../../types';
import type { InputQuestion, ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { Question } from 'inquirer';
import { TargetSystemType } from '../../types';

/**
 * Returns the destination prompt.
 *
 * @param choices - abap system choices
 * @param promptOptions - prompt options
 * @param destinations - list of destinations
 * @param backendTarget - backend target
 * @returns list question for destination
 */
function getDestinationPrompt(
    choices: AbapSystemChoice[],
    promptOptions?: TargetSystemPromptOptions,
    destinations?: Destinations,
    backendTarget?: BackendTarget
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (): boolean => isAppStudio() && promptOptions?.hide === false,
            type: 'list',
            name: promptNames.destination,
            message: t('prompts.target.destination.message'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true
            },
            default: (): string | undefined => backendTarget?.abapTarget?.destination,
            filter: (input: string): string => input?.trim(),
            choices: (): AbapSystemChoice[] => choices,
            validate: (destination: string): boolean => validateDestinationQuestion(destination, destinations),
            additionalMessages: (destination: string): IMessageSeverity | undefined => {
                let additionalMessage;
                if (destinations && destination && isOnPremiseDestination(destinations[destination])) {
                    additionalMessage = {
                        message: t('warnings.virtualHost'),
                        severity: Severity.warning
                    };
                }
                return additionalMessage;
            }
        } as ListQuestion<AbapDeployConfigAnswersInternal>
    ];

    if (isAppStudio() && !PromptState.isYUI) {
        prompts.push({
            when: (answers: AbapDeployConfigAnswersInternal): boolean => {
                const destination = answers[promptNames.destination];
                if (destination) {
                    updateDestinationPromptState(destination, destinations);
                }
                return false;
            },
            name: promptNames.destinationCliSetter
        } as Question);
    }
    return prompts;
}

function getTargetSystemLabelPrompt(
    backendTarget?: BackendTarget,
    promptOptions?: TargetSystemPromptOptions
): Question<AbapDeployConfigAnswersInternal> {
    return {
        type: 'input',
        name: promptNames.targetSystemLabel,
        message: `Target system: ${backendTarget?.systemName ?? backendTarget?.abapTarget.url}`,
        guiOptions: {
            type: 'label'
        },
        when: (): boolean => promptOptions?.hide === true
    } as InputQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the target system prompt.
 *
 * @param choices - abap system choices
 * @param promptOptions - prompt options
 * @returns list question for target system
 */
function getTargetSystemPrompt(
    choices: AbapSystemChoice[],
    promptOptions?: TargetSystemPromptOptions
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (): boolean => !isAppStudio() && promptOptions?.hide === false,
            type: 'list',
            name: promptNames.targetSystem,
            message: t('prompts.target.targetSystem.message'),
            guiOptions: {
                mandatory: true,
                breadcrumb: t('prompts.target.targetSystem.breadcrumb')
            },
            choices: (): AbapSystemChoice[] => choices,
            default: (): string | undefined => defaultTargetSystem(choices),
            validate: (target: string): boolean | string => validateTargetSystem(target, choices)
        } as ListQuestion<AbapDeployConfigAnswersInternal>
    ];

    if (!isAppStudio() && !PromptState.isYUI) {
        prompts.push({
            when: (answers: AbapDeployConfigAnswersInternal): boolean => {
                const target = answers[promptNames.targetSystem];
                if (target) {
                    validateTargetSystemUrlCli(target, choices);
                }
                return false;
            },
            name: promptNames.targetSystemCliSetter
        } as Question);
    }
    return prompts;
}

/**
 * Returns the url prompt.
 *
 * @param destinations - list of destinations
 * @param backendTarget - backend target
 * @param promptOptions - prompt options
 * @returns input question for url
 */
function getUrlPrompt(
    destinations?: Destinations,
    backendTarget?: BackendTarget,
    promptOptions?: TargetSystemPromptOptions
): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal) => {
            const isValid = showUrlQuestion(previousAnswers.targetSystem);
            updatePromptStateUrl(previousAnswers, destinations, backendTarget);
            return isValid && promptOptions?.hide === false;
        },
        type: 'input',
        name: promptNames.url,
        message: t('prompts.target.url.message'),
        guiOptions: {
            mandatory: true,
            breadcrumb: true
        },
        default: ({ targetSystem }: AbapDeployConfigAnswersInternal): string | undefined => defaultUrl(targetSystem),
        filter: (input: string): string => input?.trim(),
        validate: (url: string): boolean | string => validateUrl(url)
    } as InputQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the scp prompt.
 
 * @param backendTarget - backend target
 * @param promptOptions - prompt options
 * @returns confirm question for scp
 */
function getScpPrompt(
    backendTarget?: BackendTarget,
    promptOptions?: TargetSystemPromptOptions
): Question<AbapDeployConfigAnswersInternal>[] {
    const prompts: (ConfirmQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                showScpQuestion(previousAnswers) && promptOptions?.hide === false,
            type: 'confirm',
            name: promptNames.scp,
            message: t('prompts.target.scp.message'),
            guiOptions: {
                breadcrumb: t('prompts.target.scp.breadcrumb')
            },
            default: (): boolean | undefined => backendTarget?.abapTarget?.scp
        }
    ];
    // Setter prompt to ensure the state for both CLI and YUI is updated when user is toggling the SCP question, Yes/No
    prompts.push({
        when: (answers: AbapDeployConfigAnswersInternal): boolean => {
            const scpChoice = answers[promptNames.scp];
            const targetChoice = answers[promptNames.targetSystem];
            // Maintain the correct state only when SCP comes into play
            if (scpChoice && targetChoice === TargetSystemType.Url) {
                PromptState.abapDeployConfig.scp = true;
            } else if (!scpChoice && targetChoice === TargetSystemType.Url) {
                PromptState.abapDeployConfig.scp = false;
            }
            return false;
        },
        name: promptNames.scpSetter
    } as Question);
    return prompts;
}

/**
 * Returns the client choice prompt.
 *
 * @param backendTarget - backend target
 * @param promptOptions - prompt options
 * @returns list question for client choice
 */
function getClientChoicePrompt(
    backendTarget?: BackendTarget,
    promptOptions?: TargetSystemPromptOptions
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                showClientChoiceQuestion(previousAnswers, backendTarget?.abapTarget?.client) &&
                promptOptions?.hide === false,
            type: 'list',
            name: promptNames.clientChoice,
            message: t('prompts.target.clientChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getClientChoicePromptChoices(backendTarget?.abapTarget?.client),
            default: (): string =>
                backendTarget?.abapTarget.client ? ClientChoiceValue.Base : ClientChoiceValue.Blank,
            validate: (input: ClientChoiceValue): boolean | string =>
                validateClientChoiceQuestion(input, backendTarget?.abapTarget?.client)
        } as ListQuestion<AbapDeployConfigAnswersInternal>
    ];

    if (!PromptState.isYUI) {
        prompts.push({
            when: (answers: AbapDeployConfigAnswersInternal): boolean => {
                const clientChoice = answers[promptNames.clientChoice];
                if (clientChoice) {
                    validateClientChoiceQuestion(clientChoice as ClientChoiceValue, backendTarget?.abapTarget?.client);
                }
                return false;
            },
            name: promptNames.clientChoiceCliSetter
        } as Question);
    }
    return prompts;
}

/**
 * Returns the client prompt.
 *
 * @param promptOptions - prompt options
 * @returns input question for client
 */
function getClientPrompt(promptOptions?: TargetSystemPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean => {
            return showClientQuestion(previousAnswers) && promptOptions?.hide === false;
        },
        type: 'input',
        name: promptNames.client,
        message: t('prompts.target.client.message'),
        guiOptions: {
            breadcrumb: t('prompts.target.client.breadcrumb')
        },
        default: (): string | undefined => PromptState.abapDeployConfig?.client, // Already set from previous step, if passed in from yaml config for example
        filter: (input: string): string => input?.trim(),
        validate: (client: string): boolean | string => validateClient(client)
    } as InputQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the abap target prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for abap target prompting
 */
export async function getAbapTargetPrompts(
    options: AbapDeployConfigPromptOptions
): Promise<Question<AbapDeployConfigAnswersInternal>[]> {
    const { destinations, backendSystems } = await getAbapSystems();

    //set values for abap target when abap target related prompts are hidden
    if (options?.targetSystem?.hide) {
        if (!isAppStudio()) {
            PromptState.abapDeployConfig.url = options?.backendTarget?.abapTarget?.url;
            PromptState.abapDeployConfig.client = options?.backendTarget?.abapTarget?.client;
            PromptState.abapDeployConfig.isS4HC =
                options.backendTarget?.abapTarget.authenticationType === 'reentranceTicket';
        } else {
            PromptState.abapDeployConfig.destination = options.backendTarget?.abapTarget?.destination;
        }
    }

    const abapSystemChoices = await getAbapSystemChoices(destinations, options?.backendTarget, backendSystems);
    return [
        ...getDestinationPrompt(abapSystemChoices, options.targetSystem, destinations, options.backendTarget),
        ...getTargetSystemPrompt(abapSystemChoices, options.targetSystem),
        getUrlPrompt(destinations, options.backendTarget, options.targetSystem),
        ...getScpPrompt(options.backendTarget, options.targetSystem),
        ...getClientChoicePrompt(options.backendTarget, options.targetSystem),
        getClientPrompt(),
        getTargetSystemLabelPrompt(options.backendTarget, options.targetSystem)
    ];
}
