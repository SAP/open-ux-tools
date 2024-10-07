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
    abapDeployConfigInternalPromptNames,
    ClientChoiceValue,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapSystemChoice,
    type BackendTarget
} from '../../types';
import type { InputQuestion, ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { Question } from 'inquirer';
import { TargetSystemType } from '../../types';

/**
 * Returns the destination prompt.
 *
 * @param choices - abap system choices
 * @param destinations - list of destinations
 * @param backendTarget - backend target
 * @returns list question for destination
 */
function getDestinationPrompt(
    choices: AbapSystemChoice[],
    destinations?: Destinations,
    backendTarget?: BackendTarget
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (): boolean => isAppStudio(),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.destination,
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
                const destination = answers[abapDeployConfigInternalPromptNames.destination];
                if (destination) {
                    updateDestinationPromptState(destination, destinations);
                }
                return false;
            },
            name: abapDeployConfigInternalPromptNames.destinationCliSetter
        } as Question);
    }
    return prompts;
}

/**
 * Returns the target system prompt.
 *
 * @param choices - abap system choices
 * @returns list question for target system
 */
function getTargetSystemPrompt(
    choices: AbapSystemChoice[]
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (): boolean => !isAppStudio(),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.targetSystem,
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
                const target = answers[abapDeployConfigInternalPromptNames.targetSystem];
                if (target) {
                    validateTargetSystemUrlCli(target, choices);
                }
                return false;
            },
            name: abapDeployConfigInternalPromptNames.targetSystemCliSetter
        } as Question);
    }
    return prompts;
}

/**
 * Returns the url prompt.
 *
 * @param destinations - list of destinations
 * @param backendTarget - backend target
 * @returns input question for url
 */
function getUrlPrompt(
    destinations?: Destinations,
    backendTarget?: BackendTarget
): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal) => {
            const isValid = showUrlQuestion(previousAnswers.targetSystem);
            updatePromptStateUrl(previousAnswers, destinations, backendTarget);
            return isValid;
        },
        type: 'input',
        name: abapDeployConfigInternalPromptNames.url,
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
 *
 * @param backendTarget - backend target
 * @returns confirm question for scp
 */
function getScpPrompt(backendTarget?: BackendTarget): Question<AbapDeployConfigAnswersInternal>[] {
    const prompts: (ConfirmQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean => showScpQuestion(previousAnswers),
            type: 'confirm',
            name: abapDeployConfigInternalPromptNames.scp,
            message: t('prompts.target.scp.message'),
            guiOptions: {
                breadcrumb: t('prompts.target.scp.breadcrumb')
            },
            default: (): boolean | undefined => backendTarget?.abapTarget?.scp
        }
    ];
    // Setter prompt to ensure the state for both CLI and YUI is updated
    prompts.push({
        when: (answers: AbapDeployConfigAnswersInternal): boolean => {
            const scpChoice = answers[abapDeployConfigInternalPromptNames.scp];
            const targetChoice = answers[abapDeployConfigInternalPromptNames.targetSystem];
            // scpChoice by default is true so only update state if target system is a URL
            PromptState.abapDeployConfig.scp =
                scpChoice === true && targetChoice === TargetSystemType.Url ? true : false;
            return false;
        },
        name: abapDeployConfigInternalPromptNames.scpSetter
    } as Question);

    return prompts;
}

/**
 * Returns the client choice prompt.
 *
 * @param backendTarget - backend target
 * @returns list question for client choice
 */
function getClientChoicePrompt(
    backendTarget?: BackendTarget
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                showClientChoiceQuestion(previousAnswers, backendTarget?.abapTarget?.client),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.clientChoice,
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
                const clientChoice = answers[abapDeployConfigInternalPromptNames.clientChoice];
                if (clientChoice) {
                    validateClientChoiceQuestion(clientChoice as ClientChoiceValue, backendTarget?.abapTarget?.client);
                }
                return false;
            },
            name: abapDeployConfigInternalPromptNames.clientChoiceCliSetter
        } as Question);
    }
    return prompts;
}

/**
 * Returns the client prompt.
 *
 * @returns input question for client
 */
function getClientPrompt(): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean => {
            return showClientQuestion(previousAnswers);
        },
        type: 'input',
        name: abapDeployConfigInternalPromptNames.client,
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
    const abapSystemChoices = await getAbapSystemChoices(destinations, options?.backendTarget, backendSystems);
    return [
        ...getDestinationPrompt(abapSystemChoices, destinations, options.backendTarget),
        ...getTargetSystemPrompt(abapSystemChoices),
        getUrlPrompt(destinations, options.backendTarget),
        ...getScpPrompt(options.backendTarget),
        ...getClientChoicePrompt(options.backendTarget),
        getClientPrompt()
    ];
}
