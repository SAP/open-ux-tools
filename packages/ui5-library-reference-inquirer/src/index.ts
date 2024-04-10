import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { UI5LibraryReferenceAnswers, UI5LibraryReferencePromptOptions } from './types';
import {
    getLibraryChoices,
    findFioriArtifacts,
    type FioriArtifactTypes,
    type WorkspaceFolder
} from '@sap-ux/project-access';
import { getProjectChoices } from './projects';

/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param wsFolders - workspace folders to search for fiori artifacts
 * @param promptOptions - options that can control some of the prompt behaviour
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(
    wsFolders: WorkspaceFolder[] | string[],
    promptOptions?: UI5LibraryReferencePromptOptions
): Promise<Question<UI5LibraryReferenceAnswers>[]> {
    const options = {
        wsFolders: wsFolders,
        artifacts: ['applications', 'libraries'] as FioriArtifactTypes[]
    };
    const fioriArtifacts = await findFioriArtifacts(options);

    const projectChoices = await getProjectChoices(fioriArtifacts?.applications);
    const libraryChoices = await getLibraryChoices(fioriArtifacts?.libraries);

    return getQuestions(projectChoices, libraryChoices, promptOptions);
}

/**
 * Prompt for ui5 library generation inputs.
 *
 * @param wsFolders - workspace folders to search for fiori artifacts
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @param promptOptions - options that can control some of the prompt behaviour
 * @returns the prompt answers
 */
async function prompt(
    wsFolders?: WorkspaceFolder[] | string[],
    adapter?: InquirerAdapter,
    promptOptions?: UI5LibraryReferencePromptOptions
): Promise<UI5LibraryReferenceAnswers> {
    const ui5LibPrompts = await exports.getPrompts(promptOptions, wsFolders);

    return adapter ? adapter.prompt(ui5LibPrompts) : inquirer.prompt(ui5LibPrompts);
}

export {
    getPrompts,
    prompt,
    type UI5LibraryReferencePromptOptions,
    type UI5LibraryReferenceAnswers,
    type InquirerAdapter
};
