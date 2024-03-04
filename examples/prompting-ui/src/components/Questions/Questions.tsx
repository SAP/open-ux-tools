import type { CheckboxQuestion, InputQuestion, ListQuestion } from 'inquirer';
import React, { useCallback, useEffect, useState } from 'react';
import { Question } from '../Question/Question';
import type { AnswerValue } from '../Question/Question';
import { getDependantQuestions, updateAnswer } from '../utils';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
}

export interface Choice {
    name: string;
    value: string;
}

export interface DynamicChoices {
    [key: string]: Choice[];
}

export const enum PromptsLayoutType {
    SingleColumn = 'SingleColumn',
    MultiColumn = 'MultiColumn'
}

export type IQuestion = (ListQuestion | InputQuestion | CheckboxQuestion) & AdditionalQuestionProperties;

export interface QuestionsProps {
    questions: Array<Question>;
    answers: Record<string, AnswerValue>;
    choices: DynamicChoices;
    onChoiceRequest: (names: string[], answers: Record<string, AnswerValue>) => void;
    onChange: (
        answers: Record<string, AnswerValue>,
        name: string,
        answer: AnswerValue,
        dependantPromptNames?: string[]
    ) => void;
    layoutType?: PromptsLayoutType;
}

export const Questions = (props: QuestionsProps) => {
    const { questions, onChoiceRequest, onChange, answers, choices, layoutType } = props;
    const [localAnswers, setLocalAnswers] = useState(answers);
    useEffect(() => {
        setLocalAnswers(answers);
    }, [answers]);
    const onAnswerChange = useCallback(
        (name: string, answer?: AnswerValue, _dependantPromptNames?: string[]) => {
            const updatedAnswers = updateAnswer(localAnswers, questions, name, answer);
            setLocalAnswers(updatedAnswers);
            // Callback with onchange
            onChange(updatedAnswers, name, answer);
            // Request dynamic choices for dependant questions
            const deps = getDependantQuestions(questions, name);
            if (deps.length) {
                onChoiceRequest(deps, updatedAnswers);
            }
        },
        [localAnswers, onChange]
    );
    return (
        <div>
            {/* ToDo remove */}
            <div>{layoutType}</div>
            {questions.map((question: Question, index: number) => {
                const externalChoices = question.name !== undefined ? choices[question.name] : undefined;
                return (
                    <Question
                        key={`${question.name}-${index}`}
                        question={question}
                        answers={localAnswers}
                        onChange={onAnswerChange}
                        choices={externalChoices}
                        onChoiceRequest={(name: string) => {
                            onChoiceRequest([name], localAnswers);
                        }}
                    />
                );
            })}
        </div>
    );
};
