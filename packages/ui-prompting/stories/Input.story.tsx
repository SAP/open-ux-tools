import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';

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
    }
];

export const input = (): JSX.Element => {
    const [saveValues] = useStorage();
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
        />
    );
};
