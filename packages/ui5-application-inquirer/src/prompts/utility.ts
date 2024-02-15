import type { PromptSeverityMessage, YUIQuestion, validate } from '@sap-ux/inquirer-common';
import { existsSync } from 'fs';
import type { Answers, Question } from 'inquirer';
import { join } from 'path';
import { coerce, gte } from 'semver';
import { defaultProjectNumber, t } from '../i18n';
import type {
    CommonPromptOptions,
    PromptDefaultValue,
    UI5ApplicationAnswers,
    UI5ApplicationPromptOptions,
    promptNames
} from '../types';

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
export function withCondition(questions: YUIQuestion[], condition: (answers: Answers) => boolean): YUIQuestion[] {
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
function extendAdditionalMessages(question: YUIQuestion, addMsgFunc: PromptSeverityMessage): PromptSeverityMessage {
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
    question: YUIQuestion,
    promptOption: CommonPromptOptions,
    funcName: 'validate' | 'additionalMessages'
): YUIQuestion {
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
export function extendWithOptions(questions: YUIQuestion[], promptOptions: UI5ApplicationPromptOptions): YUIQuestion[] {
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
