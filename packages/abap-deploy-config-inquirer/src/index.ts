import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { initI18n } from './i18n';
import { PromptState } from './prompts/prompt-state';
import { getAbapDeployConfigQuestions, getPackagePrompts, getTransportRequestPrompts } from './prompts';
import { getPackageAnswer, getTransportAnswer, reconcileAnswers } from './utils';
import LoggerHelper from './logger-helper';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import {
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapDeployConfigQuestion
} from './types';

/**
 * Get the inquirer prompts for abap deploy config.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link AbapDeployConfigPromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @returns the prompts used to provide input for abap deploy config generation and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
async function getPrompts(
    promptOptions?: AbapDeployConfigPromptOptions,
    logger?: Logger,
    isYUI = false
): Promise<{
    prompts: AbapDeployConfigQuestion[];
    answers: Partial<AbapDeployConfigAnswersInternal>;
}> {
    await initI18n();
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/abap-deploy-config-inquirer' });
    PromptState.isYUI = isYUI;
    PromptState.resetAbapDeployConfig();

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
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: AbapDeployConfigPromptOptions,
    logger?: Logger,
    isYUI = false
): Promise<AbapDeployConfigAnswers> {
    const abapDeployConfigPrompts = (await getPrompts(promptOptions, logger, isYUI)).prompts;
    const answers = await adapter.prompt<AbapDeployConfigAnswersInternal>(abapDeployConfigPrompts);

    return reconcileAnswers(answers, PromptState.abapDeployConfig);
}

export {
    getPrompts,
    prompt,
    getPackageAnswer,
    getTransportAnswer,
    reconcileAnswers,
    getPackagePrompts,
    getTransportRequestPrompts,
    TargetSystemType,
    PackageInputChoices,
    TransportChoices,
    type InquirerAdapter,
    type AbapDeployConfigQuestion,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions
};
