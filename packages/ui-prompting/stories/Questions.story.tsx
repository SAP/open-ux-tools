import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';

export default { title: 'Misc/Examples' };

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

const objectBasedQuestions: PromptQuestion[] = [
    {
        message: 'test -> dummy(with dependants)',
        name: 'test.dummy',
        type: 'list',
        choices,
        guiOptions: {
            dependantPromptNames: ['test.dummy2', 'test2.dummy', 'test3', 'test4.child.dummy']
        }
    },
    {
        message: 'test -> dummy2',
        name: 'test.dummy2',
        type: 'checkbox',
        choices
    },
    {
        message: 'test2 -> dummy(default value)',
        name: 'test2.dummy',
        type: 'input',
        default: 'Default value'
    },
    {
        message: 'test3',
        name: 'test3',
        type: 'input'
    },
    {
        message: 'test4 -> child -> dummy(external value)',
        name: 'test4.child.dummy',
        type: 'input'
    }
];
export const ObjectBasedQuestions = (): JSX.Element => {
    const [saveValues] = useStorage();
    return (
        <Questions
            questions={objectBasedQuestions}
            answers={{
                test4: {
                    externalWithoutQuestion: 'Dummy',
                    child: {
                        dummy: 'External value'
                    }
                }
            }}
            choices={{}}
            onChange={(answers) => {
                saveValues(answers);
            }}
            onChoiceRequest={() => {}}
            validation={{}}
        />
    );
};
