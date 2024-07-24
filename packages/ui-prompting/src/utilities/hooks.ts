import { useEffect, useRef, useState } from 'react';
import type { UIComboBoxOption, UISelectableOption } from '@sap-ux/ui-components';
import { convertChoicesToOptions, getAnswer, getDynamicQuestions, isDeepEqual, setAnswer } from './utils';
import type { PromptQuestion, DynamicChoices, PromptListChoices } from '../types';
import type { Answers, ChoiceOptions } from 'inquirer';

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
export function useValue<S>(initialValue?: S, propValue?: S): [S | undefined, (value: S | undefined) => void] {
    const [value, setValue] = useState(propValue ?? initialValue);

    useEffect(() => {
        // Update the local state value if new value from props is received
        if (propValue !== value) {
            setValue(propValue);
        }
    }, [propValue]);

    const updateValue = (newValue: S | undefined) => {
        setValue(newValue);
    };

    return [value, updateValue];
}

/**
 * Method returns dropdown options for passed question.
 *
 * @param question - Question with choices
 * @param choices - External choices(if param is passed then choices would be used on top of "question.choices")
 * @returns Returns dropdown/combobox options.
 */
function getQuestionOptions(
    question: PromptQuestion,
    choices?: PromptListChoices
): UISelectableOption<ChoiceOptions>[] {
    // Use external/dynamicly populated choices
    let resolvedChoices = choices;
    // Use static choices if dynamic choices are not available
    if (!resolvedChoices && 'choices' in question && Array.isArray(question.choices)) {
        resolvedChoices = question.choices;
    }
    return convertChoicesToOptions(resolvedChoices ?? []);
}

/**
 * Hook for dropdown/combobox options for dropdown components.
 *
 * @param question - Question with choices
 * @param choices - External choices(if param is passed then choices would be used on top of "question.choices")
 * @returns Returns dropdown/combobox options.
 */
export function useOptions(question: PromptQuestion, choices?: PromptListChoices): UISelectableOption<ChoiceOptions>[] {
    const [options, setOptions] = useState<UIComboBoxOption[]>(() => getQuestionOptions(question, choices));
    useEffect(() => {
        const options = getQuestionOptions(question, choices);
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

/**
 * Methods merges external answers with default values with questions and returns new reference with merged answers.
 *
 * @param answers - External answers to merge with default values from questions
 * @param questions - Questions which can contain default answers
 * @returns New reference with merged answers.
 */
const mergeAllAnswers = (answers: Answers, questions: PromptQuestion[]): { merged: boolean; answers?: Answers } => {
    const newAnswers = structuredClone(answers);
    let merged = false;
    for (const question of questions) {
        if (question.default !== undefined && getAnswer(newAnswers, question.name) === undefined) {
            setAnswer(newAnswers, question.name, question.default);
            merged = true;
        }
    }
    return {
        merged,
        answers: newAnswers
    };
};

/**
 * Hook for question answers state object whch maintains external answers with defaul answers from questions.
 *
 * @param questions - Questions which can contain default answers
 * @param externalAnswers - External answers to merge with default values from questions
 * @param onInitialChange - Callback function which called when external or default values of questions changed
 * @returns Returns a stateful answers, and a function to update it.
 */
export function useAnswers(
    questions: PromptQuestion[],
    externalAnswers?: Answers,
    onInitialChange?: (value: Answers) => void
): [Answers, (value: Answers) => void] {
    const currentExternalAnswers = useRef<Answers>({});
    const [localAnswers, setLocalAnswers] = useState(() => {
        // Initial value
        const merge = mergeAllAnswers(externalAnswers ?? {}, questions);
        return merge.answers ?? {};
    });

    useEffect(() => {
        let updated: boolean = false;
        let answers = localAnswers;
        if (externalAnswers && !isDeepEqual(currentExternalAnswers.current, externalAnswers)) {
            currentExternalAnswers.current = externalAnswers;
            answers = externalAnswers;
            updated = true;
        }
        const { merged, answers: newAnswers } = mergeAllAnswers(answers, questions);
        updated = merged || updated;
        if (updated && newAnswers) {
            setLocalAnswers(newAnswers);
            // Callback function - notify about answers change
            onInitialChange?.(newAnswers);
        }
    }, [questions, externalAnswers]);

    return [localAnswers, setLocalAnswers];
}

let GENERATED_PROMPT_ID_INDEX = 0;
/**
 * Method to generate id for prompt component.
 *
 * @returns Generated id for prompt component.
 */
export function getId(): string {
    // Update global index
    const index = GENERATED_PROMPT_ID_INDEX++;
    return `ui-prompt${index}`;
}

/**
 * Hook for unique id for component or DOM element.
 *
 * @param externalId - external id
 * @returns Resolved id for component or DOM.
 */
export function useId(externalId?: string): string {
    const currentExternalId = useRef<string | undefined>(externalId);
    const [id, setId] = useState<string>(() => externalId ?? getId());
    useEffect(() => {
        if (currentExternalId.current !== externalId) {
            setId(externalId ?? getId());
        }
    }, [externalId]);
    return id;
}
