import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { UI5LibraryAnswers, UI5LibraryPromptOptions } from './types/types';
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
 * @param promptOptions - options that can control some of the prompt behaviour. See {@link UI5LibraryPromptOptions} for details
 * @returns the prompt answers
 */
async function prompt(promptOptions?: UI5LibraryPromptOptions): Promise<UI5LibraryAnswers> {
    const ui5LibPrompts = await getPrompts(promptOptions);

    if (promptOptions?.useAutocomplete) {
        inquirer.registerPrompt('autocomplete', autocomplete);
    }
    return inquirer.prompt(ui5LibPrompts);
}

export { getPrompts, prompt, type UI5LibraryPromptOptions, type UI5LibraryAnswers };
