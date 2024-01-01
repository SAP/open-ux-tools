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
import type { UIComboBoxOption } from '@sap-ux/ui-components';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
}

export type ListQuestion = _ListQuestion & AdditionalQuestionProperties;
export type InputQuestion = _InputQuestion;
export type MultiSelectQuestion = _CheckboxQuestion & AdditionalQuestionProperties;

export type Question = ListQuestion | InputQuestion | MultiSelectQuestion;

const isInputType = (question: Question): question is InputQuestion => {
    return question.type === 'input';
};

export interface QuestionProps {
    question: Question;
    answers: Record<string, string | number>;
    onChoiceRequest: (name: string) => void;
    onChange: (name: string, answer: string | number | boolean | undefined, dependantPromptNames?: string[]) => void;
}

export const Question = (props: QuestionProps) => {
    const { question, onChoiceRequest, onChange, answers } = props;
    let questionInput: JSX.Element;
    const value = (question.name && answers?.[question.name]) ?? '';
    let options: UIComboBoxOption[] = [];
    // For type safety
    if (!isInputType(question)) {
        if (Array.isArray(question.choices)) {
            options =
                question.choices?.map((choice) => {
                    const { name, value } = choice;
                    return {
                        key: value,
                        text: typeof name === 'string' ? name : ''
                    };
                }) ?? [];
        } else {
            onChoiceRequest(question?.name ?? '');
        }
    }

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
                />
            );
            break;
        }
        default: {
            questionInput = <div>Unsupported</div>;
            break;
        }
    }
    return <div>{questionInput}</div>;
};
