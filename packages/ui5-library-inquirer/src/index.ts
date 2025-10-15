import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { UI5LibraryAnswers, UI5LibraryPromptOptions } from './types';
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
        includeMaintained: true,
        onlyNpmVersion: true
    };
    // Get only npm-available UI5 versions to avoid post-selection resolution
    const allUI5Versions = await getUI5Versions(filterOptions);

    // Filter for maintained versions only
    const ui5Versions = allUI5Versions.filter((version) => version.maintained === true);

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
    const ui5LibPrompts = await getPrompts(promptOptions);
    const pm = adapter ? adapter.promptModule : inquirer;

    if (pm && promptOptions?.useAutocomplete) {
        pm.registerPrompt('autocomplete', autocomplete);
    }

    const answers: UI5LibraryAnswers = adapter
        ? await adapter.prompt(ui5LibPrompts)
        : await inquirer.prompt(ui5LibPrompts);
    return answers;
}

export { getPrompts, prompt };

export type { UI5LibraryAnswers, UI5LibraryPromptOptions } from './types';
export type { InquirerAdapter } from '@sap-ux/inquirer-common';
