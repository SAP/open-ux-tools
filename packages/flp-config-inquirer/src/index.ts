import isNil from 'lodash/isNil';

import type { ManifestNamespace } from '@sap-ux/project-access';
import type { InquirerAdapter, PromptDefaultValue } from '@sap-ux/inquirer-common';

import { initI18n } from './i18n';
import { promptNames } from './types';
import { getQuestions } from './prompts';
import type { FLPConfigAnswers, FLPConfigQuestion, FLPConfigPromptOptions } from './types';

/**
 * Get the inquirer prompts for the FLP configuration inquirer.
 *
 * @param inbounds - array of existing inbound keys to check for duplicates
 * @param promptOptions - options that can control some of the prompt behavior. See {@link FLPConfigPromptOptions} for details
 * @returns the prompts used to provide input for FLP configuration
 */
async function getPrompts(
    inbounds?: ManifestNamespace.Inbound,
    appId?: string,
    promptOptions?: FLPConfigPromptOptions
): Promise<FLPConfigQuestion[]> {
    await initI18n();

    return getQuestions(inbounds, appId, promptOptions);
}

/**
 * Prompt for FLP configuration inputs.
 *
 * @param adapter - an instance of InquirerAdapter to handle prompting
 * @param inbounds - array of existing inbound keys to check for duplicates
 * @param promptOptions - options that can control some of the prompt behavior. See {@link FLPConfigPromptOptions} for details
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    inbounds: ManifestNamespace.Inbound | undefined,
    appId: string | undefined,
    promptOptions?: FLPConfigPromptOptions
): Promise<FLPConfigAnswers> {
    const flpPrompts = await getPrompts(inbounds, appId, promptOptions);

    const answers = await adapter.prompt<FLPConfigAnswers>(flpPrompts);
    // Apply default values to prompts in case they have not been executed
    if (promptOptions) {
        const defaultAnswers = applyPromptOptionDefaults(answers, flpPrompts, promptOptions);
        Object.assign(answers, defaultAnswers);
    }

    return answers;
}

/**
 * Apply prompt option default values to prompt answers in case they have not been executed by the user selections.
 * This can occur where some prompts are hidden by conditions.
 *
 * @param answers the answers from previous prompting, only answers without a value will be considered for defaulting
 * @param flpPrompts the prompts that were used to prompt the user, will be used to apply default values if not answered or no default provided
 * @param promptOptions the prompt options which may provide default values or functions
 * @returns the default values for the unanswered prompts, based on the prompt options
 */
function applyPromptOptionDefaults(
    answers: Partial<FLPConfigAnswers>,
    flpPrompts: FLPConfigQuestion[],
    promptOptions: FLPConfigPromptOptions
): Partial<FLPConfigAnswers> {
    const defaultAnswers: Partial<FLPConfigAnswers> = {};
    Object.entries(promptOptions).forEach(([key, promptOpt]) => {
        const promptKey = key as keyof typeof promptNames;
        // Do we have an answer? If not, apply the default
        const defaultValueOrFunc = (promptOpt as PromptDefaultValue<string | boolean>).default;

        if (isNil(answers[promptKey]) && defaultValueOrFunc !== undefined) {
            const defaultValue = getDefaultValue(answers, defaultValueOrFunc);
            Object.assign(defaultAnswers, {
                [promptKey]: defaultValue
            });
        }
    });
    return defaultAnswers;
}

/**
 * Get the default value for a prompt based on the provided default value or function.
 * If a function is provided, it will be called with the current answers to determine the default value.
 *
 * @param answers the current answers provided to default functions
 * @param promptDefault the default value or function to determine the default value
 * @returns the default value for the prompt or undefined if no default value is provided
 */
function getDefaultValue(
    answers: Partial<FLPConfigAnswers>,
    promptDefault?: PromptDefaultValue<string | boolean>['default']
) {
    if (typeof promptDefault === 'function') {
        return promptDefault(answers);
    }
    return promptDefault;
}

export {
    getPrompts,
    prompt,
    promptNames,
    type InquirerAdapter,
    type PromptDefaultValue,
    type FLPConfigAnswers,
    type FLPConfigPromptOptions
};
