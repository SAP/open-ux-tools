import { useState, useEffect, useRef } from 'react';
import { getQuestions, subscribeOnChoicesUpdate, unsubscribeOnChoicesUpdate } from './communication';
import { DynamicChoices, PromptQuestion } from '@sap-ux/ui-prompting';
import { SupportedBuildingBlocks } from './types';
import { PromptsGroup } from '@sap-ux/ui-prompting';

export function useChoices(): DynamicChoices {
    const [choices, setChoices] = useState({});
    const internalChoices = useRef<DynamicChoices>({});

    useEffect(() => {
        function onChoicesReceived(newChoices: DynamicChoices) {
            internalChoices.current = {
                ...internalChoices.current,
                ...newChoices
            };
            setChoices(internalChoices.current);
        }

        const listener = subscribeOnChoicesUpdate(onChoicesReceived);
        return () => {
            unsubscribeOnChoicesUpdate(listener);
        };
    }, []);

    return choices;
}

export function useQuestions(
    type: SupportedBuildingBlocks,
    filterQuestions?: string[]
): { questions: PromptQuestion[]; groups?: PromptsGroup[] } {
    const [questions, setQuestions] = useState<{ questions: PromptQuestion[]; groups?: PromptsGroup[] }>({
        groups: undefined,
        questions: []
    });

    useEffect(() => {
        getQuestions(type).then(({ groups, questions }) => {
            if (filterQuestions) {
                const resolvedQuestions: typeof questions = [];
                for (const name of filterQuestions) {
                    const question = questions.find((question) => question.name === name);
                    if (question) {
                        resolvedQuestions.push(question);
                    }
                }
                questions = resolvedQuestions;
            }
            setQuestions({ groups, questions });
        });
    }, []);

    return questions;
}
