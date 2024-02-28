import { useState, useEffect, useRef } from 'react';
import { getQuestions, subscribeOnChoicesUpdate, unsubscribeOnChoicesUpdate } from './communication';
import { Choice, DynamicChoices, IQuestion } from '../../src/components';
import { SupportedBuildingBlocks } from './types';

export function useChoices(): DynamicChoices {
    const [choices, setChoices] = useState({});
    const internalChoices = useRef<DynamicChoices>({});

    useEffect(() => {
        function onChoicesReceived(name: string, newChoices: Choice[]) {
            internalChoices.current = {
                ...internalChoices.current,
                [name]: newChoices
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

export function useQuestions(type: SupportedBuildingBlocks, filterQuestions?: string[]): IQuestion[] {
    const [questions, setQuestions] = useState<IQuestion[]>([]);

    useEffect(() => {
        getQuestions(type).then((newQuestions) => {
            if (filterQuestions) {
                const resolvedQuestions: typeof newQuestions = [];
                for (const name of filterQuestions) {
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
            setQuestions(newQuestions);
        });
    }, []);

    return questions;
}
