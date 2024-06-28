import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';

export default { title: 'Basic/List' };

initIcons();

const choices = [
    {
        name: 'test1',
        value: 'test1'
    },
    {
        name: 'test2',
        value: 'test2'
    },
    {
        name: 'true(boolean)',
        value: true
    },
    {
        name: 'false(boolean)',
        value: false
    },
    {
        name: '0(number)',
        value: 0
    },
    {
        name: '1(number)',
        value: 1
    },
    {
        name: '0(string)',
        value: '0'
    }
];

const questions: PromptQuestion[] = [
    {
        message: 'Basic',
        name: 'base',
        type: 'list',
        choices
    },
    {
        message: 'With default value',
        name: 'default value',
        type: 'list',
        default: 'Default',
        choices
    },
    {
        message: 'With external value',
        name: 'external',
        type: 'list',
        choices
    },
    {
        message: 'With validation',
        name: 'validation',
        type: 'list',
        choices
    }
];

export const list = (): JSX.Element => {
    const [saveValues] = useStorage();
    return (
        <Questions
            questions={questions}
            answers={{
                external: 'test2'
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
