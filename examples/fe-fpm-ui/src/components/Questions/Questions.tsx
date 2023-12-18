import React from 'react';
import type { InputQuestion, ListQuestion, CheckboxQuestion } from 'inquirer';
import { Input } from '../Input';

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
                        questionInput = <Input />;
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
