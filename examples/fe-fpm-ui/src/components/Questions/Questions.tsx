import React from 'react';
import type { InputQuestion, ListQuestion, CheckboxQuestion } from 'inquirer';
import { Input } from '../Input';
import { Checkbox } from '../Checkbox';
import { Select } from '../Select';

export type Question = ListQuestion | InputQuestion | CheckboxQuestion;

export interface QuestionsProps {
    questions: Array<Question>;
    onChoiceRequest: (name: string) => void;
    onChange: (answer: unknown, answers: unknown) => void;
}

export const Questions = (props: QuestionsProps) => {
    const { questions, onChoiceRequest } = props;
    return (
        <div>
            {questions.map((question: Question, index: number) => {
                let questionInput: JSX.Element;
                switch (question?.type) {
                    case 'input': {
                        questionInput = <Input {...question} />;
                        break;
                    }
                    case 'checkbox': {
                        questionInput = <Checkbox {...question} />;
                        break;
                    }
                    case 'list': {
                        questionInput = (
                            <Select
                                {...question}
                                onChoiceRequest={() => {
                                    if (question.name) {
                                        onChoiceRequest(question.name);
                                    }
                                }}
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
