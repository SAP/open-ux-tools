import type { Answers, Question, Validator } from 'inquirer';
import type { PromptSeverityMessage, YUIQuestion, validate } from '../types';

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

// TODO: Move to inquirer-common and add generic type support
/**
 * Extends a validate function.
 *
 * @param question - the question to which the validate function will be applied
 * @param validateFunc - the validate function which will be applied to the question
 * @returns the extended validate function
 */
export function extendValidate(question: Question, validateFunc: Validator<Answers>): Validator<Answers> {
    const validate = question.validate;
    return (value: unknown, previousAnswers?: Answers | undefined): ReturnType<validate<Answers>> => {
        const extVal = validateFunc?.(value, previousAnswers);
        if (extVal !== true) {
            return !!extVal;
        }
        return typeof validate === 'function' ? validate(value, previousAnswers) : true;
    };
}
