import { showClientChoiceQuestion, showClientQuestion, showScpQuestion, showUrlQuestion } from '../conditions';
import {
    validateClientChoiceQuestion,
    validateClient,
    validateDestinationQuestion,
    validateScpQuestion,
    validateTargetSystem,
    validateTargetSystemUrlCli,
    validateUrl,
    updateDestinationPromptState
} from '../validators';
import { t } from '../../i18n';
import { getClientChoicePromptChoices, getAbapSystemChoices, updateGeneratorUrl, updateGeneratorScp } from '../helpers';
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
    type AbapSystemChoice
} from '../../types';
import type { InputQuestion, ListQuestion, ConfirmQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { Question } from 'inquirer';

/**
 * Returns the destination prompt.
 *
 * @param options - abap deploy config prompt options
 * @param choices - abap system choices
 * @param destinations - list of destinations
 * @returns list question for destination
 */
function getDestinationPrompt(
    options: AbapDeployConfigPromptOptions,
    choices: AbapSystemChoice[],
    destinations?: Destinations
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (): boolean => isAppStudio(),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.destination,
            message: t('prompts.target.destination.message'),
            guiOptions: {
                breadcrumb: true
            },
            default: (): string | undefined => options.backendTarget?.abapTarget?.destination,
            filter: (input: string): string => input?.trim(),
            choices: (): AbapSystemChoice[] => choices,
            validate: (destination: string): boolean => validateDestinationQuestion(destination, destinations),
            additionalMessages: (destination: string): IMessageSeverity | undefined => {
                let additionalMessage;
                if (destinations && isOnPremiseDestination(destinations[destination])) {
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
 * @param options - abap deploy config prompt options
 * @param destinations - list of destinations
 * @returns input question for url
 */
function getUrlPrompt(
    options: AbapDeployConfigPromptOptions,
    destinations?: Destinations
): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal) => {
            const isValid = showUrlQuestion(previousAnswers.targetSystem);
            updateGeneratorUrl(options, previousAnswers, destinations);
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
 * @param options - abap deploy config prompt options
 * @returns confirm question for scp
 */
function getScpPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean => {
            const isValid = showScpQuestion(previousAnswers);
            updateGeneratorScp(options, previousAnswers);
            return isValid;
        },
        type: 'confirm',
        name: abapDeployConfigInternalPromptNames.scp,
        message: t('prompts.target.scp.message'),
        guiOptions: {
            breadcrumb: t('prompts.target.scp.breadcrumb')
        },
        default: (): boolean | undefined => PromptState.abapDeployConfig?.scp,
        validate: (scp: boolean): boolean | string => validateScpQuestion(scp)
    } as ConfirmQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the client choice prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns list question for client choice
 */
function getClientChoicePrompt(
    options: AbapDeployConfigPromptOptions
): (YUIQuestion<AbapDeployConfigAnswersInternal> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswersInternal> | Question)[] = [
        {
            when: (): boolean =>
                showClientChoiceQuestion(
                    options?.backendTarget?.abapTarget?.client,
                    PromptState.abapDeployConfig?.isS4HC
                ),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.clientChoice,
            message: t('prompts.target.clientChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getClientChoicePromptChoices(options),
            default: (): string => ClientChoiceValue.Blank,
            validate: (input: ClientChoiceValue): boolean | string =>
                validateClientChoiceQuestion(input, options.backendTarget?.abapTarget?.client)
        } as ListQuestion<AbapDeployConfigAnswersInternal>
    ];

    if (!PromptState.isYUI) {
        prompts.push({
            when: async (answers: AbapDeployConfigAnswersInternal): Promise<boolean> => {
                const clientChoice = answers[abapDeployConfigInternalPromptNames.clientChoice];
                if (clientChoice) {
                    validateClientChoiceQuestion(
                        clientChoice as ClientChoiceValue,
                        options.backendTarget?.abapTarget?.client
                    );
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
 * @param options - abap deploy config prompt options
 * @returns input question for client
 */
function getClientPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean => {
            return showClientQuestion(
                previousAnswers.clientChoice,
                options?.backendTarget?.abapTarget?.client,
                PromptState.abapDeployConfig?.isS4HC
            );
        },
        type: 'input',
        name: abapDeployConfigInternalPromptNames.client,
        message: t('prompts.target.client.message'),
        guiOptions: {
            mandatory: true,
            breadcrumb: t('prompts.target.client.breadcrumb')
        },
        default: (): string | undefined => options.backendTarget?.abapTarget?.client,
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
        ...getDestinationPrompt(options, abapSystemChoices, destinations),
        ...getTargetSystemPrompt(abapSystemChoices),
        getUrlPrompt(options, destinations),
        getScpPrompt(options),
        ...getClientChoicePrompt(options),
        getClientPrompt(options)
    ];
}
