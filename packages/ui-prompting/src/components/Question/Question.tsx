import React from 'react';
import { Input, Select, MultiSelect } from '../Inputs';
import { getAnswer, useOptions } from '../../utilities';
import type {
    PromptQuestion,
    ValidationResults,
    AnswerValue,
    PromptListChoices,
    ListPromptQuestionCreationProps
} from '../../types';

import './Question.scss';

export interface QuestionProps {
    question: PromptQuestion;
    answers: Record<string, AnswerValue>;
    onChange: (name: string, answer: AnswerValue) => void;
    choices?: PromptListChoices;
    pending?: boolean;
    additionalInfo?: string;
    validation: ValidationResults;
    placeholder?: string;
    creation?: ListPromptQuestionCreationProps;
}

export const Question = (props: QuestionProps) => {
    const { question, onChange, answers, choices, pending, additionalInfo, validation = {}, placeholder } = props;
    let questionInput: JSX.Element;
    let errorMessage = '';
    let value: AnswerValue = getAnswer(answers, question.name) as AnswerValue;
    if (value === undefined && question.default !== undefined) {
        value = question.default;
    }
    if (validation[question.name]?.isValid === false && validation[question.name]?.errorMessage) {
        errorMessage = validation[question.name].errorMessage!;
    }
    // ToDo -> move to MultiSelect and Select?
    const options = useOptions(question, choices);
    switch (question?.type) {
        case 'input': {
            questionInput = (
                <Input
                    value={value}
                    {...question}
                    onChange={onChange}
                    additionalInfo={additionalInfo}
                    errorMessage={errorMessage}
                    placeholder={placeholder}
                />
            );
            break;
        }
        case 'checkbox': {
            questionInput = (
                <MultiSelect
                    // change to pass the relevant answer
                    value={value}
                    {...question}
                    onChange={onChange}
                    options={options}
                    additionalInfo={additionalInfo}
                    errorMessage={errorMessage}
                    placeholder={placeholder}
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
                    onChange={onChange}
                    options={options}
                    pending={pending}
                    additionalInfo={additionalInfo}
                    errorMessage={errorMessage}
                    placeholder={placeholder}
                    creation={props.creation}
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
