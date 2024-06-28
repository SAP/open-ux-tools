import { Answers } from 'inquirer';
import type { PromptQuestion, AnswerValue } from '../types';

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

export function getDynamicQuestions(questions: PromptQuestion[]): string[] {
    const dynamicQuestions = questions.filter(
        (question): question is Required<Pick<PromptQuestion, 'name'>> =>
            'selectType' in question && question.selectType === 'dynamic' && !!question.name
    );
    return dynamicQuestions.map((question) => question.name);
}

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

export function setAnswer(answers: Answers, path: string, value: unknown): Answers {
    const keys = path.split('.');
    let current = answers;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
            // Prototype-polluting assignment restriction
            return answers;
        }
        if (current && typeof current === 'object' && !(key in current)) {
            current[key] = {};
        }
        current = current[key];
    }

    const key = keys[keys.length - 1];
    if (!['__proto__', 'constructor', 'prototype'].includes(key)) {
        current[key] = value;
    }
    return answers;
}

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
