import type { InquirerAdapter, YUIQuestion } from '@sap-ux/inquirer-common';
import isNil from 'lodash/isNil';
import { getQuestions } from './prompts';
import type { OdataServiceAnswers, OdataServicePromptOptions, PromptDefaultValue } from './types';
import { promptNames } from './types';
/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions
 */
function getPrompts(promptOptions?: OdataServicePromptOptions): YUIQuestion[] {
    return getQuestions(promptOptions);
}

/**
 * Prompt for odata service writer inputs.
 *
 * @param adapter
 * @param promptOptions
 * @param capCdsInfo
 * @param isYUI
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: OdataServicePromptOptions
): Promise<OdataServiceAnswers> {
    const ui5AppPrompts = getPrompts(promptOptions);

    /* if (adapter?.promptModule && (promptOptions?.service?.useAutocomplete || promptOptions?.sapSystem?.useAutocomplete)) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    } */

    const answers = await adapter.prompt<OdataServiceAnswers>(ui5AppPrompts);
    // Apply default values to prompts in case they have not been executed
    if (promptOptions) {
        Object.assign(answers, await getDefaults(answers, promptOptions));
    }

    return answers;
}

/**
 * Return the default values for prompts that did not provide an answer.
 * This can be derived from user input, or a fallback default in case an answer was not provided due to the prompt not having been executed.
 *
 * @param answers - the answers from previous prompting, which if present will be used instead of defaults
 * @param promptOptions - the prompt options
 * @returns answer values
 */
function getDefaults(
    answers: Partial<OdataServiceAnswers>,
    promptOptions: OdataServicePromptOptions
): Partial<OdataServiceAnswers> {
    const defaultAnswers: Partial<OdataServiceAnswers> = {};
    Object.entries(promptOptions).forEach(([key, promptOpt]) => {
        const promptKey = key as keyof typeof promptNames;
        // Do we have an answer, if not apply the default, either specified or fallback
        const defaultProperty = (promptOpt as PromptDefaultValue<string | boolean>).default;
        if (isNil(answers[promptKey]) && defaultProperty) {
            let defaultValue;
            if (typeof defaultProperty === 'function') {
                defaultValue = (defaultProperty as Function)(answers);
            } else if (defaultProperty) {
                defaultValue = defaultProperty;
            }
            Object.assign(defaultAnswers, {
                [promptKey]: defaultValue
            });
        }
    });

    return defaultAnswers;
}

export {
    getPrompts,
    prompt,
    promptNames,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions
};
