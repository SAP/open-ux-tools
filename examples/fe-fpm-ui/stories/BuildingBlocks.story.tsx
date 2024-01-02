import { UIDefaultButton, initIcons } from '@sap-ux/ui-components';
import React from 'react';
import { SupportedBuildingBlocks } from './utils';
import { applyAnswers, getChoices, getCodeSnippet, getQuestions, getWebSocket } from './utils/communication';
import { ActionType, useReducedState } from './utils/state';
import { Questions } from '../src/components';

export default { title: 'Building Blocks' };

initIcons();
getWebSocket();

const BuildingBlockQuestions = (props: { type: SupportedBuildingBlocks; visibleQuestions?: string[] }): JSX.Element => {
    const { type, visibleQuestions } = props;
    const { answers, questions, updateAnswers, updateChoices, updateQuestions, resetAnswers } = useReducedState(type);
    function handleApply() {
        // Call API to apply changes
        console.log('Applying changes... FPM Writer');

        applyAnswers(type, answers).then(({ buildingBlockType }) => {
            // resetAnswers(buildingBlockType);
        });
    }
    const [codeSnippet, setCodeSnippet] = React.useState('');

    function handleGetCodeSnippet() {
        getCodeSnippet(type, answers).then(({ codeSnippet }) => {
            setCodeSnippet(codeSnippet);
        });
    }

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
            // initialize the required property - better logic?
            newQuestions.forEach((question) => {
                question.required = !!(
                    (question.dependantPromptNames && question.dependantPromptNames?.length > 0) ||
                    question.selectType === 'dynamic'
                );
            });
            updateQuestions(newQuestions);
        });
    }, []);
    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '20px 10px',
                    minWidth: '500px'
                }}>
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
                {/* Disable the button if there is no answers for the 'required' question */}
                <div className="cta">
                    <UIDefaultButton primary={true} onClick={handleApply}>
                        Apply
                    </UIDefaultButton>
                </div>
            </div>
            <div
                style={{
                    padding: '20px'
                }}>
                <button onClick={handleGetCodeSnippet}>Get code snippet</button>
                <textarea
                    disabled
                    value={codeSnippet || 'No code snippet available.'}
                    style={{
                        fontFamily: 'monospace',
                        resize: 'none',
                        fontSize: '10px',
                        display: 'block',
                        padding: '10px 20px',
                        width: '400px',
                        height: '350px',
                        border: '#ccc solid 1px',
                        borderRadius: '4px'
                    }}></textarea>
            </div>
        </div>
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
                'qualifier',
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
