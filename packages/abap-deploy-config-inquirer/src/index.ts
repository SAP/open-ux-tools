import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { initI18n } from './i18n.js';
import { PromptState } from './prompts/prompt-state.js';
import { getAbapDeployConfigQuestions, getPackagePrompts, getTransportRequestPrompts } from './prompts/index.js';
import { getPackageAnswer, getTransportAnswer, reconcileAnswers } from './utils.js';
import LoggerHelper from './logger-helper.js';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import {
    promptNames,
    PackageInputChoices,
    TargetSystemType,
    TransportChoices,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapDeployConfigQuestion
} from './types.js';
import { AbapServiceProviderManager } from './service-provider-utils/abap-service-provider.js';
import autocomplete from 'inquirer-autocomplete-prompt';
import type { PromptModule } from 'inquirer';

/**
 * Registers the autocomplete plugin with the prompt module if any question uses the autocomplete type.
 *
 * @param questions - the list of inquirer questions to inspect
 * @param promptModule - optional inquirer prompt module instance
 */
function registerAutocompletePlugin(
    questions: AbapDeployConfigQuestion[],
    promptModule: PromptModule | undefined
): void {
    if (promptModule && questions.some((q) => q.type === 'autocomplete')) {
        promptModule.registerPrompt('autocomplete', autocomplete);
    }
}

/**
 * Get the inquirer prompts for abap deploy config.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link AbapDeployConfigPromptOptions} for details
 * @param logger - a logger compatible with the {@link Logger} interface
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @param promptModule - optional inquirer prompt module instance used to register plugins
 * @returns the prompts used to provide input for abap deploy config generation and a reference to the answers object which will be populated with the user's responses once `inquirer.prompt` returns
 */
async function getPrompts(
    promptOptions?: AbapDeployConfigPromptOptions,
    logger?: Logger,
    isYUI = false,
    promptModule?: PromptModule
): Promise<{
    prompts: AbapDeployConfigQuestion[];
    answers: Partial<AbapDeployConfigAnswersInternal>;
}> {
    await initI18n();
    LoggerHelper.logger = logger ?? new ToolsLogger({ logPrefix: '@sap-ux/abap-deploy-config-inquirer' });
    PromptState.isYUI = isYUI;
    PromptState.resetAbapDeployConfig();
    AbapServiceProviderManager.resetIsDefaultProviderAbapCloud();

    const prompts = await getAbapDeployConfigQuestions(promptOptions);
    registerAutocompletePlugin(prompts, promptModule);

    return {
        prompts,
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
    const abapDeployConfigPrompts = (await getPrompts(promptOptions, logger, isYUI, adapter?.promptModule)).prompts;
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
    promptNames,
    TargetSystemType,
    PackageInputChoices,
    TransportChoices,
    type InquirerAdapter,
    type AbapDeployConfigQuestion,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions
};
export { DEFAULT_PACKAGE_ABAP } from './constants.js';
