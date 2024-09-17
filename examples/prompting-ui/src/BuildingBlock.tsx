import { UICheckbox, UIDefaultButton, UISmallButton, initIcons } from '@sap-ux/ui-components';
import React, { useEffect, useState } from 'react';
import type { PromptsType } from './utils';
import { applyAnswers, getChoices, getCodeSnippet, getWebSocket, validateAnswers } from './utils/communication';
import { Questions, PromptsLayoutType, setAnswer } from '@sap-ux/ui-prompting';
import type { ValidationResults, ValidationResult } from '@sap-ux/ui-prompting';
import { useChoices, useQuestions } from './utils/hooks';
import type { Answers } from 'inquirer';

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
    type: PromptsType;
    visibleQuestions?: string[];
    externalAnswers?: Answers;
    liveValidation?: boolean;
}): JSX.Element => {
    const { type, visibleQuestions, externalAnswers, liveValidation = true } = props;
    const [layoutSettings, setLayoutSettings] = useState<CustomizationSettings>({
        multiColumn: true,
        showDescriptions: true
    });
    const [alwaysAbsolutePath, setAlwaysAbsolutePath] = useState(true);
    const choices = useChoices();
    const { groups, questions, initialAnswers = {} } = useQuestions(type, visibleQuestions);
    const [answers, setAnswers] = useState<Answers>(externalAnswers ?? initialAnswers);
    const [validation, setValidation] = useState<ValidationResults>({});

    useEffect(() => setAnswers(externalAnswers ?? initialAnswers), [questions]);

    /**
     * Method updates answers and validation state.
     *
     * @param newAnswers - Updated values of all answers
     * @param name - Associated answer's question name.
     */
    async function updateAnswers(newAnswers: Answers, name?: string) {
        setAnswers(newAnswers);
        if (name) {
            if (liveValidation) {
                await validateAnswers(type, [{ name }], newAnswers).then((validationResults) =>
                    setValidation({ ...validation, ...validationResults })
                );
            } else {
                const clearValidation = { ...validation };
                if (clearValidation[name]) {
                    delete clearValidation[name];
                    setValidation(clearValidation);
                }
            }
        }
    }

    async function handleApply() {
        await validateAnswers(type, questions, answers).then((validationResults) => {
            setValidation(validationResults);
            // Call API to apply changes
            if (!Object.values(validationResults).some((result: ValidationResult) => result.isValid === false)) {
                applyAnswers(type, answers)
                    .then(() => {
                        setAnswers({});
                        setValidation({});
                    })
                    .catch(() => console.log('Error while applying answers'));
            }
        });
    }

    /**
     * Method resets answers to default state.
     */
    function handleReset() {
        setAnswers(externalAnswers ?? initialAnswers);
        setValidation({});
    }

    /**
     * Method toggles/switches layouting.
     *
     * @param name - Layout setting name.
     */
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
                <UICheckbox
                    label="AlwaysAbsolutePath"
                    checked={alwaysAbsolutePath}
                    onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                        const newAnswers = setAnswer(
                            { ...answers },
                            'buildingBlockData.metaPath.alwaysAbsolutePath',
                            checked
                        );
                        setAnswers(newAnswers);
                        setAlwaysAbsolutePath(!!checked);
                    }}
                />
            </div>
            <div
                style={{
                    ...STYLE_FULL_HEIGHT,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    flexDirection: 'column',
                    gap: '20px',
                    padding: '20px 0',
                    minWidth: '500px',
                    overflow: 'hidden'
                }}>
                <div
                    style={{
                        padding: '0 10px',
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
                        answers={answers}
                        choices={choices}
                        validation={validation}
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
