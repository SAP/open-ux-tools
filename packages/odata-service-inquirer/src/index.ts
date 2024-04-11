import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { ErrorHandler } from './error-handler/errorHandler';
import { getQuestions } from './prompts';
import LoggerHelper from './prompts/logger-helper';
import { PromptStateHelper } from './prompts/prompt-helpers';
import { validateODataVersion } from './prompts/validators';
import type { OdataServiceAnswers, OdataServicePromptOptions, OdataServiceQuestion } from './types';
import { DatasourceType, promptNames, type CapRuntime, type CapService } from './types';

/**
 * Get the inquirer prompts for odata service.
 *
 * @param promptOptions
 * @param logger    - a logger compatible with the {@link Logger} interface
 * @returns the prompts used to provide input for odata service generation
 */
async function getPrompts(promptOptions?: OdataServicePromptOptions, logger?: Logger): Promise<OdataServiceQuestion[]> {
    // Initialize the logger refs
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/odata-service-inquirer' });
    // Why not use the static logger ref directly from the ErrorHandler?
    ErrorHandler.logger = LoggerHelper.logger;

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
    const odataServicePrompts = await getPrompts(promptOptions, logger);

    /* if (adapter?.promptModule && (promptOptions?.service?.useAutocomplete || promptOptions?.sapSystem?.useAutocomplete)) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    } */

    const answers = await adapter.prompt<OdataServiceAnswers>(odataServicePrompts);

    // Add dervied service answers to the answers object
    Object.assign(answers, PromptStateHelper.odataService);

    // Apply default values to prompts in case they have not been executed
    /*  if (promptOptions) {
        Object.assign(answers, await getDefaults(answers, promptOptions));
    }
 */
    return answers;
}

export {
    DatasourceType,
    OdataVersion,
    getPrompts,
    prompt,
    promptNames,
    // temp exports, remove once development is done
    validateODataVersion,
    type CapRuntime,
    type CapService,
    type InquirerAdapter,
    type OdataServiceAnswers,
    type OdataServicePromptOptions
};
