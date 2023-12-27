import React from 'react';
import type { InputQuestion, ListQuestion, CheckboxQuestion } from 'inquirer';
import { Input } from '../Input';
import { Checkbox } from '../Checkbox';
import { Select } from '../Select';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
}

export type Question = (ListQuestion | InputQuestion | CheckboxQuestion) & AdditionalQuestionProperties;

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
            {questions.map((question: Question, index: number) => {
                let questionInput: JSX.Element;
                const value = (question.name && answers?.[question.name]) ?? '';
                switch (question?.type) {
                    case 'input': {
                        questionInput = <Input value={value} {...question} onChange={onChange} />;
                        break;
                    }
                    case 'checkbox': {
                        questionInput = <Checkbox {...question} onChange={onChange} />;
                        break;
                    }
                    case 'list': {
                        questionInput = (
                            <Select
                                // change to pass the relevant answer
                                value={value}
                                {...question}
                                onChoiceRequest={onChoiceRequest}
                                onChange={onChange}
                            />
                        );
                        break;
                    }
                    default: {
                        questionInput = <div>Unsupported</div>;
                        break;
                    }
                }
                return <div key={`question-${index}`}>{questionInput}</div>;
            })}
        </div>
    );
};
