import type { YUIQuestion, validate } from '@sap-ux/inquirer-common';
import { extendAdditionalMessages } from '@sap-ux/inquirer-common';
import { existsSync } from 'fs';
import type { Answers, Question } from 'inquirer';
import { join } from 'path';
import { coerce, gte } from 'semver';
import { defaultProjectNumber, t } from '../i18n';
import {
    promptNames,
    type CommonPromptOptions,
    type PromptDefaultValue,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions,
    type UI5ApplicationQuestion
} from '../types';
import { latestVersionString } from '@sap-ux/ui5-info';

/**
 * Tests if a directory with the specified `appName` exists at the path specified by `targetPath`.
 *
 * @param appName directory name of application
 * @param targetPath directory path where application directory would be created
 * @returns true, if the combined path exists otherwise false
 */
export function appPathExists(appName: string, targetPath?: string): boolean | string {
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
    while (exports.appPathExists(`${defaultName}`, targetPath)) {
        defaultName = t('prompts.appNameDefault', { defaultProjectNumber: ++defProjNum });
        // Dont loop forever, user will need to provide input otherwise
        if (defProjNum > 999) {
            break;
        }
    }
    return defaultName;
}

/**
 * Checks if the specified semantic version string is greater than or equal to the minimum version.
 * If the specified version is not a parsable semantic version, returns true.
 *
 * @param version the version to test
 * @param minVersion the minimum version to test against
 * @returns - true if the specified version is greater than or equal to the minimum version, or the version is not a coercible semver
 */
export function isVersionIncluded(version: string, minVersion: string): boolean {
    // Extract a usable version, `snapshot`, `latest` etc will be ignored
    const ui5SemVer = coerce(version);
    if (ui5SemVer) {
        return gte(ui5SemVer, minVersion);
    }
    return version === latestVersionString;
}

/**
 * Adds additional conditions to the provided questions.
 *
 * @param questions the questions to which the condition will be added
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
                const whenValue = question.when as boolean;
                question.when = (answers: Answers): boolean => {
                    return condition(answers) && whenValue;
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
 * @param question - the question to which the validate function will be applied
 * @param validateFunc - the validate function which will be applied to the question
 * @returns the extended validate function
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
 * Extend the existing prompt property function with the one specified in prompt options or add as new.
 *
 * @param question - the question to which the extending function will be applied
 * @param promptOption - prompt options, containing extending functions
 * @param funcName - the question property (function) name to extend
 * @returns the extended question
 */
function applyExtensionFunction(
    question: YUIQuestion,
    promptOption: CommonPromptOptions,
    funcName: 'validate' | 'additionalMessages'
): YUIQuestion {
    let extendedFunc;

    if (funcName === 'validate' && promptOption.validate) {
        extendedFunc = extendValidate(question, promptOption.validate);
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
 * @param questions - array of prompts to be extended
 * @param promptOptions - the prompt options possibly containing function extensions
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

/**
 * Will remove prompts from the specified prompts based on prompt options
 * and applicability in the case of CAP projects. Removing prompts is preferable to using `when()`
 * conditions when prompts are used in a UI to prevent continuous re-evaluation.
 *
 * @param prompts Keyed prompts object containing all possible prompts
 * @param promptOptions prompt options
 * @param isCapProject if we are generating into a CAP project certain prompts may be removed
 * @returns the updated questions
 */
export function hidePrompts(
    prompts: Record<promptNames, UI5ApplicationQuestion>,
    promptOptions?: UI5ApplicationPromptOptions,
    isCapProject?: boolean
): UI5ApplicationQuestion[] {
    const questions: UI5ApplicationQuestion[] = [];
    if (promptOptions ?? isCapProject) {
        Object.keys(prompts).forEach((key) => {
            const promptKey = key as keyof typeof promptNames;
            if (
                !promptOptions?.[promptKey]?.hide &&
                // Target directory is determined by the CAP project. `enableEsLint` and `targetFolder` are not available for CAP projects
                !([promptNames.targetFolder, promptNames.enableEslint].includes(promptNames[promptKey]) && isCapProject)
            ) {
                questions.push(prompts[promptKey]);
            }
        });
    } else {
        questions.push(...Object.values(prompts));
    }
    return questions;
}
