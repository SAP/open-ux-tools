import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Answers } from 'inquirer';
import { Question } from '../Question/Question';
import {
    getAnswer,
    getDependantQuestions,
    getDynamicQuestions,
    isDeepEqual,
    setAnswer,
    updateAnswers,
    useAnswers,
    useDynamicQuestionsEffect,
    useRequestedChoices
} from '../../utilities';
import { QuestionGroup } from '../QuestionGroup';
import type { PromptQuestion, ValidationResults, PromptsGroup, AnswerValue, DynamicChoices } from '../../types';
import { PromptsLayoutType } from '../../types';

import './Questions.scss';

export interface QuestionsProps {
    questions: PromptQuestion[];
    answers?: Answers;
    choices?: DynamicChoices;
    validation?: ValidationResults;
    onChoiceRequest?: (names: string[], answers: Answers) => void;
    onChange?: (answers: Answers, name?: string, answer?: AnswerValue, dependantPromptNames?: string[]) => void;
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
        answers = {},
        choices = {},
        layoutType,
        showDescriptions,
        validation = {}
    } = props;
    const [localAnswers, setLocalAnswers] = useAnswers(questions, answers, (answers: Answers) => {
        onChange?.(answers);
    });
    const [pendingRequests, setRequestedChoices] = useRequestedChoices({}, choices);
    const requestChoices = useCallback(
        (names: string[], answers: Answers) => {
            // Call external callback
            if (names.length) {
                onChoiceRequest?.(names, answers);
            }
            // Mark pending requests locally
            setRequestedChoices(names);
        },
        [onChoiceRequest]
    );
    // Request dynamic choices
    useDynamicQuestionsEffect(() => {
        const dynamicChoices = getDynamicQuestions(questions);
        requestChoices(dynamicChoices, localAnswers);
    }, questions);
    // Change callback
    const onAnswerChange = useCallback(
        (name: string, answer?: AnswerValue) => {
            const oldAnswer = getAnswer(localAnswers, name) || '';
            if (oldAnswer !== answer) {
                const updatedAnswers = updateAnswers(localAnswers, questions, name, answer);
                setLocalAnswers(updatedAnswers);
                // Callback with onchange
                onChange?.(updatedAnswers, name, answer);
                // Request dynamic choices for dependant questions
                const deps = getDependantQuestions(questions, name);
                if (deps.length) {
                    requestChoices(deps, updatedAnswers);
                }
            }
        },
        [localAnswers, onChange]
    );
    const groupsWithQuestions: (PromptsGroup & { questions: PromptQuestion[] })[] = groups.map((group) => ({
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

    const renderQuestions = (questions: PromptQuestion[]) =>
        questions.map((question: PromptQuestion, index: number) => {
            const name = question.name;
            const externalChoices = choices[name];
            return (
                <Question
                    key={`${name}-${index}`}
                    question={question}
                    validation={validation}
                    answers={localAnswers}
                    onChange={onAnswerChange}
                    choices={externalChoices}
                    pending={pendingRequests[name]}
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
