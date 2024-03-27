import type { Answers, CheckboxQuestion, InputQuestion, ListQuestion } from 'inquirer';
import React, { useCallback, useEffect, useState } from 'react';
import { Question } from '../Question/Question';
import type { AnswerValue, PromptsGroup } from '../Question/Question';
import { getDependantQuestions, getDynamicQuestions, updateAnswer } from '../../utilities';
import './Questions.scss';
import { useRequestedChoices } from '../../utilities';
import { QuestionGroup } from '../QuestionGroup';

export interface AdditionalQuestionProperties {
    selectType: 'static' | 'dynamic';
    dependantPromptNames?: string[];
    required?: boolean;
    groupId?: string;
    additionalInfo?: string;
    placeholder?: string;
}

export interface Choice {
    name: string;
    value: string | number | boolean;
}

export interface DynamicChoices {
    [key: string]: Choice[];
}

export const enum PromptsLayoutType {
    SingleColumn = 'SingleColumn',
    MultiColumn = 'MultiColumn'
}

export type IQuestion = (ListQuestion | InputQuestion | CheckboxQuestion) & AdditionalQuestionProperties;

export type ValidationResults = { [questionName: string]: { isValid: boolean; errorMessage?: string } };

export interface QuestionsProps {
    questions: Array<IQuestion>;
    answers: Record<string, AnswerValue>;
    choices: DynamicChoices;
    validation: ValidationResults;
    onChoiceRequest: (names: string[], answers: Record<string, AnswerValue>) => void;
    onChange: (
        answers: Record<string, AnswerValue>,
        name: string,
        answer: AnswerValue,
        dependantPromptNames?: string[]
    ) => void;
    layoutType?: PromptsLayoutType;
    groups?: Array<PromptsGroup>;
    showDescriptions?: boolean;
}

export const Questions = (props: QuestionsProps) => {
    const {
        groups = [],
        questions,
        onChoiceRequest,
        onChange,
        answers,
        choices,
        layoutType,
        showDescriptions,
        validation = {}
    } = props;
    const [localAnswers, setLocalAnswers] = useState({ ...answers });
    const [pendingRequests, setRequestedChoices] = useRequestedChoices({}, choices);
    const requestChoices = useCallback(
        (names: string[], answers: Record<string, AnswerValue>) => {
            // Call external callback
            if (names.length) {
                onChoiceRequest(names, answers);
            }
            // Mark pending requests locally
            setRequestedChoices(names);
        },
        [onChoiceRequest]
    );
    // Store local answers
    useEffect(() => {
        setLocalAnswers({ ...answers });
    }, [answers]);
    // Request dynamic choices
    useEffect(() => {
        const dynamicChoices = getDynamicQuestions(questions);
        requestChoices(dynamicChoices, localAnswers);
    }, [questions]);
    // Change callback
    const onAnswerChange = useCallback(
        (name: string, answer?: AnswerValue, _dependantPromptNames?: string[]) => {
            if ((localAnswers[name] || '') !== answer) {
                const updatedAnswers = updateAnswer(localAnswers, questions, name, answer);
                setLocalAnswers(updatedAnswers);
                // Callback with onchange
                onChange(updatedAnswers, name, answer);
                // Request dynamic choices for dependant questions
                const deps = getDependantQuestions(questions, name);
                deps.length && requestChoices(deps, updatedAnswers);
            }
        },
        [localAnswers, onChange]
    );
    const groupsWithQuestions: (PromptsGroup & { questions: Question[] })[] = groups.map((group) => ({
        ...group,
        questions: []
    }));
    if (layoutType === PromptsLayoutType.MultiColumn && groups?.length) {
        questions.forEach((question) => {
            if (question.groupId) {
                const foundGroup = groupsWithQuestions.find((g) => g.id === question.groupId);
                if (foundGroup) {
                    foundGroup.questions.push(question);
                    groupsWithQuestions[groupsWithQuestions.indexOf(foundGroup)] = foundGroup;
                }
            }
        });
    }

    const renderQuestions = (questions: Question[]) =>
        questions.map((question: Question, index: number) => {
            const name = question.name;
            const externalChoices = name !== undefined ? choices[name] : undefined;
            if (!name) {
                return <></>;
            }
            return (
                <Question
                    key={`${question.name}-${index}`}
                    question={question}
                    validation={validation}
                    answers={localAnswers}
                    onChange={onAnswerChange}
                    choices={externalChoices}
                    pending={pendingRequests[name]}
                    additionalInfo={(question as IQuestion).additionalInfo}
                    placeholder={(question as IQuestion).placeholder}
                />
            );
        });

    return (
        <div
            className={
                layoutType === PromptsLayoutType.MultiColumn
                    ? 'prompt-entries-wrapper-multi'
                    : 'prompt-entries-wrapper-single'
            }>
            <div className="prompt-entries">
                {layoutType === PromptsLayoutType.MultiColumn && groups?.length
                    ? groupsWithQuestions.map((group) => {
                          return (
                              <QuestionGroup
                                  key={group.id}
                                  title={group.title}
                                  description={group.description}
                                  showDescription={showDescriptions}>
                                  {renderQuestions(group.questions)}
                              </QuestionGroup>
                          );
                      })
                    : renderQuestions(questions)}
            </div>
        </div>
    );
};
