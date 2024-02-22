import React, { useEffect, useState } from 'react';
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
import { Choice } from '../Questions';

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
    choices?: Choice[];
}

export const Question = (props: QuestionProps) => {
    const { question, onChoiceRequest, onChange, answers, choices } = props;
    let questionInput: JSX.Element;
    const value = (question.name && answers?.[question.name]) ?? '';
    const [options, setOptions] = useState<UIComboBoxOption[]>([]);
    useEffect(() => {
        // For type safety
        if (!isInputType(question)) {
            const resolvedChoices = choices ?? question.choices;
            if (Array.isArray(resolvedChoices)) {
                setOptions(
                    resolvedChoices.map((choice) => {
                        const { name, value } = choice;
                        return {
                            key: value,
                            text: typeof name === 'string' ? name : ''
                        };
                    }) ?? []
                );
            } else {
                onChoiceRequest(question?.name ?? '');
            }
        }
    }, [question, choices]);

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
