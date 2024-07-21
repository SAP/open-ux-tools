import React from 'react';
import { Input, Select, MultiSelect } from '../Inputs';
import { getAnswer } from '../../utilities';
import type { PromptQuestion, ValidationResults, AnswerValue, PromptListChoices } from '../../types';

import './Question.scss';

export interface QuestionProps {
    question: PromptQuestion;
    answers: Record<string, AnswerValue>;
    onChange: (name: string, answer: AnswerValue) => void;
    choices?: PromptListChoices;
    pending?: boolean;
    validation: ValidationResults;
}

export const Question = (props: QuestionProps) => {
    const { question, onChange, answers, choices, pending, validation = {} } = props;
    let questionInput: JSX.Element;
    let errorMessage = '';
    let value: AnswerValue = getAnswer(answers, question.name) as AnswerValue;
    if (value === undefined && question.default !== undefined) {
        value = question.default;
    }
    if (validation[question.name]?.isValid === false && validation[question.name]?.errorMessage) {
        errorMessage = validation[question.name].errorMessage!;
    }
    switch (question?.type) {
        case 'input': {
            questionInput = <Input value={value} {...question} onChange={onChange} errorMessage={errorMessage} />;
            break;
        }
        case 'checkbox': {
            questionInput = (
                <MultiSelect
                    // change to pass the relevant answer
                    value={value}
                    {...question}
                    dynamicChoices={choices}
                    onChange={onChange}
                    errorMessage={errorMessage}
                />
            );
            break;
        }
        case 'list': {
            questionInput = (
                <Select
                    // change to pass the relevant answer
                    value={value}
                    {...question}
                    dynamicChoices={choices}
                    onChange={onChange}
                    pending={pending}
                    errorMessage={errorMessage}
                />
            );
            break;
        }
        default: {
            questionInput = <div>Unsupported</div>;
            break;
        }
    }
    return <div className="prompt-entry">{questionInput}</div>;
};
