import type { Question } from 'inquirer';
import type {
    CommonPromptOptions,
    promptNames,
    UI5LibraryReferenceAnswers,
    UI5LibraryReferencePromptOptions,
    UI5LibraryReferenceQuestion
} from '../types';
import { extendAdditionalMessages, type validate, type YUIQuestion } from '@sap-ux/inquirer-common';

/**
 * Will remove prompts from the specified prompts based on prompt options
 * Removing prompts is preferable to using `when()` to prevent continuous re-evaluation.
 *
 * @param prompts Keyed prompts object containing all possible prompts
 * @param promptOptions prompt options
 * @returns the updated questions
 */
export function hidePrompts(
    prompts: Record<promptNames, UI5LibraryReferenceQuestion>,
    promptOptions?: UI5LibraryReferencePromptOptions
): UI5LibraryReferenceQuestion[] {
    const questions: UI5LibraryReferenceQuestion[] = [];
    if (promptOptions) {
        Object.keys(prompts).forEach((key) => {
            const promptKey = key as keyof typeof promptNames;
            if (!promptOptions?.[promptKey]?.hide) {
                questions.push(prompts[promptKey]);
            }
        });
    } else {
        questions.push(...Object.values(prompts));
    }
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
    validateFunc: validate<UI5LibraryReferenceAnswers>
): validate<UI5LibraryReferenceAnswers> {
    const validate = question.validate;
    return (
        value: unknown,
        previousAnswers?: UI5LibraryReferenceAnswers | undefined
    ): ReturnType<validate<UI5LibraryReferenceAnswers>> => {
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
    questions: UI5LibraryReferenceQuestion[],
    promptOptions: UI5LibraryReferencePromptOptions
): UI5LibraryReferenceQuestion[] {
    questions.forEach((question) => {
        const promptOptKey = question.name as keyof typeof promptNames;
        const promptOpt = promptOptions[promptOptKey];
        if (promptOpt) {
            const propsToExtend = Object.keys(promptOpt);

            for (const extProp of propsToExtend) {
                if (extProp === 'validate' || extProp === 'additionalMessages') {
                    question = applyExtensionFunction(question, promptOpt, extProp);
                }
            }
        }
    });
    return questions;
}
