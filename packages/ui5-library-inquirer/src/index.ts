import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { UI5LibraryAnswers, UI5LibraryPromptInput } from './types/types';
import autocomplete from 'inquirer-autocomplete-prompt';

/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param targetFolder - optional default value for the targetFolder prompt
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(targetFolder?: string): Promise<Question<UI5LibraryAnswers>[]> {
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        removeDuplicateVersions: true,
        includeMaintained: true
    };
    const ui5LibPromptInputs: UI5LibraryPromptInput = {
        versions: await getUI5Versions(filterOptions),
        targetFolder
    };
    return getQuestions(ui5LibPromptInputs);
}

/**
 * Prompt for ui5 library generation inputs.
 *
 * @param targetFolder - optional default value for the targetFolder prompt
 * @returns the prompt answers
 */
async function prompt(targetFolder?: string): Promise<UI5LibraryAnswers> {
    const ui5LibPrompts = await getPrompts(targetFolder);
    inquirer.registerPrompt('autocomplete', autocomplete);
    return inquirer.prompt(ui5LibPrompts);
}

export { getPrompts, prompt, type UI5LibraryAnswers };
