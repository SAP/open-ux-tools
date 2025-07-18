import { useState, useEffect, useRef } from 'react';
import {
    createI18n,
    getI18nBundle,
    getQuestions,
    subscribeOnChoicesUpdate,
    unsubscribeOnChoicesUpdate
} from './communication';
import type { DynamicChoices, PromptQuestion, TranslationProperties } from '@sap-ux/ui-prompting';
import type { PromptsType } from './types';
import type { PromptsGroup } from '@sap-ux/ui-prompting';
import type { Answers } from 'inquirer';
import type { I18nBundle, TranslationEntry } from '@sap-ux/ui-components';

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
    type: PromptsType,
    filterQuestions?: string[]
): { questions: PromptQuestion[]; groups?: PromptsGroup[]; initialAnswers?: Partial<Answers> } {
    const [questions, setQuestions] = useState<{
        questions: PromptQuestion[];
        groups?: PromptsGroup[];
        initialAnswers?: Partial<Answers>;
    }>({
        groups: undefined,
        questions: []
    });

    useEffect(() => {
        getQuestions(type)
            .then(({ groups, questions, initialAnswers }) => {
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
                setQuestions({ groups, questions, initialAnswers });
            })
            .catch(() => console.log('Error while getting prompt questions'));
    }, []);

    return questions;
}

/**
 * Method removes question from array of pending questions.
 *
 * @param pendingQuestions Array of pending questions
 * @param question Question to remove
 * @returns Updated pending questions.
 */
function removePendingQuestions(pendingQuestions: string[], question: string): string[] {
    const index = pendingQuestions.indexOf(question);
    if (index !== -1) {
        pendingQuestions.splice(index, 1);
    }
    return pendingQuestions;
}

/**
 * Hook to retrieve i18n bundle.
 *
 * @returns I18n bundle with creation function.
 */
export function useI18nBundle(): [
    I18nBundle,
    (question: string, entry: TranslationEntry, properties?: TranslationProperties) => void,
    string[]
] {
    const [i18nBundle, setI18nBundle] = useState({});
    const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
    const updateBundle = (question: string, entry: TranslationEntry, properties?: TranslationProperties) => {
        // Update pending creations
        pendingQuestions.push(question);
        setPendingQuestions([...pendingQuestions]);
        createI18n(entry.key.value, entry.value.value, properties)
            .then((bundle: I18nBundle) => {
                setI18nBundle(bundle);
                const newPendingQuestions = removePendingQuestions(pendingQuestions, question);
                setPendingQuestions([...newPendingQuestions]);
            })
            .catch(() => {
                const newPendingQuestions = removePendingQuestions(pendingQuestions, question);
                setPendingQuestions([...newPendingQuestions]);
            });
    };
    useEffect(() => {
        getI18nBundle()
            .then((bundle: I18nBundle) => {
                setI18nBundle(bundle);
            })
            .catch(() => console.log('Error while getting i18n'));
    }, []);
    return [i18nBundle, updateBundle, pendingQuestions];
}
