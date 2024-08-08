import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { initI18n } from './i18n';
import { PromptState } from './prompts/prompt-state';
import { getAbapDeployConfigQuestions } from './prompts';
import LoggerHelper from './logger-helper';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import type { AbapDeployConfigAnswers, AbapDeployConfigPromptOptions } from './types';

/**
 * Get the inquirer prompts for abap deploy config.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link AbapDeployConfigPromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @returns the prompts used to provide input for abap deploy config generation and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
async function getPrompts(
    promptOptions?: AbapDeployConfigPromptOptions,
    logger?: Logger
): Promise<{ prompts: any[]; answers: Partial<AbapDeployConfigAnswers> }> {
    await initI18n();
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/abap-deploy-config-inquirer' });

    return {
        prompts: await getAbapDeployConfigQuestions(promptOptions),
        // Return reference to derived answers object that will be populated with user responses (after prompting is complete)
        answers: PromptState.abapDeployConfig
    };
}

/**
 * Prompt for abap deploy config writer inputs.
 *
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behavior. See {@link AbapDeployConfigPromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: AbapDeployConfigPromptOptions,
    logger?: Logger
): Promise<AbapDeployConfigAnswers> {
    const abapDeployConfigPrompts = (await getPrompts(promptOptions, logger)).prompts;
    const answers = await adapter.prompt<AbapDeployConfigAnswers>(abapDeployConfigPrompts);

    // Add dervied service answers to the answers object
    Object.assign(answers, PromptState.abapDeployConfig);

    return answers;
}

export { getPrompts, prompt, type InquirerAdapter, type AbapDeployConfigAnswers, type AbapDeployConfigPromptOptions };
