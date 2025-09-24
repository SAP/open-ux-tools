import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { executeNpmUI5VersionsCmd } from '@sap-ux/ui5-info/dist/commands';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import inquirer, { type Question } from 'inquirer';
import { getQuestions } from './prompts';
import type { UI5LibraryAnswers, UI5LibraryPromptOptions } from './types';
import autocomplete from 'inquirer-autocomplete-prompt';

/**
 * Simple version comparison for finding the nearest version.
 *
 * @param a - The first version string to compare
 * @param b - The second version string to compare
 * @returns A negative number if a < b, positive if a > b, or 0 if equal
 */
function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;

        if (aPart < bPart) {
            return -1;
        }
        if (aPart > bPart) {
            return 1;
        }
    }
    return 0;
}

/**
 * Find the nearest available npm version to the selected UI5 version.
 *
 * @param selectedVersion - The UI5 version selected by the user
 * @returns Promise that resolves to the nearest available npm version
 */
async function findNearestNpmVersion(selectedVersion: string): Promise<string> {
    try {
        const npmVersions = await executeNpmUI5VersionsCmd();

        // Remove any non-version strings and sort versions
        const validVersions = npmVersions.filter((v) => /^\d+\.\d+\.\d+/.test(v)).sort(compareVersions);

        if (validVersions.length === 0) {
            return selectedVersion; // Fallback to selected version if no npm versions found
        }

        // Find exact match first
        if (validVersions.includes(selectedVersion)) {
            return selectedVersion;
        }

        // Find the nearest lower version (closest but not higher)
        let nearestVersion = validVersions[0]; // Start with the lowest version as fallback

        for (const version of validVersions) {
            const comparison = compareVersions(version, selectedVersion);

            // If this version is less than or equal to selected version
            if (comparison <= 0) {
                // Check if it's closer than our current nearest version
                if (compareVersions(version, nearestVersion) > 0) {
                    nearestVersion = version;
                }
            }
        }

        return nearestVersion;
    } catch (error) {
        // If npm command fails, return the selected version as fallback
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

    let resolvedUi5Version: string | undefined;

    // If a version was previously selected, find the nearest npm version
    if (promptOptions?.resolvedUi5Version) {
        resolvedUi5Version = await findNearestNpmVersion(promptOptions.resolvedUi5Version);
    }

    const ui5LibPromptInputs: UI5LibraryPromptOptions = {
        targetFolder: promptOptions?.targetFolder,
        includeSeparators: promptOptions?.includeSeparators,
        useAutocomplete: promptOptions?.useAutocomplete,
        resolvedUi5Version
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
    if (answers.ui5Version) {
        const resolvedVersion = await findNearestNpmVersion(answers.ui5Version);

        // Update the answer with the resolved version if different
        if (resolvedVersion !== answers.ui5Version) {
            answers.ui5Version = resolvedVersion;
        }
    }

    return answers;
}

/**
 * Enhanced prompt function that performs version resolution in two steps.
 * First gets user selection, then finds nearest npm version.
 *
 * @param promptOptions - options that can control some of the prompt behavior
 * @param adapter - optionally provide references to a calling inquirer instance
 * @returns the prompt answers with resolved UI5 version
 */
async function promptWithVersionResolution(
    promptOptions?: UI5LibraryPromptOptions,
    adapter?: InquirerAdapter
): Promise<UI5LibraryAnswers> {
    // First step: Get user's initial selection
    const answers = await prompt(promptOptions, adapter);

    // Second step: If UI5 version was selected, resolve to nearest npm version
    if (answers.ui5Version) {
        const resolvedVersion = await findNearestNpmVersion(answers.ui5Version);

        // Update with resolved version
        answers.ui5Version = resolvedVersion;
    }

    return answers;
}

export {
    getPrompts,
    prompt,
    promptWithVersionResolution,
    findNearestNpmVersion,
    type UI5LibraryPromptOptions,
    type UI5LibraryAnswers,
    type InquirerAdapter
};
