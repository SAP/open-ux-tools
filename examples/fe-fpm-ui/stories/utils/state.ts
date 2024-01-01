import React, { useReducer } from 'react';
import { SupportedBuildingBlocks } from './types';
import { IQuestion } from '../../src/components';
import { getChoices } from './communication';
import { Answers } from 'inquirer';

interface State {
    questions: IQuestion[];
    answers: Answers;
}

export enum ActionType {
    UPDATE_QUESTIONS = 'UPDATE_QUESTIONS',
    UPDATE_ANSWERS = 'UPDATE_ANSWERS',
    UPDATE_CHOICES = 'UPDATE_CHOICES',
    REFRESH_CHOICES = 'REFRESH_CHOICES',
    RESET_ANSWERS = 'RESET_ANSWERS'
}

type Actions = RefreshChoices | UpdateAnswers | UpdateQuestions | UpdateChoices | ResetAnswers;

function reducer(state: State, action: Actions): State {
    switch (action.type) {
        case ActionType.UPDATE_QUESTIONS:
            return {
                ...state,
                questions: action.questions
            };
        case ActionType.UPDATE_ANSWERS:
            return {
                ...state,
                answers: {
                    ...state.answers,
                    [action.name]: action.answer
                }
            };
        case ActionType.UPDATE_CHOICES:
            return {
                ...state,
                questions: state.questions.map((question: IQuestion) => {
                    if (question.name === action.name) {
                        return {
                            ...question,
                            choices: action.choices
                        };
                    }
                    return question;
                }) as IQuestion[]
            };
        case ActionType.REFRESH_CHOICES: {
            const { name, buildingBlockType, updateChoicesFn } = action;
            // get the choices and update the state with choices of the question
            // TODO: Handle this properly?
            getChoices(name, buildingBlockType, state.answers).then(({ choices }) => updateChoicesFn(choices));
            return state;
        }
        case ActionType.RESET_ANSWERS:
            return { ...state, answers: {} };

        default:
            // return state;
            throw new Error('Unsupported action type');
    }
}

const initialState: State = {
    questions: [],
    answers: {}
};

export function useReducedState(type: SupportedBuildingBlocks) {
    const [{ questions, answers }, dispatch] = useReducer(reducer, initialState);

    function updateQuestions(questions: IQuestion[]) {
        dispatch(updateQuestionsAction(questions));
    }

    function updateChoices(name: string, choices: unknown[]) {
        dispatch(updateChoicesAction(name, choices));
    }

    function updateAnswers(
        name: string,
        answer: string | number | boolean | undefined,
        dependantPromptNames: string[] = []
    ) {
        dispatch(updateAnswerAction(name, answer ?? ''));
        dependantPromptNames.forEach((name) => {
            // Reset the values of dependant prompts
            // Fire change
            updateAnswers(name, '');
            // refresh the choices in dependant prompts
            dispatch(refreshChoices(name, type, updateChoices));
        });
    }

    function resetAnswers(buildingBlockType: SupportedBuildingBlocks) {
        dispatch(resetAnswersAction(buildingBlockType));
    }
    return { questions, answers, updateQuestions, updateChoices, updateAnswers, resetAnswers };
}

interface RefreshChoices {
    type: ActionType.REFRESH_CHOICES;
    name: string;
    buildingBlockType: SupportedBuildingBlocks;
    updateChoicesFn: (choices: unknown[]) => void;
}

function refreshChoices(
    name: string,
    buildingBlockType: SupportedBuildingBlocks,
    updateChoices: (name: string, choices: unknown[]) => void
): RefreshChoices {
    return {
        type: ActionType.REFRESH_CHOICES,
        name,
        buildingBlockType,
        updateChoicesFn: (choices: unknown[]) => updateChoices(name, choices)
    };
}

interface UpdateAnswers {
    type: ActionType.UPDATE_ANSWERS;
    name: string;
    answer: string | number | boolean;
}
function updateAnswerAction(name: string, answer: string | number | boolean): UpdateAnswers {
    return {
        type: ActionType.UPDATE_ANSWERS,
        name,
        answer
    };
}

interface UpdateQuestions {
    type: ActionType.UPDATE_QUESTIONS;
    questions: IQuestion[];
}
function updateQuestionsAction(questions: IQuestion[]): UpdateQuestions {
    return {
        type: ActionType.UPDATE_QUESTIONS,
        questions
    };
}

interface UpdateChoices {
    type: ActionType.UPDATE_CHOICES;
    name: string;
    choices: unknown[];
}
function updateChoicesAction(name: string, choices: unknown[]): UpdateChoices {
    return { type: ActionType.UPDATE_CHOICES, name, choices };
}

interface ResetAnswers {
    type: ActionType.RESET_ANSWERS;
    buildingBlockType: SupportedBuildingBlocks;
}
function resetAnswersAction(buildingBlockType: SupportedBuildingBlocks): ResetAnswers {
    return {
        type: ActionType.RESET_ANSWERS,
        buildingBlockType
    };
}
