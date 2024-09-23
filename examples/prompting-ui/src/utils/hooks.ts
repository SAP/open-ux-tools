import { useState, useEffect, useRef } from 'react';
import { getI18nBundle, getQuestions, subscribeOnChoicesUpdate, unsubscribeOnChoicesUpdate } from './communication';
import type { DynamicChoices, PromptQuestion } from '@sap-ux/ui-prompting';
import type { PromptsType } from './types';
import type { PromptsGroup } from '@sap-ux/ui-prompting';
import type { Answers } from 'inquirer';
import { I18nBundle, TranslationEntry } from '@sap-ux/ui-components';

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

export function useI18nBundle(): [I18nBundle, (entry: TranslationEntry) => void] {
    const [i18nBundle, setI18nBundle] = useState({});
    const updateBundle = (entry: TranslationEntry) => {
        // if (!i18nBundle[entry.key.value]) {
        //     i18nBundle[entry.key.value] = [{ ...entry, dummyPath: 'dddd' }];
        //     updateI18nBundle(i18nBundle);
        //     setI18nBundle({ ...i18nBundle });
        // }
    };
    useEffect(() => {
        getI18nBundle()
            .then((bundle: I18nBundle) => {
                console.log('Resolved Bundle:');
                console.log(bundle);
                setI18nBundle(bundle);
            })
            .catch(() => console.log('Error while getting prompt questions'));
    }, []);
    // console.log('Bundle:');
    // console.log(i18nBundle);
    return [i18nBundle, updateBundle];
}
