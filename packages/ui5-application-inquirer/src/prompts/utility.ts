import type { UI5Theme } from '@sap-ux/ui5-info';
import { getUi5Themes, type UI5Version } from '@sap-ux/ui5-info';
import { existsSync } from 'fs';
import * as fuzzy from 'fuzzy';
import type { Answers, Question } from 'inquirer';
import { Separator, type ListChoiceOptions } from 'inquirer';
import { join } from 'path';
import { coerce, gte } from 'semver';
import { defaultProjectNumber, t } from '../i18n';
import { type UI5VersionChoice } from '../types';

/**
 * Finds the search value in the provided list using `fuzzy` search.
 *
 * @param searchVal - the string to search for
 * @param searchList - the list in which to search by fuzzy matching the choice name
 * @returns Inquirer choices filtered by the search value
 */
export function searchChoices(searchVal: string, searchList: ListChoiceOptions[]): ListChoiceOptions[] {
    return searchVal && searchList
        ? fuzzy
              .filter(searchVal, searchList, {
                  // Only `choice.name` searching is supported, as this is what is presented to the user by Inquirer
                  extract: (choice: ListChoiceOptions) => choice.name ?? ''
              })
              .map((el) => el.original)
        : searchList;
}
// todo: Move to prompts common module
/**
 * Creates a list of UI5 Versions prompt choices, adding additional maintenance info for use in prompts
 * and grouping according to maintenance status.
 *
 * @param versions ui5Versions
 * @param defaultChoice
 * @param includeSeparators Include a separator to visually identify groupings, if false then grouping info is included in each entry as additional name text
 * @returns Array of ui5 version choices and separators if applicable, grouped by maintenance state
 */
export function ui5VersionsGrouped(
    versions: UI5Version[],
    defaultChoice?: ListChoiceOptions,
    includeSeparators = false
): (UI5VersionChoice | Separator)[] {
    if (!versions || (Array.isArray(versions) && versions.length === 0)) {
        return [];
    }

    const maintChoices = versions
        .filter((v) => v.maintained === true)
        .map(
            (mainV) =>
                ({
                    name: !includeSeparators
                        ? `${mainV.version} - (${t('ui5VersionLabels.maintained')} ${t('ui5VersionLabels.version', {
                              count: 1
                          })})`
                        : mainV.version,
                    value: mainV.version
                } as UI5VersionChoice)
        );
    const notMaintChoices = versions
        .filter((v) => v.maintained === false)
        .map(
            (mainV) =>
                ({
                    name: !includeSeparators
                        ? `${mainV.version} - (${t('ui5VersionLabels.outOfMaintenance')} ${t(
                              'ui5VersionLabels.version',
                              { count: 1 }
                          )})`
                        : mainV.version,
                    value: mainV.version
                } as UI5VersionChoice)
        );

    
    const defaultChoices = defaultChoice ? [{
        name: !includeSeparators
            ? `${defaultChoice?.name} - (Provided default ${t('ui5VersionLabels.version')})`
            : defaultChoice?.name,
        value: defaultChoice?.value
    } as UI5VersionChoice] : [];

    if (includeSeparators) {
        if (defaultChoices) {
            (defaultChoices as (UI5VersionChoice | Separator)[]).unshift(
                new Separator(`Provided default ${t('ui5VersionLabels.version', { count: 1 })}`)
            );
        }
        (maintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.maintained')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
        (notMaintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.outOfMaintenance')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
    }

    return [...defaultChoices, ...maintChoices, ...notMaintChoices];
}

/**
 * Tests if a directory with the specified `appName` exists at the path specified by `targetPath`.
 *
 * @param appName directory name of application
 * @param targetPath directory path where application directory would be created
 * @returns true, if the combined path exists otherwise false
 */
export function pathExists(appName: string, targetPath?: string): boolean | string {
    return existsSync(join(targetPath ?? process.cwd(), appName.trim()));
}
/**
 * Generate a default applicaiton name that does not exist at the specified path.
 *
 * @param targetPath the target path where the application directory would be created
 * @returns a suggested application name that can be created at the specified target path
 */
export function defaultAppName(targetPath: string): string {
    let defProjNum = defaultProjectNumber;
    let defaultName = t('prompts.appNameDefault');
    while (pathExists(`${defaultName}`, targetPath)) {
        defaultName = t('prompts.appNameDefault', { defaultProjectNumber: ++defProjNum });
        // Dont loop forever, user will need to provide input otherwise
        if (defProjNum > 999) {
            break;
        }
    }
    return defaultName;
}

/**
 * Get the UI5 themes as prompt choices applicable for the specified UI5 version.
 *
 * @param ui5Version - UI5 semantic version
 * @returns UI5 themes as list choice options
 */
export function getUI5ThemesChoices(ui5Version?: string): ListChoiceOptions[] {
    const themes = getUi5Themes(ui5Version);
    return themes.map((theme: UI5Theme) => ({
        name: theme.label,
        value: theme.id
    }));
}

/**
 * Replace any empty string values where they are not valid inputs and replace with undefined.
 * This allows nullish coalescing operator to be used without additional empty string conditions
 * when generating prompts.
 *
 * @param promptOptions the prompt options to be cleaned
 * @returns prompt options with empty string values replaced with undefined where appropriate
 */
/* export function cleanPromptOptions(promptOptions?: UI5ApplicationPromptOptions) {
    if (promptOptions) {
        // Prompt option values that should not allow empty strings (zero length or all spaces)
        const nonEmptyPrompts = [promptNames.name, promptNames.targetFolder, promptNames.ui5Version];
        Object.entries(promptOptions).forEach(([promptKey, promptOpt]) => {
            if (
                nonEmptyPrompts.includes(promptNames[promptKey as keyof typeof promptNames]) &&
                promptOpt.value &&
                (promptOpt?.value as string).trim().length === 0
            ) {
                promptOpt.value = undefined;
            }
        });
    }
    return promptOptions;
} */

/**
 * Checks if the specified semantic version string is greater than or equal to the minimum version.
 * If the specified version is not a parseable semantic version, returns true.
 *
 * @param version the version to test
 * @param minVersion the minimum version to test against
 * @returns - true if the specified version is greater than or equal to the minimum version, or the version is not a coercable semver
 */
export function isVersionIncluded(version: string, minVersion: string): boolean {
    // Extract a usable version, `snapshot`, `latest` etc will be ignored
    const ui5SemVer = coerce(version);
    if (ui5SemVer) {
        return gte(ui5SemVer, minVersion);
    }
    return true;
}

/**
 * Adds additional conditions to the provided questions.
 *
 * @param questions
 * @param condition function which returns true or false
 * @returns the passed questions reference
 */
export function withCondition(questions: Question[], condition: (answers: Answers) => boolean): Question[] {
    questions.forEach((question) => {
        if (question.when !== undefined) {
            if (typeof question.when === 'function') {
                const when = question.when as (answers: Answers) => boolean | Promise<boolean>;
                question.when = (answers: Answers): boolean | Promise<boolean> => {
                    if (condition(answers)) {
                        return when(answers);
                    } else {
                        return false;
                    }
                };
            } else {
                question.when = (answers: Answers): boolean => {
                    return condition(answers) && (question.when as boolean);
                };
            }
        } else {
            question.when = condition;
        }
    });
    return questions;
}
