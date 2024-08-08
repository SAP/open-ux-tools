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
import { getClientChoicePromptChoices, getAbapSystemChoices, updateGeneratorUrl } from '../helpers';
import { defaultTargetSystem, defaultUrl } from '../defaults';
import { getAbapSystems } from '../../utils';
import { PromptState } from '../prompt-state';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { isAppStudio, isOnPremiseDestination, type Destinations } from '@sap-ux/btp-utils';
import { hostEnvironment, getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    abapDeployConfigInternalPromptNames,
    ClientChoiceValue,
    type AbapDeployConfigAnswers,
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
): (YUIQuestion<AbapDeployConfigAnswers> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswers> | Question)[] = [
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
                if (destinations && destination && isOnPremiseDestination(destinations[destination])) {
                    additionalMessage = {
                        message: t('warnings.virtualHost'),
                        severity: Severity.warning
                    };
                }
                return additionalMessage;
            }
        } as ListQuestion<AbapDeployConfigAnswers>
    ];

    if (isAppStudio() && getHostEnvironment() === hostEnvironment.cli) {
        prompts.push({
            when: (answers: AbapDeployConfigAnswers): boolean => {
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
function getTargetSystemPrompt(choices: AbapSystemChoice[]): (YUIQuestion<AbapDeployConfigAnswers> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswers> | Question)[] = [
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
        } as ListQuestion<AbapDeployConfigAnswers>
    ];

    if (!isAppStudio() && getHostEnvironment() === hostEnvironment.cli) {
        prompts.push({
            when: (answers: AbapDeployConfigAnswers): boolean => {
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
): Question<AbapDeployConfigAnswers> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswers) => {
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
        default: ({ targetSystem }: AbapDeployConfigAnswers): string | undefined => defaultUrl(options, targetSystem),
        filter: (input: string): string => input?.trim(),
        validate: (url: string): boolean | string => validateUrl(url)
    } as InputQuestion<AbapDeployConfigAnswers>;
}

/**
 * Returns the scp prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns confirm question for scp
 */
function getScpPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswers): boolean => showScpQuestion(previousAnswers),
        type: 'confirm',
        name: abapDeployConfigInternalPromptNames.scp,
        message: t('prompts.target.scp.message'),
        guiOptions: {
            breadcrumb: t('prompts.target.scp.breadcrumb')
        },
        default: (): string | undefined => options.backendTarget?.abapTarget?.scp,
        validate: (input: boolean): boolean | string => validateScpQuestion(input)
    } as ConfirmQuestion<AbapDeployConfigAnswers>;
}

/**
 * Returns the client choice prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns list question for client choice
 */
function getClientChoicePrompt(
    options: AbapDeployConfigPromptOptions
): (YUIQuestion<AbapDeployConfigAnswers> | Question)[] {
    const prompts: (ListQuestion<AbapDeployConfigAnswers> | Question)[] = [
        {
            when: (): boolean => showClientChoiceQuestion(options, PromptState.abapDeployConfig?.isS4HC),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.clientChoice,
            message: t('prompts.target.clientChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getClientChoicePromptChoices(options),
            default: (): string => ClientChoiceValue.Blank,
            validate: (input: ClientChoiceValue): boolean | string => validateClientChoiceQuestion(options, input)
        } as ListQuestion<AbapDeployConfigAnswers>
    ];

    if (getHostEnvironment() === hostEnvironment.cli) {
        prompts.push({
            when: async (answers: AbapDeployConfigAnswers): Promise<boolean> => {
                const clientChoice = answers[abapDeployConfigInternalPromptNames.clientChoice];
                if (clientChoice) {
                    validateClientChoiceQuestion(options, clientChoice as ClientChoiceValue);
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
function getClientPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers> {
    return {
        when: (previousAnswers: AbapDeployConfigAnswers): boolean => {
            return showClientQuestion(previousAnswers, options, PromptState.abapDeployConfig?.isS4HC);
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
    } as InputQuestion<AbapDeployConfigAnswers>;
}

/**
 * Returns the abap target prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for abap target prompting
 */
export async function getAbapTargetPrompts(
    options: AbapDeployConfigPromptOptions
): Promise<Question<AbapDeployConfigAnswers>[]> {
    const { destinations, backendSystems } = await getAbapSystems();
    const abapSystemChoices = await getAbapSystemChoices(destinations, options.backendTarget, backendSystems);
    return [
        ...getDestinationPrompt(options, abapSystemChoices, destinations),
        ...getTargetSystemPrompt(abapSystemChoices),
        getUrlPrompt(options, destinations),
        getScpPrompt(options),
        ...getClientChoicePrompt(options),
        getClientPrompt(options)
    ];
}
