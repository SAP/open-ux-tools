import { UIDefaultButton, UISmallButton, initIcons } from '@sap-ux/ui-components';
import React, { useEffect, useState } from 'react';
import { SupportedBuildingBlocks } from './utils';
import { applyAnswers, getChoices, getCodeSnippet, getWebSocket } from './utils/communication';
import { Questions, PromptsLayoutType } from '../src/components';
import { useChoices, useQuestions } from './utils/hooks';
import { Answers } from 'inquirer';

initIcons();
getWebSocket();

interface CustomizationSettings {
    showDescriptions: boolean;
    multiColumn: boolean;
}

const STYLE_FULL_HEIGHT = {
    height: '100%'
};

const STYLE_FLEX = {
    display: 'flex'
};

export const BuildingBlockQuestions = (props: {
    type: SupportedBuildingBlocks;
    visibleQuestions?: string[];
    answers?: Answers;
}): JSX.Element => {
    const { type, visibleQuestions, answers: externalAnswers = {} } = props;
    const [answers, setAnswers] = useState<Answers>(externalAnswers);
    const [layoutSettings, setLayoutSettings] = useState<CustomizationSettings>({
        multiColumn: true,
        showDescriptions: true
    });
    const choices = useChoices();
    const { groups, questions } = useQuestions(type, visibleQuestions);

    function updateAnswers(answers: Answers) {
        setAnswers(answers);
    }

    function handleApply() {
        // Call API to apply changes
        console.log('Applying changes... FPM Writer');
        applyAnswers(type, answers).then(({ buildingBlockType }) => setAnswers({}));
    }

    function handleReset() {
        setAnswers(externalAnswers);
    }

    function toggleLayout(name: keyof CustomizationSettings): void {
        setLayoutSettings({
            ...layoutSettings,
            [name]: !layoutSettings[name]
        });
    }

    useEffect(() => {
        getCodeSnippet(type, answers);
    }, [answers]);

    return (
        <div
            style={{
                ...STYLE_FULL_HEIGHT,
                ...STYLE_FLEX,
                flexDirection: 'column'
            }}>
            <div
                style={{
                    ...STYLE_FLEX,
                    gap: '10px',
                    padding: '10px 10px',
                    borderBottom: '3px solid var(--vscode-button-secondaryHoverBackground)'
                }}>
                <UISmallButton onClick={toggleLayout.bind(window, 'multiColumn')}>
                    {layoutSettings.multiColumn ? 'Single column' : 'Multi column'}
                </UISmallButton>
                <UISmallButton onClick={toggleLayout.bind(window, 'showDescriptions')}>
                    {layoutSettings.showDescriptions ? 'Hide descriptions' : 'Show descriptions'}
                </UISmallButton>
            </div>
            <div
                style={{
                    ...STYLE_FULL_HEIGHT,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '20px 10px',
                    minWidth: '500px',
                    overflow: 'hidden'
                }}>
                <div
                    style={{
                        height: '100%',
                        overflow: 'auto'
                    }}>
                    <Questions
                        groups={groups}
                        questions={questions}
                        onChoiceRequest={(names: string[], latestAnswers: Answers) => {
                            getChoices(names, type, latestAnswers);
                        }}
                        onChange={updateAnswers}
                        answers={answers || {}}
                        choices={choices}
                        layoutType={
                            layoutSettings.multiColumn ? PromptsLayoutType.MultiColumn : PromptsLayoutType.SingleColumn
                        }
                        showDescriptions={layoutSettings.showDescriptions}
                    />
                </div>
                {/* Disable the button if there is no answers for the 'required' question */}
                <div
                    className="cta"
                    style={{
                        ...STYLE_FLEX,
                        gap: '10px',
                        padding: '10px 10px'
                    }}>
                    <UIDefaultButton primary={true} onClick={handleApply}>
                        Apply
                    </UIDefaultButton>
                    <UIDefaultButton primary={false} onClick={handleReset}>
                        Reset
                    </UIDefaultButton>
                </div>
            </div>
        </div>
    );
};
