import { useState, useEffect, useRef } from 'react';
import { getQuestions, subscribeOnChoicesUpdate, unsubscribeOnChoicesUpdate } from './communication';
import type { DynamicChoices, PromptQuestion } from '@sap-ux/ui-prompting';
import type { SupportedBuildingBlocks } from './types';
import type { PromptsGroup } from '@sap-ux/ui-prompting';

/**
 * Hook to retrieve dynamic choices.
 *
 * @returns Dynamic choices.
 */
export function useChoices(): DynamicChoices {
    const [choices, setChoices] = useState({});
    const internalChoices = useRef<DynamicChoices>({});

    useEffect(() => {
        /**
         * Method updates local choices with received dynamic choices.
         *
         * @param newChoices New received dynamic choices.
         */
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

/**
 * Hook to retrieve prompt with questions.
 *
 * @param type Prompt type
 * @param filterQuestions Optional filter to filter by passed question names
 * @returns Prompt with questions.
 */
export function useQuestions(
    type: SupportedBuildingBlocks,
    filterQuestions?: string[]
): { questions: PromptQuestion[]; groups?: PromptsGroup[] } {
    const [questions, setQuestions] = useState<{ questions: PromptQuestion[]; groups?: PromptsGroup[] }>({
        groups: undefined,
        questions: []
    });

    useEffect(() => {
        getQuestions(type)
            .then(({ groups, questions }) => {
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
            })
            .catch(() => console.log('Error while getting prompt questions'));
    }, []);

    return questions;
}
