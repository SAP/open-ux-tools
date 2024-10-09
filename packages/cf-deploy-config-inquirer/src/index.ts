import { getQuestions } from './prompts';
import type {
    CfDeployConfigPromptOptions,
    CfDeployConfigQuestions,
    CfSystemChoice,
    CfDeployConfigAnswers
} from './types';
import { promptNames } from './types';
import { initI18nCfDeployConfigInquirer } from './i18n';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import autocomplete from 'inquirer-autocomplete-prompt';

/**
 * Retrieves Cloud Foundry deployment configuration prompts.
 *
 * This function returns a list of cf deployment questions based on the provided application root and prompt options.
 *
 * @param {CfDeployConfigPromptOptions} promptOptions - The configuration options for prompting during cf target deployment.
 * @returns {Promise<CfDeployConfigQuestions[]>} A promise that resolves to an array of questions for cf target prompting.
 */
async function getPrompts(promptOptions: CfDeployConfigPromptOptions): Promise<CfDeployConfigQuestions[]> {
    await initI18nCfDeployConfigInquirer();
    return getQuestions(promptOptions);
}

/**
 * Prompt for cf inquirer inputs.
 *
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behavior. See {@link CfDeployConfigPromptOptions} for details
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions: CfDeployConfigPromptOptions
): Promise<CfDeployConfigAnswers> {
    const cfPrompts = await getPrompts(promptOptions);
    if (adapter?.promptModule && promptOptions[promptNames.destinationName]?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }
    const answers = await adapter.prompt<CfDeployConfigAnswers>(cfPrompts);
    return answers;
}

export { getPrompts, CfDeployConfigPromptOptions, CfSystemChoice, promptNames, prompt };
