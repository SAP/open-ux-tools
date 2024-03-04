import type { AnswerValue, Question } from '../Question';

export function getDependantQuestions(
    questions: Question[],
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

export function updateAnswer(
    answers: Record<string, AnswerValue>,
    questions: Question[],
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
