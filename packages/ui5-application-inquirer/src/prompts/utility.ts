import type { UI5Theme } from '@sap-ux/ui5-info';
import { getUi5Themes, type UI5Version } from '@sap-ux/ui5-info';
import { existsSync } from 'fs';
import * as fuzzy from 'fuzzy';
import type { Answers, Question } from 'inquirer';
import { Separator, type ListChoiceOptions } from 'inquirer';
import { join } from 'path';
import { coerce, gte } from 'semver';
import { defaultProjectNumber, t } from '../i18n';
import type {
    UI5ApplicationAnswers,
    UI5ApplicationPromptOptions,
    UI5ApplicationQuestion,
    promptNames,
    PromptDefaultValue,
    CommonPromptOptions,
    validate
} from '../types';
import { type UI5VersionChoice, type PromptSeverityMessage } from '../types';

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
 * @param includeSeparators Include a separator to visually identify groupings, if false then grouping info is included in each entry as additional name text
 * @param defaultChoice optional, provides an additionsl version choice entry and sets as the default
 * @returns Array of ui5 version choices and separators if applicable, grouped by maintenance state
 */
export function ui5VersionsGrouped(
    versions: UI5Version[],
    includeSeparators = false,
    defaultChoice?: UI5VersionChoice
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

    if (includeSeparators) {
        (maintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.maintained')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
        (notMaintChoices as (UI5VersionChoice | Separator)[]).unshift(
            new Separator(`${t('ui5VersionLabels.outOfMaintenance')} ${t('ui5VersionLabels.version', { count: 0 })}`)
        );
    }

    const versionChoices = [...maintChoices, ...notMaintChoices];
    if (defaultChoice) {
        versionChoices.unshift(defaultChoice);
    }
    return versionChoices;
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
export function withCondition(
    questions: UI5ApplicationQuestion[],
    condition: (answers: Answers) => boolean
): UI5ApplicationQuestion[] {
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

/**
 * Extends a validate function.
 *
 * @param question
 * @param validateFunc
 * @returns
 */
function extendValidate(
    question: Question,
    validateFunc: validate<UI5ApplicationAnswers>
): validate<UI5ApplicationAnswers> {
    const validate = question.validate;
    return (
        value: unknown,
        previousAnswers?: UI5ApplicationAnswers | undefined
    ): ReturnType<validate<UI5ApplicationAnswers>> => {
        const extVal = validateFunc(value, previousAnswers);
        if (extVal !== true) {
            return extVal;
        }
        return typeof validate === 'function' ? validate(value, previousAnswers) : true;
    };
}

/**
 * Extends an additionalMessages function.
 *
 * @param question
 * @param addMsgFunc
 * @returns
 */
function extendAdditionalMessages(
    question: UI5ApplicationQuestion,
    addMsgFunc: PromptSeverityMessage
): PromptSeverityMessage {
    const addMsgs = question.additionalMessages;
    return (value: unknown, previousAnswers?: UI5ApplicationAnswers | undefined): ReturnType<PromptSeverityMessage> => {
        const extMsg = addMsgFunc(value, previousAnswers);
        if (extMsg) {
            return extMsg; // Extended prompt message is returned first
        }
        // Defer to the original function if a valid message was not returned from the extended version
        return typeof addMsgs === 'function' ? addMsgs(value, previousAnswers) : undefined;
    };
}
/**
 * Apply the extended function to the existing question property function or add as new.
 *
 * @param question
 * @param promptOption
 * @param funcName
 * @returns
 */
function applyExtensionFunction(
    question: UI5ApplicationQuestion,
    promptOption: CommonPromptOptions,
    funcName: 'validate' | 'additionalMessages'
): UI5ApplicationQuestion {
    let extendedFunc;

    if (funcName === 'validate' && promptOption.validate) {
        extendedFunc = extendValidate(question, promptOption.validate!);
    }

    if (funcName === 'additionalMessages' && promptOption.additionalMessages) {
        extendedFunc = extendAdditionalMessages(question, promptOption.additionalMessages);
    }

    question = Object.assign(question, { [funcName]: extendedFunc });
    return question;
}
/**
 * Updates questions with extensions for specific properties. Only `validate`, `default` and `additionalMessages` are currently supported.
 *
 * @param questions - array of inquirer prompts
 * @param promptOptions
 * @returns - the extended questions
 */
export function extendWithOptions(
    questions: UI5ApplicationQuestion[],
    promptOptions: UI5ApplicationPromptOptions
): UI5ApplicationQuestion[] {
    questions.forEach((question) => {
        const promptOptKey = question.name as keyof typeof promptNames;
        const promptOpt = promptOptions[promptOptKey];
        if (promptOpt) {
            const propsToExtend = Object.keys(promptOpt);

            for (const extProp of propsToExtend) {
                if (extProp === 'validate' || extProp === 'additionalMessages') {
                    question = applyExtensionFunction(question, promptOpt as CommonPromptOptions, extProp);
                }
                // Provided defaults will override built in defaults
                const defaultOverride = (promptOptions[promptOptKey] as PromptDefaultValue<string | boolean>).default;
                if (defaultOverride) {
                    question.default = defaultOverride;
                }
            }
        }
    });
    return questions;
}
