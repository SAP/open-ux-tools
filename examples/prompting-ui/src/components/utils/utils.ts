import type { AnswerValue, InputQuestion, Question } from '../Question';

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

export function getDynamicQuestions(questions: Question[]): string[] {
    const dynamicQuestions = questions.filter(
        (question): question is Required<Pick<Question, 'name'>> =>
            'selectType' in question && question.selectType === 'dynamic' && !!question.name
    );
    return dynamicQuestions.map((question) => question.name);
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

export function isInputType(question: Question): question is InputQuestion {
    return question.type === 'input';
}
