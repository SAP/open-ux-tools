import React, { useState } from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';
import { TRANSLATE_EVENT_UPDATE } from '../src/context/TranslationContext';
import type { I18nBundle, TranslationEntry } from '@sap-ux/ui-components';

export default { title: 'Basic/Input' };

initIcons();

const questions: PromptQuestion[] = [
    {
        message: 'Basic',
        name: 'base',
        type: 'input'
    },
    {
        message: 'With default value',
        name: 'default value',
        type: 'input',
        default: 'Default'
    },
    {
        message: 'With external value',
        name: 'external',
        type: 'input'
    },
    {
        message: 'With validation',
        name: 'validation',
        type: 'input'
    },
    {
        message: 'With description and placeholder',
        name: 'description',
        type: 'input',
        guiOptions: {
            hint: 'Test description',
            placeholder: 'Test placeholder'
        }
    },
    {
        message: 'Translatable empty',
        name: 'translate.empty',
        type: 'input',
        guiOptions: {
            translatable: true
        }
    },
    {
        message: 'Translatable with default',
        name: 'translate.default',
        type: 'input',
        default: '{i18n>test}',
        guiOptions: {
            translatable: true
        }
    }
];

interface CustomTranslationEntry extends TranslationEntry {
    dummyPath: string;
}

const I18N_BUNDLE_KEY = 'ui-prompting-i18n-bundle';
const getI18nBundle = (): I18nBundle<CustomTranslationEntry> => {
    let i18nBundle: I18nBundle<CustomTranslationEntry> = {};
    try {
        i18nBundle = JSON.parse(
            window.localStorage.getItem(I18N_BUNDLE_KEY) ?? ''
        ) as I18nBundle<CustomTranslationEntry>;
    } catch (e) {
        i18nBundle = {};
    }
    return i18nBundle;
};

const updateI18nBundle = (i18nBundle: I18nBundle): void => {
    window.localStorage.setItem(I18N_BUNDLE_KEY, JSON.stringify(i18nBundle));
};

function useI18nBundle(): [I18nBundle, (question: string, entry: TranslationEntry) => void, string[]] {
    const [i18nBundle, setI18nBundle] = useState(getI18nBundle());
    const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
    const updateBundle = (question: string, entry: TranslationEntry) => {
        // Simulate backend call - call with timout
        pendingQuestions.push(question);
        setPendingQuestions([...pendingQuestions]);
        setTimeout(() => {
            if (!i18nBundle[entry.key.value]) {
                i18nBundle[entry.key.value] = [{ ...entry, dummyPath: 'test' }];
                updateI18nBundle(i18nBundle);
                setI18nBundle({ ...i18nBundle });
                // Update pending questions
                const index = pendingQuestions.indexOf(question);
                if (index !== -1) {
                    pendingQuestions.splice(index, 1);
                    setPendingQuestions([...pendingQuestions]);
                }
            }
        }, 1000);
    };
    return [i18nBundle, updateBundle, pendingQuestions];
}

export const input = (): JSX.Element => {
    const [saveValues] = useStorage();
    const [i18nBundle, updateBundle, pendingQuestions] = useI18nBundle();
    return (
        <Questions
            questions={questions}
            answers={{
                external: 'external value',
                externalWithoutQuestion: 'testValue'
            }}
            onChange={(answers) => {
                saveValues(answers);
            }}
            validation={{
                validation: {
                    isValid: false,
                    errorMessage: 'Invalid entry'
                }
            }}
            translationProps={{
                bundle: i18nBundle,
                pendingQuestions,
                onEvent: (question: string, event) => {
                    if (event.name === TRANSLATE_EVENT_UPDATE) {
                        updateBundle(question, event.entry);
                    } else {
                        alert(`Show entry: key:"${event.entry.key.value}" -> value:"${event.entry.value.value}"`);
                    }
                }
            }}
        />
    );
};
