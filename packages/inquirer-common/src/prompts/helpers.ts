import type { Answers, Question, Validator } from 'inquirer';
import type { CommonPromptOptions, PromptDefaultValue, PromptSeverityMessage, YUIQuestion } from '../types';

/**
 * Extends an additionalMessages function.
 *
 * @param question - the question to which the validate function will be applied
 * @param addMsgFunc - the additional messages function which will be applied to the question
 * @returns the extended additional messages function
 */
export function extendAdditionalMessages(
    question: YUIQuestion,
    addMsgFunc: PromptSeverityMessage
): PromptSeverityMessage {
    const addMsgs = question.additionalMessages;
    return (value: unknown, previousAnswers?: Answers | undefined): ReturnType<PromptSeverityMessage> => {
        const extMsg = addMsgFunc(value, previousAnswers);
        if (extMsg) {
            return extMsg; // Extended prompt message is returned first
        }
        // Defer to the original function if a valid message was not returned from the extended version
        return typeof addMsgs === 'function' ? addMsgs(value, previousAnswers) : undefined;
    };
}

/**
 * Extends a validate function. The extended function will be called first.
 *
 * @param question - the question to which the validate function will be applied
 * @param validateFunc - the validate function which will be applied to the question
 * @returns the extended validate function
 */
export function extendValidate<T extends Answers = Answers>(
    question: Question,
    validateFunc: NonNullable<Validator<T>>
): NonNullable<Validator<T>> {
    const validate: Validator<T> = question.validate;
    return (value: unknown, previousAnswers?: T): ReturnType<NonNullable<Validator<T>>> => {
        // Cant use ReturnType<Validator<T>>
        const extVal = validateFunc?.(value, previousAnswers);
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
export function applyExtensionFunction<T extends Answers = Answers>(
    question: YUIQuestion,
    promptOption: CommonPromptOptions<T>,
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
 * Updates questions with extensions for specific properties. Only `validate`, `default` and `additionalMessages` are currently supported.
 *
 * @param questions - array of prompts to be extended
 * @param promptOptions - the prompt options possibly containing function extensions
 * @returns - the extended questions
 */
export function extendWithOptions<T extends YUIQuestion = YUIQuestion>(
    questions: T[],
    promptOptions: Record<string, CommonPromptOptions & PromptDefaultValue<string | boolean>>
): YUIQuestion[] {
    questions.forEach((question: YUIQuestion) => {
        const promptOptKey = question.name;
        const promptOpt = promptOptions[question.name];
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
