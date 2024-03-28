import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { type Logger, ToolsLogger } from '@sap-ux/logger';
import isNil from 'lodash/isNil';
import { getQuestions } from './prompts';
import LoggerHelper from './prompts/logger-helper';
import type { OdataServiceAnswers, OdataServicePromptOptions, OdataServiceQuestion, PromptDefaultValue } from './types';
import { DatasourceType, promptNames } from './types';
import PromptHelper from './prompts/prompt-helpers';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateODataVersion } from './prompts/validators';

/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions
 * @param logger    - a logger compatible with the {@link Logger} interface
 * @returns the prompts used to provide input for odata service generation
 */
function getPrompts(promptOptions?: OdataServicePromptOptions, logger?: Logger): OdataServiceQuestion[] {
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: 'OdataServiceInquirer' });
    return getQuestions(promptOptions);
}

/**
 * Prompt for odata service writer inputs.
 *
 * @param adapter
 * @param promptOptions
 * @param logger
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: OdataServicePromptOptions,
    logger?: Logger
): Promise<OdataServiceAnswers> {
    const odataServicePrompts = getPrompts(promptOptions, logger);

    /* if (adapter?.promptModule && (promptOptions?.service?.useAutocomplete || promptOptions?.sapSystem?.useAutocomplete)) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    } */

    const answers = await adapter.prompt<OdataServiceAnswers>(odataServicePrompts);

    // Add dervied service answers to the answers object
    Object.assign(answers, PromptHelper.odataService);

    // Apply default values to prompts in case they have not been executed
    /*  if (promptOptions) {
        Object.assign(answers, await getDefaults(answers, promptOptions));
    }
 */
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
        const defaultProperty = (promptOpt as PromptDefaultValue<string | boolean | object>).default;
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
    DatasourceType,
    getPrompts,
    prompt,
    promptNames,
    OdataVersion,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions,
    // temp exports, remove once development is done
    validateODataVersion
};
