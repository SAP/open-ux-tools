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

export function updateAnswer(
    answers: Record<string, AnswerValue>,
    questions: PromptQuestion[],
    name: string,
    value?: AnswerValue
): Record<string, AnswerValue> {
    const updatedAnswers = {
        ...answers,
        [name]: value
    };
    const dependantPromptNames = getDependantQuestions(questions, name);
    dependantPromptNames.forEach((dependantName) => {
        // ToDo '' => undefined?
        updatedAnswers[dependantName] = '';
    });
    return updatedAnswers;
}
