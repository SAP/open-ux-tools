import isNil from 'lodash/isNil';

import type { ManifestNamespace } from '@sap-ux/project-access';
import type { InquirerAdapter, PromptDefaultValue } from '@sap-ux/inquirer-common';

import { initI18n } from './i18n';
import { promptNames } from './types';
import { getQuestions } from './prompts';
import type { FLPConfigAnswers, FLPConfigQuestion, FLPConfigPromptOptions } from './types';

/**
 * Retrieves the inquirer prompts for the FLP configuration.
 *
 * @param {ManifestNamespace.Inbound | undefined} inbounds - An object containing existing inbound keys to check for duplicates.
 * @param {string | undefined} appId - The application ID used to generate unique prompt keys.
 * @param {FLPConfigPromptOptions | undefined} promptOptions - Options that control prompt behavior. See {@link FLPConfigPromptOptions} for details.
 * @returns {Promise<FLPConfigQuestion[]>} A promise that resolves to an array of FLP configuration questions.
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
 * Prompts the user for FLP configuration inputs.
 *
 * @param {InquirerAdapter} adapter - An instance of `InquirerAdapter` to handle prompting.
 * @param {ManifestNamespace.Inbound | undefined} inbounds - An object containing existing inbound keys to check for duplicates.
 * @param {string | undefined} appId - The application ID used to generate unique prompt keys.
 * @param {FLPConfigPromptOptions | undefined} promptOptions - Options that control prompt behavior. See {@link FLPConfigPromptOptions} for details.
 * @returns {Promise<FLPConfigAnswers>} A promise that resolves to the user's answers for the FLP configuration.
 */
async function prompt(
    adapter: InquirerAdapter,
    inbounds?: ManifestNamespace.Inbound,
    appId?: string,
    promptOptions?: FLPConfigPromptOptions
): Promise<FLPConfigAnswers> {
    const flpPrompts = await getPrompts(inbounds, appId, promptOptions);

    const answers = await adapter.prompt<FLPConfigAnswers>(flpPrompts);
    // Apply default values to prompts in case they have not been executed
    if (promptOptions) {
        const defaultAnswers = applyPromptOptionDefaults(answers, promptOptions);
        Object.assign(answers, defaultAnswers);
    }

    return answers;
}

/**
 * Applies default values to unanswered prompts based on the provided options.
 * This function ensures that hidden or skipped prompts are assigned default values if specified in the options.
 *
 * @param {Partial<FLPConfigAnswers>} answers - The answers from previous prompting. Only unanswered prompts are considered.
 * @param {FLPConfigPromptOptions} promptOptions - Options for the prompts, which may include default values or functions.
 * @returns {Partial<FLPConfigAnswers>} A partial object containing the default values for unanswered prompts.
 */
function applyPromptOptionDefaults(
    answers: Partial<FLPConfigAnswers>,
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
 * Retrieves the default value for a prompt based on the provided default value or function.
 * If the default value is a function, it is executed with the current answers to determine the value.
 *
 * @param {Partial<FLPConfigAnswers>} answers - The current answers provided to default functions.
 * @param {PromptDefaultValue<string | boolean>['default'] | undefined} promptDefault - The default value or function to determine the default value.
 * @returns The default value for the prompt, or `undefined` if no default is provided.
 */
function getDefaultValue(
    answers: Partial<FLPConfigAnswers>,
    promptDefault?: PromptDefaultValue<string | boolean>['default']
): PromptDefaultValue<string | boolean>['default'] {
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
