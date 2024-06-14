import { type CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
import type { InquirerAdapter, PromptDefaultValue } from '@sap-ux/inquirer-common';
import { getDefaultUI5Theme, getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import autocomplete from 'inquirer-autocomplete-prompt';
import isNil from 'lodash/isNil';
import { getQuestions } from './prompts';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from './types';
import { promptNames } from './types';
import { initI18nUi5AppInquirer } from './i18n';
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
    // prompt texts must be loaded before the prompts are created, wait for the i18n bundle to be initialized
    await initI18nUi5AppInquirer();
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        includeMaintained: true,
        includeDefault: true,
        minSupportedUI5Version: promptOptions?.ui5Version?.minUI5Version ?? undefined
    };
    const ui5Versions = await getUI5Versions(filterOptions);

    return getQuestions(ui5Versions, promptOptions, capCdsInfo, isYUI);
}

/**
 * Prompt for ui5 application writer inputs.
 *
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behavior. See {@link UI5ApplicationPromptOptions} for details
 * @param [capCdsInfo] - the CAP CDS info for the project, if this prompting will add a UI% app to an existing CAP project
 * @param [isYUI] - optional, default is `false`. Changes the behaviour of some validation since YUI does not re-validate prompts that may be inter-dependant.
 * @returns the prompt answers
 */
async function prompt(
    adapter: InquirerAdapter,
    promptOptions?: UI5ApplicationPromptOptions,
    capCdsInfo?: CdsUi5PluginInfo,
    isYUI = false
): Promise<UI5ApplicationAnswers> {
    const ui5AppPrompts = await getPrompts(promptOptions, capCdsInfo, isYUI);

    if (adapter?.promptModule && promptOptions?.ui5Version?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }

    const answers = await adapter.prompt<UI5ApplicationAnswers>(ui5AppPrompts);
    // Apply default values to prompts in case they have not been executed
    Object.assign(answers, await getDefaults(answers, ui5AppPrompts, promptOptions, capCdsInfo));

    return answers;
}

/**
 * Return the default values for prompts that did not provide an answer. The answer can be assigned from the prompt options or a prompt default otherwise.
 *
 * @param answers the answers from previous prompting, only answers without a value will be considered for defaulting
 * @param ui5AppPrompts the prompts that were used to prompt the user, note that hidden prompts will not be included
 * @param promptOptions the prompt options which may provide default values or functions
 * @param capCdsInfo will be passed as additional answer to default functions that depend on it to determine the default value
 * @returns the default values for the unanswered prompts based on the prompt options and prompt defaults
 */
function getDefaults(
    answers: Partial<UI5ApplicationAnswers>,
    ui5AppPrompts: UI5ApplicationQuestion[],
    promptOptions?: UI5ApplicationPromptOptions,
    capCdsInfo?: CdsUi5PluginInfo
): Partial<UI5ApplicationAnswers> {
    let defaultAnswers: Partial<UI5ApplicationAnswers> = {};

    // First apply prompt option defaults
    if (promptOptions) {
        defaultAnswers = applyPromptOptionDefaults(answers, promptOptions, capCdsInfo);
    }
    // Apply default values for still unanswered prompts
    Object.values(ui5AppPrompts).forEach(({ name }) => {
        const promptName = name as keyof typeof promptNames;
        if (isNil(answers[promptName]) && isNil(defaultAnswers[promptName])) {
            const defaultProperty = (
                ui5AppPrompts.find((prompt) => prompt.name === promptName) as PromptDefaultValue<string | boolean>
            )?.default;
            let defaultValue;
            if (typeof defaultProperty === 'function') {
                defaultValue = (defaultProperty as Function)(answers);
            } else if (defaultProperty !== undefined) {
                defaultValue = defaultProperty;
            }
            Object.assign(defaultAnswers, {
                [promptName]: defaultValue
            });
        }
    });

    return defaultAnswers;
}

/**
 * Apply prompt option default values to prompt answers in case they have not been executed by the user selections.
 * This can occur where some prompts are hidden by advanced option selections.
 *
 * @param answers the answers from previous prompting, only answers without a value will be considered for defaulting
 * @param promptOptions the prompt options which may provide default values or functions
 * @param capCdsInfo will be passed as additional answer to default functions that depend on it to determine the default value
 * @returns the default values for the unanswered prompts, based on the prompt options
 */
function applyPromptOptionDefaults(
    answers: Partial<UI5ApplicationAnswers>,
    promptOptions: UI5ApplicationPromptOptions,
    capCdsInfo?: CdsUi5PluginInfo
): Partial<UI5ApplicationAnswers> {
    const defaultAnswers: Partial<UI5ApplicationAnswers> = {};
    Object.entries(promptOptions).forEach(([key, promptOpt]) => {
        const promptKey = key as keyof typeof promptNames;
        // Do we have an answer, if not apply the default, either specified or fallback
        const defaultProperty = (promptOpt as PromptDefaultValue<string | boolean>).default;

        // A prompt option for ui5Theme is not supported (as its dependant on the ui5Version) and is handled separately
        if (isNil(answers[promptKey]) && (defaultProperty ?? promptKey === promptNames.ui5Theme)) {
            let defaultValue;
            if (promptKey === promptNames.ui5Theme) {
                defaultValue = getDefaultUI5Theme(answers.ui5Version);
            } else if (promptKey === promptNames.enableTypeScript) {
                // TypeScript default value is dependent on the CdsUi5PluginInfo
                const enableTypeScriptOpts = promptOpt as UI5ApplicationPromptOptions['enableTypeScript'];
                // If an enableTypeScript default function is provided, use it to determine the default value
                // otherwise override with the provided default value
                defaultValue =
                    typeof enableTypeScriptOpts?.default === 'function'
                        ? enableTypeScriptOpts.default({ ...answers, capCdsInfo })
                        : defaultProperty;
            } else if (typeof defaultProperty === 'function') {
                defaultValue = (defaultProperty as Function)(answers);
            } else if (defaultProperty !== undefined) {
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
    type CdsUi5PluginInfo,
    type InquirerAdapter,
    type PromptDefaultValue,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions
};
