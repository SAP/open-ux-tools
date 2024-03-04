import { UIDefaultButton, initIcons } from '@sap-ux/ui-components';
import React, { useEffect, useState } from 'react';
import { SupportedBuildingBlocks } from './utils';
import { applyAnswers, getChoices, getCodeSnippet, getWebSocket } from './utils/communication';
import { Questions, PromptsLayoutType } from '../src/components';
import { useChoices, useQuestions } from './utils/hooks';
import { Answers } from 'inquirer';

initIcons();
getWebSocket();

export const BuildingBlockQuestions = (props: {
    type: SupportedBuildingBlocks;
    visibleQuestions?: string[];
    layout?: PromptsLayoutType;
}): JSX.Element => {
    const { type, visibleQuestions, layout = PromptsLayoutType.MultiColumn } = props;
    const [answers, setAnswers] = useState<Answers>({});
    const choices = useChoices();
    const questions = useQuestions(type, visibleQuestions);

    function updateAnswers(answers: Answers) {
        setAnswers(answers);
    }

    function handleApply() {
        // Call API to apply changes
        console.log('Applying changes... FPM Writer');
        applyAnswers(type, answers).then(({ buildingBlockType }) => {});
    }

    useEffect(() => {
        getCodeSnippet(type, answers);
    }, [answers]);

    return (
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
                onChoiceRequest={(names: string[], latestAnswers: Answers) => {
                    getChoices(names, type, latestAnswers);
                }}
                onChange={updateAnswers}
                answers={answers || {}}
                choices={choices}
                layoutType={layout as PromptsLayoutType}
            />
            {/* Disable the button if there is no answers for the 'required' question */}
            <div className="cta">
                <UIDefaultButton primary={true} onClick={handleApply}>
                    Apply
                </UIDefaultButton>
            </div>
        </div>
    );
};
