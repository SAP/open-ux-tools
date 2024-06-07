import React from 'react';
import type {
    InputQuestion as _InputQuestion,
    ListQuestion as _ListQuestion,
    CheckboxQuestion as _CheckboxQuestion
} from 'inquirer';
import { Input, Select, MultiSelect } from '../Inputs';
import type { AdditionalQuestionProperties, Choice } from '../Questions';
import { ValidationResults } from '@sap-ux/fe-fpm-writer';
import { useOptions } from '../../utilities';
import './Question.scss';

export type ListQuestion = _ListQuestion & AdditionalQuestionProperties;
export type InputQuestion = _InputQuestion;
export type MultiSelectQuestion = _CheckboxQuestion & AdditionalQuestionProperties;
export type Question = ListQuestion | InputQuestion | MultiSelectQuestion;
export interface PromptsGroup {
    id: string;
    title: string;
    description: string[];
}
export type AnswerValue = string | number | boolean | undefined;

export interface QuestionProps {
    question: Question;
    answers: Record<string, AnswerValue>;
    onChange: (name: string, answer: AnswerValue, dependantPromptNames?: string[]) => void;
    isLoading?: boolean;
    choices?: Choice[];
    pending?: boolean;
    additionalInfo?: string;
    validation: ValidationResults;
    placeholder?: string;
}

export const Question = (props: QuestionProps) => {
    const { question, onChange, answers, choices, pending, additionalInfo, validation = {}, placeholder } = props;
    let questionInput: JSX.Element;
    let value: AnswerValue = '';
    let errorMessage = '';
    if (question.name && answers?.[question.name] !== undefined) {
        value = answers?.[question.name];
    } else if (question.default !== undefined) {
        value = question.default;
    }
    if (question.name && validation[question.name]?.isValid === false && validation[question.name]?.errorMessage) {
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
