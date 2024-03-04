import { useState, useEffect } from 'react';
import type { UIComboBoxOption } from '@sap-ux/ui-components';
import type { Question } from '../Question';
import type { Choice } from '../Questions';

function getOptions(question: Question, choices?: Choice[]): UIComboBoxOption[] {
    // Use external/dynamicly populated choices
    let resolvedChoices = choices;
    // Use static choices if dynamic choices are not available
    if (!resolvedChoices && 'choices' in question && Array.isArray(question.choices)) {
        resolvedChoices = question.choices;
    }
    if (resolvedChoices?.length) {
        return resolvedChoices.map((choice) => {
            const { name, value } = choice;
            return {
                key: value,
                text: typeof name === 'string' ? name : ''
            };
        });
    }
    // Default options
    return [
        {
            key: '',
            text: ''
        }
    ];
}

export function useOptions(question: Question, choices?: Choice[]): UIComboBoxOption[] {
    const [options, setOptions] = useState<UIComboBoxOption[]>([]);
    useEffect(() => {
        const options = getOptions(question, choices);
        setOptions(options);
    }, [question, choices]);
    return options;
}
