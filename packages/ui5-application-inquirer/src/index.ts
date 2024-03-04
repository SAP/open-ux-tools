import { type CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
import type { InquirerAdapter } from '@sap-ux/inquirer-common';
import { getDefaultUI5Theme, getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import autocomplete from 'inquirer-autocomplete-prompt';
import cloneDeep from 'lodash/cloneDeep';
import isNil from 'lodash/isNil';
import { getQuestions } from './prompts';
import type {
    PromptDefaultValue,
    UI5ApplicationAnswers,
    UI5ApplicationPromptOptions,
    UI5ApplicationQuestion
} from './types';
import { promptNames } from './types';
/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param promptOptions See {@link UI5ApplicationPromptOptions} for details
 * @param [capCdsInfo] - optional, additional information about CAP projects which if provided will be used instead of detecting and parsing CAP projects from the file system
 * @param [isYUI] - optional, default is `false`. Changes the behaviour of some validation since YUI does not re-validate prompts that may be inter-dependant.
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(
    promptOptions?: UI5ApplicationPromptOptions,
    capCdsInfo?: CdsUi5PluginInfo,
    isYUI = false
): Promise<UI5ApplicationQuestion[]> {
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        includeMaintained: true,
        includeDefault: true,
        minSupportedUI5Version: promptOptions?.ui5Version?.minUI5Version ?? undefined
    };
    const ui5Versions = await getUI5Versions(filterOptions);

    const promptOptionsClean = cloneDeep(promptOptions);

    return getQuestions(ui5Versions, promptOptionsClean, capCdsInfo, isYUI);
}

/**
 * Prompt for ui5 application writer inputs.
 *
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behavior. See {@link UI5ApplicationPromptOptions} for details
 * @param isCli - since CLI prompting is done serially but UI prompting occurs in parallel this impacts on how some validation is run
 * @param capCdsInfo - the CAP CDS info for the project, if this prompting will add a UI% app to an existing CAP project
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: UI5ApplicationPromptOptions,
    isCli = true,
    capCdsInfo?: CdsUi5PluginInfo
): Promise<UI5ApplicationAnswers> {
    const ui5AppPrompts = await exports.getPrompts(promptOptions, isCli, capCdsInfo);

    if (adapter?.promptModule && promptOptions?.ui5Version?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }

    const answers = await adapter.prompt<UI5ApplicationAnswers>(ui5AppPrompts);
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
    answers: Partial<UI5ApplicationAnswers>,
    promptOptions: UI5ApplicationPromptOptions
): Partial<UI5ApplicationAnswers> {
    const defaultAnswers: Partial<UI5ApplicationAnswers> = {};
    Object.entries(promptOptions).forEach(([key, promptOpt]) => {
        const promptKey = key as keyof typeof promptNames;
        // Do we have an answer, if not apply the default, either specified or fallback
        const defaultProperty = (promptOpt as PromptDefaultValue<string | boolean>).default;
        if (isNil(answers[promptKey]) && (defaultProperty ?? promptKey === promptNames.ui5Theme)) {
            let defaultValue;
            if (typeof defaultProperty === 'function') {
                defaultValue = (defaultProperty as Function)(answers);
            } else if (defaultProperty) {
                defaultValue = defaultProperty;
            } else if (promptKey === promptNames.ui5Theme) {
                defaultValue = getDefaultUI5Theme(answers.ui5Version);
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
    type CdsUi5PluginInfo,
    type InquirerAdapter,
    type PromptDefaultValue,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions
};
