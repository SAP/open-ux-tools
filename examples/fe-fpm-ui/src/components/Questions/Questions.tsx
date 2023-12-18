import React from 'react';
import type { InputQuestion, ListQuestion, CheckboxQuestion } from 'inquirer';
import { Input } from '../Input';
import { Checkbox } from '../Checkbox';
import { Select } from '../Select';

export type Question = ListQuestion | InputQuestion | CheckboxQuestion;

export interface QuestionsProps {
    questions: Array<Question>;
}

export const Questions = (props: QuestionsProps) => {
    const { questions } = props;
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
                        questionInput = <Select {...question} />;
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
