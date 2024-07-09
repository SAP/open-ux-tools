import { useEffect, useRef, useState } from 'react';
import type { UIComboBoxOption, UISelectableOption } from '@sap-ux/ui-components';
import { getDynamicQuestions } from './utils';
import type { PromptQuestion, DynamicChoices, PromptListChoices } from '../types';
import type { ChoiceOptions } from 'inquirer';

interface RequestedChoices {
    [key: string]: boolean;
}

/**
 * Hook for value update for input components.
 *
 * @param initialValue - Initial/default value
 * @param propValue - External value from component properties
 * @returns Returns a stateful value, and a function to update it.
 */
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

// ToDo - move from hooks?
/**
 * Method returns dropdown/combobox options for passed question.
 *
 * @param question - Question with choices
 * @param choices - External choices(if param is passed then choices would be used on top of "question.choices")
 * @returns Returns dropdown/combobox options.
 */
function getOptions(question: PromptQuestion, choices?: PromptListChoices): UISelectableOption<ChoiceOptions>[] {
    // Use external/dynamicly populated choices
    let resolvedChoices = choices;
    // Use static choices if dynamic choices are not available
    if (!resolvedChoices && 'choices' in question && Array.isArray(question.choices)) {
        resolvedChoices = question.choices;
    }
    if (!resolvedChoices?.length) {
        return [];
    }
    const options: UISelectableOption<ChoiceOptions>[] = [];
    for (const choice of resolvedChoices) {
        if (typeof choice === 'string') {
            options.push({
                key: choice,
                text: choice,
                data: { value: choice }
            });
        } else if ('value' in choice) {
            options.push({
                key: choice.value,
                text: choice.name ?? '',
                data: choice
            });
        }
    }
    return options;
}

/**
 * Hook for dropdown/combobox options for dropdown components.
 *
 * @param question - Question with choices
 * @param choices - External choices(if param is passed then choices would be used on top of "question.choices")
 * @returns Returns dropdown/combobox options.
 */
export function useOptions(question: PromptQuestion, choices?: PromptListChoices): UIComboBoxOption[] {
    const [options, setOptions] = useState<UIComboBoxOption[]>([]);
    useEffect(() => {
        const options = getOptions(question, choices);
        setOptions(options);
    }, [question, choices]);
    return options;
}

/**
 * Hook for requested choices update.
 *
 * @param initialValue - Initial/default choices
 * @param latestChoices - Latest choices from component properties
 * @returns Returns a stateful value, and a function to update it.
 */
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

/**
 * Method checks if array of dynamic questions are equal.
 *
 * @param values1 - First array of choices
 * @param values2 - Second array of choices
 * @returns Returns true if all values in both arays exists.
 */
function isDynamicQuestionsEquals(values1: string[], values2: string[]): boolean {
    return (
        values1.length === values2.length &&
        values1.every((value) => values2.includes(value)) &&
        values2.every((value) => values1.includes(value))
    );
}

/**
 * Hook as effect to detect when dynamic choices should be requested.
 *
 * @param effect - Effect which triggered when update/refresh for dynamic questions should be requested
 * @param questions - Current questions
 */
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
