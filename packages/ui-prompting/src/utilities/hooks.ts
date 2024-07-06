import { useEffect, useRef, useState } from 'react';
import type { UIComboBoxOption } from '@sap-ux/ui-components';
import { getDynamicQuestions } from './utils';
import type { PromptQuestion, DynamicChoices, PromptListChoices } from '../types';
import type { ChoiceOptions } from 'inquirer';

interface RequestedChoices {
    [key: string]: boolean;
}

export function useValue<S>(initialValue: S, propValue?: S): [S, (value: S) => void] {
    const [value, setValue] = useState(propValue ?? initialValue);

    useEffect(() => {
        // Update the local state value if new value from props is received
        if (propValue !== undefined && propValue !== value) {
            setValue(propValue);
        }
    }, [propValue]);

    const updateValue = (newValue: S) => {
        setValue(newValue);
    };

    return [value, updateValue];
}

function getOptions(question: PromptQuestion, choices?: PromptListChoices): UIComboBoxOption[] {
    // Use external/dynamicly populated choices
    let resolvedChoices = choices;
    // Use static choices if dynamic choices are not available
    if (!resolvedChoices && 'choices' in question && Array.isArray(question.choices)) {
        resolvedChoices = question.choices;
    }
    if (resolvedChoices?.length) {
        return resolvedChoices.map((choice) => {
            if (typeof choice === 'string') {
                return {
                    key: choice,
                    text: choice,
                    data: { value: choice }
                };
            } else {
                return {
                    key: (choice as ChoiceOptions).value.toString(),
                    text: (choice as ChoiceOptions).name ?? '',
                    // ToDo create new type
                    data: choice
                };
            }
        });
    }
    // Default options
    return [];
}

export function useOptions(question: PromptQuestion, choices?: PromptListChoices): UIComboBoxOption[] {
    const [options, setOptions] = useState<UIComboBoxOption[]>([]);
    useEffect(() => {
        const options = getOptions(question, choices);
        setOptions(options);
    }, [question, choices]);
    return options;
}

export function useRequestedChoices(
    initialValue: RequestedChoices,
    latestChoices: DynamicChoices = {}
): [RequestedChoices, (value: string[]) => void] {
    const requests = useRef<RequestedChoices>({ ...initialValue });
    const [pendingRequests, setPendingRequests] = useState<RequestedChoices>({ ...requests.current });
    const choices = useRef<DynamicChoices>({ ...latestChoices });
    const setRequestedChoices = (names: string[]) => {
        for (const name of names) {
            requests.current[name] = true;
            // Remove previous choices
            delete choices.current[name];
        }
        setPendingRequests({ ...requests.current });
    };
    useEffect(() => {
        let updated: boolean = false;
        for (const name in latestChoices) {
            if (!choices.current[name]) {
                updated = true;
                // Update local choices and pending requests
                choices.current[name] = latestChoices[name];
                delete requests.current[name];
            }
        }
        choices.current = { ...latestChoices };
        if (updated) {
            setPendingRequests({ ...requests.current });
        }
    }, [latestChoices]);
    return [pendingRequests, setRequestedChoices];
}

function isDynamicQuestionsEquals(values1: string[], values2: string[]): boolean {
    return (
        values1.length === values2.length &&
        values1.every((value) => values2.includes(value)) &&
        values2.every((value) => values1.includes(value))
    );
}

export function useDynamicQuestionsEffect(effect: (names: string[]) => void, questions: PromptQuestion[]): void {
    const dynamicChoices = useRef<string[]>([]);
    useEffect(() => {
        const newDynamicChoices = getDynamicQuestions(questions);
        if (!isDynamicQuestionsEquals(dynamicChoices.current, newDynamicChoices)) {
            // Dynamic questions changed - trigger effect
            dynamicChoices.current = newDynamicChoices;
            effect(dynamicChoices.current);
        }
    }, [questions]);
}
