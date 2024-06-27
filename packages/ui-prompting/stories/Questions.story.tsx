import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';

export default { title: 'Basic/Questions' };

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

const questions: PromptQuestion[] = [
    {
        name: 'Dummy1',
        type: 'input'
    },
    {
        name: 'Dummy2',
        type: 'checkbox',
        choices
    },
    {
        name: 'Dummy3',
        type: 'list',
        choices
    }
];

export const defaultUsage = (): JSX.Element => {
    const [saveValues] = useStorage();
    return (
        <Questions
            questions={questions}
            answers={{}}
            choices={{}}
            onChange={(answers) => {
                saveValues(answers);
            }}
            onChoiceRequest={() => {}}
            validation={{}}
        />
    );
};

const objectBasedQuestions: PromptQuestion[] = [
    {
        name: 'test.dummy',
        message: 'test -> dummy',
        type: 'input'
    },
    {
        name: 'test.dummy2',
        message: 'test -> dummy2',
        type: 'checkbox',
        choices
    },
    {
        name: 'test2.dummy',
        message: 'test2 -> dummy',
        type: 'list',
        choices
    },
    {
        name: 'test3',
        message: 'test3',
        type: 'input'
    },
    {
        name: 'test4.child.dummy',
        message: 'test4 -> child -> dummy',
        type: 'input'
    },
];
export const ObjectBasedQuestions = (): JSX.Element => {
    const [saveValues] = useStorage();
    return (
        <Questions
            questions={objectBasedQuestions}
            answers={{}}
            choices={{}}
            onChange={(answers) => {
                saveValues(answers);
            }}
            onChoiceRequest={() => {}}
            validation={{}}
        />
    );
};
