import type { Answers } from 'inquirer';
import type { PromptQuestion, AnswerValue } from '../types';

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
        const questionsDependantNames = question?.dependantPromptNames ?? [];
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
    const dynamicQuestions = questions.filter(
        (question): question is Required<Pick<PromptQuestion, 'name'>> =>
            'selectType' in question && question.selectType === 'dynamic' && !!question.name
    );
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
    answers: Record<string, AnswerValue>,
    questions: PromptQuestion[],
    name: string,
    value?: AnswerValue
): Record<string, AnswerValue> {
    // ToDo - not fully sure about spread here
    let updatedAnswers = setAnswer({ ...answers }, name, value);
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
