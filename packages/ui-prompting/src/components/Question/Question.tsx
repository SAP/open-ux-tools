import React from 'react';
import type { Answers } from 'inquirer';
import { Input, Select, MultiSelect } from '../Inputs';
import { getAnswer } from '../../utilities';
import type { PromptQuestion, ValidationResults, AnswerValue, PromptListChoices } from '../../types';

import './Question.scss';

export interface QuestionProps {
    id?: string;
    question: PromptQuestion;
    answers: Answers;
    onChange: (name: string, answer: AnswerValue) => void;
    choices?: PromptListChoices;
    pending?: boolean;
    validation: ValidationResults;
}

export const Question = (props: QuestionProps) => {
    const { question, onChange, answers, choices, pending, validation = {}, id } = props;
    let questionInput: JSX.Element;
    let errorMessage = '';
    const value: AnswerValue = getAnswer(answers, question.name) as AnswerValue;
    if (validation[question.name]?.isValid === false && validation[question.name]?.errorMessage) {
        errorMessage = validation[question.name].errorMessage!;
    }
    const inputId = id ? `${id}--input` : undefined;
    switch (question?.type) {
        case 'input': {
            questionInput = (
                <Input value={value} {...question} onChange={onChange} errorMessage={errorMessage} id={inputId} />
            );
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
                    id={inputId}
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
                    id={inputId}
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
