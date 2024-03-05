import React from 'react';
import type {
    InputQuestion as _InputQuestion,
    ListQuestion as _ListQuestion,
    CheckboxQuestion as _CheckboxQuestion
} from 'inquirer';
import { Input } from '../Input';
// import { Checkbox } from '../Checkbox';
import { Select } from '../Select';
import { MultiSelect } from '../MultiSelect';
import type { Choice } from '../Questions';
import { useOptions } from '../utils';
import './Question.scss';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
}

export type ListQuestion = _ListQuestion & AdditionalQuestionProperties;
export type InputQuestion = _InputQuestion;
export type MultiSelectQuestion = _CheckboxQuestion & AdditionalQuestionProperties;
export type Question = ListQuestion | InputQuestion | MultiSelectQuestion;
export type AnswerValue = string | number | boolean | undefined;

export interface QuestionProps {
    question: Question;
    answers: Record<string, AnswerValue>;
    onChange: (name: string, answer: AnswerValue, dependantPromptNames?: string[]) => void;
    isLoading?: boolean;
    choices?: Choice[];
    pending?: boolean;
}

export const Question = (props: QuestionProps) => {
    const { question, onChange, answers, choices, pending } = props;
    let questionInput: JSX.Element;
    const value = (question.name && answers?.[question.name]) ?? '';
    // ToDo -> move to MultiSelect and Select?
    const options = useOptions(question, choices);

    switch (question?.type) {
        case 'input': {
            questionInput = <Input value={value} {...question} onChange={onChange} />;
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
