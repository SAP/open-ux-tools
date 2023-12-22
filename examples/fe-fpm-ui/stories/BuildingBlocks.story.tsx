import { initIcons } from '@sap-ux/ui-components';
import { Answers } from 'inquirer';
import React, { useReducer } from 'react';
import type { Question } from '../src/components';
import { Questions } from '../src/components';
import { GET_CHOICES, SupportedBuildingBlocks } from './utils';
import { getChoices, getQuestions, getWebSocket, sendMessage } from './utils/communication';

export default { title: 'Building Blocks' };

initIcons();
getWebSocket();

interface State {
    questions: Question[];
    answers: Answers;
}

function reducer(state: State, action: { type: string; payload?: any }) {
    switch (action.type) {
        case 'questions/update':
            return {
                ...state,
                questions: action.payload
            };
        case 'answers/update':
            return {
                ...state,
                answers: {
                    ...state.answers,
                    [action.payload.name]: action.payload.answer
                }
            };
        case 'choices/update':
            return {
                ...state,
                questions: state.questions.map((question: Question) => {
                    if (question.name === action.payload.name) {
                        return {
                            ...question,
                            choices: action.payload.choices
                        };
                    }
                    return question;
                })
            };

        default:
            return state;
    }
}
const initialState: State = {
    questions: [],
    answers: {}
};

const BuildingBlockQuestions = (props: { type: SupportedBuildingBlocks }): JSX.Element => {
    const [{ questions, answers }, dispatch] = useReducer(reducer, initialState);

    function updateQuestions(questions: Question[]) {
        dispatch({ type: 'questions/update', payload: questions });
    }

    function updateAnswers(
        name: string,
        answer: string | number | boolean | undefined,
        dependantPromptNames: string[] = []
    ) {
        dispatch({ type: 'answers/update', payload: { name, answer } });
        dependantPromptNames.forEach((name) => {
            // Reset the values of dependant prompts
            // Fire change
            updateAnswers(name, '');
        });
    }

    function updateChoices(name: string, choices: unknown) {
        dispatch({ type: 'choices/update', payload: { name, choices } });
    }

    const { type } = props;
    // const [questions, setQuestions] = React.useState<Question[]>([]);
    React.useEffect(() => {
        getQuestions(type).then((newQuestions) => {
            console.log({ newQuestions });
            updateQuestions(newQuestions as Question[]);
        });
    }, []);
    return (
        <Questions
            questions={questions}
            onChoiceRequest={(name: string) => {
                getChoices(name, type, answers).then(({ name, choices }) => {
                    updateChoices(name, choices);
                });
            }}
            onChange={updateAnswers}
            answers={answers || {}}
        />
    );
};

export const table = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} />;
};

export const chart = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Chart} />;
};

export const filterBar = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.FilterBar} />;
};

export const custom = (): JSX.Element => {
    return <div>Exclude questions???</div>;
};
