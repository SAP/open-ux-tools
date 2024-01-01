import type { CheckboxQuestion, InputQuestion, ListQuestion } from 'inquirer';
import React from 'react';
import { Question } from '../Question/Question';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
}

export type IQuestion = (ListQuestion | InputQuestion | CheckboxQuestion) & AdditionalQuestionProperties;

export interface QuestionsProps {
    questions: Array<Question>;
    answers: Record<string, string | number>;
    onChoiceRequest: (name: string) => void;
    onChange: (name: string, answer: string | number | boolean | undefined, dependantPromptNames?: string[]) => void;
}

export const Questions = (props: QuestionsProps) => {
    const { questions, onChoiceRequest, onChange, answers } = props;
    return (
        <div>
            {questions.map((question: Question, index: number) => (
                <Question
                    key={`${question.name}-${index}`}
                    question={question}
                    answers={answers}
                    onChange={onChange}
                    onChoiceRequest={onChoiceRequest}
                />
            ))}
        </div>
    );
};
