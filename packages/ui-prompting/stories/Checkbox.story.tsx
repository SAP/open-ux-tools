import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';

export default { title: 'Basic/Checkbox' };

initIcons();

const choices = [
    {
        name: 'test1',
        value: 'test1'
    },
    {
        name: 'test2',
        value: 'test2'
    }
];

const hiddenChoices = [
    {
        name: 'test1',
        value: 'test1'
    },
    {
        name: 'test2',
        value: 'test2',
        selected: true,
    },
    {
        name: 'test3',
        value: 'test3',
        selected: true,
        hidden: true
    }
];

const questions: PromptQuestion[] = [
    {
        message: 'Basic',
        name: 'base',
        type: 'checkbox',
        choices
    },
    {
        message: 'With default value',
        name: 'default value',
        type: 'checkbox',
        default: 'test1, test2',
        choices
    },
    {
        message: 'With hidden value',
        name: 'hidden value',
        type: 'checkbox',
        choices: hiddenChoices
    },
    {
        message: 'With external value',
        name: 'external',
        type: 'checkbox',
        choices
    },
    {
        message: 'With validation',
        name: 'validation',
        type: 'checkbox',
        choices
    },
    {
        message: 'With description and placeholder',
        name: 'description',
        type: 'checkbox',
        choices,
        guiOptions: {
            hint: 'Test description',
            placeholder: 'Test placeholder'
        }
    }
];

export const checkbox = (): JSX.Element => {
    const [saveValues] = useStorage();
    return (
        <Questions
            questions={questions}
            answers={{
                external: 'test2',
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
            choices={{}}
            onChoiceRequest={() => {}}
        />
    );
};
