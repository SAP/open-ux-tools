import { getQuestions, getAppRouterQuestions } from './prompts';
import type {
    CfDeployConfigPromptOptions,
    CfDeployConfigQuestions,
    CfSystemChoice,
    CfDeployConfigAnswers,
    CfAppRouterDeployConfigPromptOptions,
    CfAppRouterDeployConfigQuestions
} from './types';
import { promptNames, appRouterPromptNames, RouterModuleType } from './types';
import { initI18nCfDeployConfigInquirer } from './i18n';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import autocomplete from 'inquirer-autocomplete-prompt';
import type { Logger } from '@sap-ux/logger';
import LoggerHelper from './logger-helper';

/**
 * Retrieves Cloud Foundry deployment configuration prompts.
 *
 * This function returns a list of cf deployment questions based on the provided application root and prompt options.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @param logger - The logger instance to use for logging.
 * @returns {Promise<CfDeployConfigQuestions[]>} A promise that resolves to an array of questions for cf target prompting.
 */
async function getPrompts(
    promptOptions: CfDeployConfigPromptOptions,
    logger?: Logger
): Promise<CfDeployConfigQuestions[]> {
    if (logger) {
        LoggerHelper.logger = logger;
    }
    await initI18nCfDeployConfigInquirer();
    return getQuestions(promptOptions, LoggerHelper.logger);
}

/**
 * Retrieves the application router configuration prompts.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - The options for configuring application router prompts.
 * @param {Logger} [logger] - An optional logger instance.
 * @returns {Promise<CfAppRouterDeployConfigQuestions[]>} A promise that resolves to an array of
 * application router deployment configuration questions.
 */
async function getAppRouterPrompts(
    promptOptions: CfAppRouterDeployConfigPromptOptions,
    logger?: Logger
): Promise<CfAppRouterDeployConfigQuestions[]> {
    if (logger) {
        LoggerHelper.logger = logger;
    }
    await initI18nCfDeployConfigInquirer();
    return getAppRouterQuestions(promptOptions, LoggerHelper.logger);
}

/**
 * Prompt for cf inquirer inputs.
 *
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behavior. See {@link CfDeployConfigPromptOptions} for details
 * @param logger - logger instance to use for logging
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions: CfDeployConfigPromptOptions,
    logger?: Logger
): Promise<CfDeployConfigAnswers> {
    const cfPrompts = await getPrompts(promptOptions, logger);
    if (adapter?.promptModule && promptOptions[promptNames.destinationName]?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }
    const answers = await adapter.prompt<CfDeployConfigAnswers>(cfPrompts);
    return answers;
}

export {
    getPrompts,
    type CfDeployConfigPromptOptions,
    type CfSystemChoice,
    promptNames,
    prompt,
    appRouterPromptNames,
    getAppRouterPrompts,
    type CfAppRouterDeployConfigPromptOptions,
    RouterModuleType
};
