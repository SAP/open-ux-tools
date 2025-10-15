import type { Answers, ChoiceOptions } from 'inquirer';
import type { PromptQuestion, AnswerValue, PromptListChoices } from '../types';
import type { UISelectableOption } from '@sap-ux/ui-components';

/**
 * Method finds dependant question names for passed question.
 * Method goes into recursion and finds dependant questions on deeper levels.
 *
 * @param questions - All questions
 * @param name - Question name for which dependant question names should be resolved
 * @param dependantPromptNames - Existing dependant names to update
 * @returns Found dependant question names for passed question.
 */
export function getDependantQuestions(
    questions: PromptQuestion[],
    name: string,
    dependantPromptNames: string[] = []
): string[] {
    const question = questions.find((checkQuestion) => checkQuestion.name === name);
    if (question?.type === 'list') {
        const questionsDependantNames = question?.guiOptions?.dependantPromptNames ?? [];
        questionsDependantNames.forEach((dependantName) => {
            dependantPromptNames.push(dependantName);
            getDependantQuestions(questions, dependantName, dependantPromptNames);
        });
    }
    return dependantPromptNames;
}

/**
 * Method finds all dynamic questions.
 *
 * @param questions - All questions
 * @returns Found dynamic questions.
 */
export function getDynamicQuestions(questions: PromptQuestion[]): string[] {
    const dynamicQuestions = questions.filter((question): question is Required<Pick<PromptQuestion, 'name'>> => {
        const { guiOptions = {} } = question;
        return 'selectType' in guiOptions && guiOptions.selectType === 'dynamic' && !!question.name;
    });
    return dynamicQuestions.map((question) => question.name);
}

/**
 * Method updates answer value and resets dependant questions answer.
 *
 * @param answers - Latest answers
 * @param questions - All questions
 * @param name - Answer to update
 * @param value - New value of answer
 * @returns New reference of updated answers.
 */
export function updateAnswers(
    answers: Answers,
    questions: PromptQuestion[],
    name: string,
    value?: AnswerValue
): Answers {
    let updatedAnswers = setAnswer(structuredClone(answers), name, value);
    const dependantPromptNames = getDependantQuestions(questions, name);
    dependantPromptNames?.length &&
        dependantPromptNames.forEach((dependantName) => {
            updatedAnswers = setAnswer(updatedAnswers, dependantName, undefined);
        });
    return updatedAnswers;
}

/**
 * Method updates single answer in answers object.
 *
 * @param answers - Answers to update
 * @param path - Path to answer
 * @param value - Value of answer
 * @returns Updated answers.
 */
export function setAnswer(answers: Answers, path: string, value: unknown): Answers {
    const keys = path.split('.');
    let current = answers;
    let validPath = true;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
            // Prototype-polluting assignment restriction
            validPath = false;
            break;
        }
        if (current && typeof current === 'object' && !(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }

    if (validPath) {
        const key = keys[keys.length - 1];
        if (!['__proto__', 'constructor', 'prototype'].includes(key)) {
            current[key] = value;
        }
    }
    return answers;
}

/**
 * Method gets answer value by passed path.
 *
 * @param answers - All answers
 * @param path - Path to answer
 * @returns Answer value.
 */
export function getAnswer(answers: Answers, path: string): unknown {
    const keys = path.split('.');
    let current = answers;

    for (const key of keys) {
        if (typeof current !== 'object' || !(key in current)) {
            return undefined;
        }
        current = current[key];
    }

    return current;
}

/**
 * Method convert choices(inquirer) to dropdown/combobox options(ui-components).
 *
 * @param choices - Array of choices
 * @returns Returns dropdown/combobox options.
 */
export function convertChoicesToOptions(choices: PromptListChoices): UISelectableOption<ChoiceOptions>[] {
    if (!choices.length) {
        return [];
    }
    const options: UISelectableOption<ChoiceOptions>[] = [];
    for (const choice of choices) {
        if (typeof choice === 'object' && 'value' in choice) {
            options.push({
                key: choice.value.toString(),
                text: choice.name ?? '',
                disabled: 'disabled' in choice ? Boolean(choice.disabled) : undefined,
                title: 'title' in choice ? String(choice.title) : '',
                data: choice
            });
        } else {
            const choiceText = choice.toString();
            options.push({
                key: choiceText,
                text: choiceText,
                data: { value: choice }
            });
        }
    }
    return options;
}

/**
 * Method deeply compares two answers objects.
 *
 * @param obj1 - First object with answers
 * @param obj2 - Second object with answers
 * @returns True if objects are same.
 */
export function isDeepEqual(obj1: Answers, obj2: Answers): boolean {
    // Check if both inputs are objects
    if (typeof obj1 === 'object' && obj1 !== null && typeof obj2 === 'object' && obj2 !== null) {
        // Check if both objects have the same number of properties
        if (Object.keys(obj1).length !== Object.keys(obj2).length) {
            return false;
        }
        // Recursively check each property
        for (const key in obj1) {
            if (!obj2.hasOwnProperty(key) || !isDeepEqual(obj1[key], obj2[key])) {
                return false;
            }
        }
        return true;
    } else {
        // For primitive values, use strict equality
        return obj1 === obj2;
    }
}
