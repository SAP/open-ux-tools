import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useI18nBundle, useStorage } from './utils';
import { TRANSLATE_EVENT_UPDATE } from '../src/context/TranslationContext';

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
        name: 'translateEmpty',
        type: 'input',
        guiOptions: {
            translatable: true
        }
    },
    {
        message: 'Translatable with default',
        name: 'translateDefault',
        type: 'input',
        default: '{i18n>test}',
        guiOptions: {
            translatable: true
        }
    }
];

export const input = (): JSX.Element => {
    const [saveValues] = useStorage();
    const [i18nBundle, updateBundle] = useI18nBundle();
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
                onEvent: (event) => {
                    if (event.name === TRANSLATE_EVENT_UPDATE) {
                        updateBundle(event.entry);
                    } else {
                        alert(`Show entry: key:"${event.entry.key.value}" -> value:"${event.entry.value.value}"`);
                    }
                }
            }}
        />
    );
};
