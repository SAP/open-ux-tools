import React from 'react';
import type { InputQuestion, ListQuestion, CheckboxQuestion } from 'inquirer';
import { Input } from '../Input';
import { Checkbox } from '../Checkbox';
import { Select } from '../Select';

export type Question =
    | (ListQuestion | InputQuestion | CheckboxQuestion) & {
          selectType: 'static' | 'dynamic';
          dependantPromptNames?: string[];
      };

export interface QuestionsProps {
    questions: Array<Question>;
    answers: Record<string, string | number>;
    onChoiceRequest: (name: string) => void;
    onChange: (name: string, answer: string | number | undefined) => void;
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
                        questionInput = <Input value={value} {...question} />;
                        break;
                    }
                    case 'checkbox': {
                        questionInput = <Checkbox {...question} />;
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
