import { initIcons } from '@sap-ux/ui-components';
import React from 'react';
import type { Question } from '../src/components';
import { Questions } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { getChoices, getQuestions, getWebSocket } from './utils/communication';
import { ActionType, useReducedState } from './utils/state';

export default { title: 'Building Blocks' };

initIcons();
getWebSocket();

const BuildingBlockQuestions = (props: { type: SupportedBuildingBlocks; visibleQuestions?: string[] }): JSX.Element => {
    const { type, visibleQuestions } = props;
    const { answers, questions, updateAnswers, updateChoices, updateQuestions } = useReducedState(type);
    React.useEffect(() => {
        getQuestions(type).then((newQuestions) => {
            if (visibleQuestions) {
                const resolvedQuestions: typeof newQuestions = [];
                for (const name of visibleQuestions) {
                    const question = newQuestions.find((question) => question.name === name);
                    if (question) {
                        resolvedQuestions.push(question);
                    }
                }
                newQuestions = resolvedQuestions;
            }
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

export const customChart = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={SupportedBuildingBlocks.Chart}
            visibleQuestions={[
                'id',
                'entity',
                'chartQualifier',
                'filterBar',
                'selectionMode',
                'selectionChange',
                'bindingContextType'
            ]}
        />
    );
};

function refreshChoices(
    name: string,
    type: SupportedBuildingBlocks,
    updateChoices: (name: string, choices: unknown) => void
): { type: ActionType; payload?: any } {
    return {
        type: ActionType.REFRESH_CHOICES,
        payload: { name, type, updateChoicesFn: (choices: unknown[]) => updateChoices(name, choices) }
    };
}
