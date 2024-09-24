import { useState } from 'react';
import { Answers } from 'inquirer';
import type { I18nBundle, TranslationEntry } from '@sap-ux/ui-components';

const storageKey = 'storybook-answers';

export function saveValues(answers: Answers) {
    window.localStorage.setItem(storageKey, JSON.stringify(answers, undefined, 4));
}

export function useStorage(): [(answers: Answers) => void] {
    return [saveValues];
}

interface CustomTranslationEntry extends TranslationEntry {
    dummyPath: string;
}

const I18N_BUNDLE_KEY = 'ui-components-i18n-bundle';
const getI18nBundle = (): I18nBundle<CustomTranslationEntry> => {
    let i18nBundle: I18nBundle<CustomTranslationEntry> = {};
    try {
        i18nBundle = JSON.parse(
            window.localStorage.getItem(I18N_BUNDLE_KEY) || ''
        ) as I18nBundle<CustomTranslationEntry>;
    } catch (e) {
        i18nBundle = {};
    }
    return i18nBundle;
};

const updateI18nBundle = (i18nBundle: I18nBundle): void => {
    window.localStorage.setItem(I18N_BUNDLE_KEY, JSON.stringify(i18nBundle));
};

export function useI18nBundle(): [I18nBundle, (question: string, entry: TranslationEntry) => void, string[]] {
    const [i18nBundle, setI18nBundle] = useState(getI18nBundle());
    const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
    const updateBundle = (question: string, entry: TranslationEntry) => {
        // Simulate backend call - call with timout
        pendingQuestions.push(question);
        setPendingQuestions([...pendingQuestions]);
        setTimeout(() => {
            if (!i18nBundle[entry.key.value]) {
                i18nBundle[entry.key.value] = [{ ...entry, dummyPath: 'dddd' }];
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
