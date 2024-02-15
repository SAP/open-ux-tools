import { getDefaultUI5Theme, getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { type CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
import { type Question } from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import cloneDeep from 'lodash/cloneDeep';
import isNil from 'lodash/isNil';
import { getQuestions } from './prompts';
import type { PromptDefaultValue } from './types';
import { promptNames, type UI5ApplicationAnswers, type UI5ApplicationPromptOptions } from './types';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';

/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param promptOptions See {@link UI5ApplicationPromptOptions} for details
 * @param [isCli] Changes some prompt logic for YUI execution otherwise prompts will be executed serially in a command line environment
 * @param [capCdsInfo] - optional, additional information about CAP projects which if provided will be used instead of detecting and parsing CAP projects from the file system
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(
    promptOptions?: UI5ApplicationPromptOptions,
    isCli = true,
    capCdsInfo?: CdsUi5PluginInfo
): Promise<Question<UI5ApplicationAnswers>[]> {
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        includeMaintained: true,
        includeDefault: true,
        minSupportedUI5Version: promptOptions?.ui5Version?.minUI5Version ?? undefined
    };
    const ui5Versions = await getUI5Versions(filterOptions);

    const promptOptionsClean = cloneDeep(promptOptions);

    return getQuestions(ui5Versions, promptOptionsClean, isCli, capCdsInfo);
}

/**
 * Prompt for ui5 application writer inputs.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link UI5ApplicationPromptOptions} for details
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param isCli
 * @param capCdsInfo
 * @returns the prompt answers
 */
async function prompt(
    promptOptions: UI5ApplicationPromptOptions,
    adapter: InquirerAdapter,
    isCli = true,
    capCdsInfo?: CdsUi5PluginInfo
): Promise<UI5ApplicationAnswers> {
    const ui5AppPrompts = await exports.getPrompts(promptOptions, isCli, capCdsInfo);

    if (adapter?.promptModule && promptOptions.ui5Version?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }

    const answers = await adapter.prompt<UI5ApplicationAnswers>(ui5AppPrompts);
    // Apply default values to prompts in case they have not been executed
    //if (!answers?.showAdvanced) {
    Object.assign(answers, await getDefaults(answers, promptOptions));
    //}

    return answers;
}

/**
 * Return the default values for prompts that did not provide an answer.
 * This can be derived from user input, or a fallback default in case an answer was not provided due to the prompt not having been executed.
 *
 * @param answers
 * @param promptOptions
 * @returns answer values
 */
function getDefaults(
    answers: Partial<UI5ApplicationAnswers>,
    promptOptions: UI5ApplicationPromptOptions
): Partial<UI5ApplicationAnswers> {
    const defaultAnswers: Partial<UI5ApplicationAnswers> = {};
    Object.entries(promptOptions).forEach(([key, promptOpt]) => {
        //if (promptOpt.advancedOption) {
        const promptKey = key as keyof typeof promptNames;
        // Do we have an answer, if notapply the default, either passed or fallback
        if (isNil(answers[promptKey])) {
            let defaultValue;

            if (typeof (promptOpt as PromptDefaultValue<string | boolean>).default === 'function') {
                defaultValue = ((promptOpt as PromptDefaultValue<string | boolean>).default as Function)(answers);
            } else if ((promptOpt as PromptDefaultValue<string | boolean>).default) {
                defaultValue = (promptOpt as PromptDefaultValue<string | boolean>).default;
            } else if (promptKey === promptNames.ui5Theme) {
                defaultValue = getDefaultUI5Theme(answers.ui5Version);
            }
            Object.assign(defaultAnswers, {
                [promptKey]: defaultValue
            });
        } /*  else {
            defaultValue = answers[promptKey];
        } */

        //}
    });

    return defaultAnswers;
}

export {
    getPrompts,
    prompt,
    promptNames,
    type CdsUi5PluginInfo,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions,
    type InquirerAdapter,
    type PromptDefaultValue
};
