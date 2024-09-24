import React, { useCallback } from 'react';
import type { Answers } from 'inquirer';
import { Question } from '../Question/Question';
import {
    formatDomId,
    getAnswer,
    getDependantQuestions,
    getDynamicQuestions,
    updateAnswers,
    useAnswers,
    useDynamicQuestionsEffect,
    useId,
    useRequestedChoices
} from '../../utilities';
import { QuestionGroup } from '../QuestionGroup';
import type { PromptQuestion, ValidationResults, PromptsGroup, AnswerValue, DynamicChoices } from '../../types';
import { PromptsLayoutType } from '../../types';

import './Questions.scss';
import { TranslationProvider } from '../../context/TranslationContext';
import type { TranslateEvent } from '../../context/TranslationContext';
import type { I18nBundle, TranslationEntry } from '@sap-ux/ui-components';

// ToDo - move to geneeric types ?
export interface TranslationProps<T extends TranslationEntry = TranslationEntry> {
    bundle: I18nBundle<T>;
    onEvent?: (question: string, event: TranslateEvent<T>) => void;
    /**
     * Array of pending question.
     */
    pendingQuestions?: string[];
}

export interface QuestionsProps<T extends TranslationEntry = TranslationEntry> {
    id?: string;
    questions: PromptQuestion[];
    answers?: Answers;
    choices?: DynamicChoices;
    validation?: ValidationResults;
    onChoiceRequest?: (names: string[], answers: Answers) => void;
    onChange?: (answers: Answers, name?: string, answer?: AnswerValue, dependantPromptNames?: string[]) => void;
    layoutType?: PromptsLayoutType;
    groups?: Array<PromptsGroup>;
    showDescriptions?: boolean;
    translationProps?: TranslationProps<T>;
}

/**
 * Method returns classes for question's component root DOM element.
 *
 * @param type - Layout type
 * @returns Class names for component's root DOM element.
 */
const getComponentClasses = (type?: PromptsLayoutType): string => {
    const classes = ['prompt-entries-wrapper'];
    classes.push(
        type === PromptsLayoutType.MultiColumn ? 'prompt-entries-wrapper-multi' : 'prompt-entries-wrapper-single'
    );
    return classes.join(' ');
};

export const Questions = (props: QuestionsProps) => {
    const {
        id,
        groups = [],
        questions,
        onChoiceRequest,
        onChange,
        answers = {},
        choices = {},
        layoutType,
        showDescriptions,
        validation = {},
        translationProps = { bundle: {} }
    } = props;
    const componentId = useId(id);
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
            const { guiOptions = {} } = question;
            if (guiOptions.groupId) {
                const foundGroup = groupsWithQuestions.find((g) => g.id === guiOptions.groupId);
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
            const id = formatDomId(`${componentId}--${question.name}`);
            return (
                <Question
                    id={id}
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
        <div id={componentId} className={getComponentClasses(layoutType)}>
            <TranslationProvider
                bundle={translationProps.bundle}
                onEvent={translationProps.onEvent}
                pendingQuestions={translationProps.pendingQuestions}>
                <div className="prompt-entries">
                    {layoutType === PromptsLayoutType.MultiColumn && groups?.length
                        ? groupsWithQuestions.map((group) => {
                              return (
                                  <QuestionGroup
                                      id={`${componentId}--${group.id}`}
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
            </TranslationProvider>
        </div>
    );
};
