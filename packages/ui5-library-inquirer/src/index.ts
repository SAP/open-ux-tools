import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { InquirerAdapter, UI5LibraryAnswers, UI5LibraryPromptOptions } from './types';
import autocomplete from 'inquirer-autocomplete-prompt';

/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param promptOptions See {@link UI5LibraryPromptOptions} for details
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(promptOptions?: UI5LibraryPromptOptions): Promise<Question<UI5LibraryAnswers>[]> {
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        includeMaintained: true
    };
    const ui5Versions = await getUI5Versions(filterOptions);
    const ui5LibPromptInputs: UI5LibraryPromptOptions = {
        targetFolder: promptOptions?.targetFolder,
        includeSeparators: promptOptions?.includeSeparators,
        useAutocomplete: promptOptions?.useAutocomplete
    };
    return getQuestions(ui5Versions, ui5LibPromptInputs);
}

/**
 * Prompt for ui5 library generation inputs.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link UI5LibraryPromptOptions} for details
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @returns the prompt answers
 */
async function prompt(promptOptions?: UI5LibraryPromptOptions, adapter?: InquirerAdapter): Promise<UI5LibraryAnswers> {
    const ui5LibPrompts = await exports.getPrompts(promptOptions);
    const pm = adapter ? adapter.promptModule : inquirer;

    if (promptOptions?.useAutocomplete) {
        pm.registerPrompt('autocomplete', autocomplete);
    }

    return adapter ? adapter.prompt(ui5LibPrompts) : inquirer.prompt(ui5LibPrompts);
}

export { getPrompts, prompt, type UI5LibraryPromptOptions, type UI5LibraryAnswers };
