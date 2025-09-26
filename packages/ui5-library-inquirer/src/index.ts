import { getUI5Versions, latestVersionString, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { ToolsLogger } from '@sap-ux/logger';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { UI5LibraryAnswers, UI5LibraryPromptOptions } from './types';
import autocomplete from 'inquirer-autocomplete-prompt';

/**
 * Find the nearest available npm version to the selected UI5 version using getUI5Versions.
 *
 * @param selectedVersion - The UI5 version selected by the user
 * @returns Promise that resolves to the nearest available npm version
 */
async function findNearestNpmVersion(selectedVersion: string): Promise<string> {
    try {
        // Query npm registry for @sapui5/distribution-metadata package to find the best available version.
        // This approach ensures we get versions that are actually published to npm, which is required for
        // ui5.yaml framework configuration, rather than versions only available on the UI5 CDN.
        // - onlyNpmVersion: queries npm registry via 'npm show @sapui5/distribution-metadata versions'
        // - onlyVersionNumbers: filters out non-semantic versions like 'snapshot-1.120' or 'Latest'
        // - ui5SelectedVersion: prioritizes the user's selected version if available in npm
        const npmVersion = (
            await getUI5Versions({
                onlyVersionNumbers: true,
                onlyNpmVersion: true,
                ui5SelectedVersion: selectedVersion ?? latestVersionString
            })
        )[0]?.version;

        return npmVersion || selectedVersion;
    } catch (error) {
        // Log the failure and fall back to the selected version
        new ToolsLogger().warn(
            `Failed to resolve npm version for UI5 version '${selectedVersion}'. Error: ${
                error instanceof Error ? error.message : String(error)
            }. Using selected version as fallback.`
        );
        return selectedVersion;
    }
}

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
        useAutocomplete: promptOptions?.useAutocomplete,
        resolvedUi5Version: promptOptions?.resolvedUi5Version
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

    // If a UI5 version was selected, resolve it to the nearest available npm version
    // Flow is:
    // 1. User selects version from ui5 CDN supported versions
    // 2. Selected version is used to get the nearest ui5 version from npm as ui5.yaml is using framework rather than ui5 cdn.
    if (answers.ui5Version) {
        const resolvedVersion = await findNearestNpmVersion(answers.ui5Version);

        // Update the answer with the resolved version if different
        if (resolvedVersion !== answers.ui5Version) {
            answers.ui5Version = resolvedVersion;
        }
    }

    return answers;
}

export { getPrompts, prompt, findNearestNpmVersion };

export type { UI5LibraryAnswers, UI5LibraryPromptOptions } from './types';
export type { InquirerAdapter } from '@sap-ux/inquirer-common';
