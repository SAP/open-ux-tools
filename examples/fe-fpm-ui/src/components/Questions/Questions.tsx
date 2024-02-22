import type { CheckboxQuestion, InputQuestion, ListQuestion } from 'inquirer';
import React from 'react';
import { Question } from '../Question/Question';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
}

export interface Choice {
    name: string;
    value: string;
}

export interface DynamicChoices {
    [key: string]: Choice[];
}

export type IQuestion = (ListQuestion | InputQuestion | CheckboxQuestion) & AdditionalQuestionProperties;

export interface QuestionsProps {
    questions: Array<Question>;
    answers: Record<string, string | number>;
    choices: DynamicChoices;
    onChoiceRequest: (name: string) => void;
    onChange: (name: string, answer: string | number | boolean | undefined, dependantPromptNames?: string[]) => void;
}

export const Questions = (props: QuestionsProps) => {
    const { questions, onChoiceRequest, onChange, answers, choices } = props;
    return (
        <div>
            {questions.map((question: Question, index: number) => {
                const externalChoices = question.name !== undefined ? choices[question.name] : undefined;
                return (
                    <Question
                        key={`${question.name}-${index}`}
                        question={question}
                        answers={answers}
                        onChange={onChange}
                        choices={externalChoices}
                        onChoiceRequest={(name: string) => {
                            console.log(`REQUEST -> ${name}`);
                            onChoiceRequest(name);
                        }}
                    />
                );
            })}
        </div>
    );
};
