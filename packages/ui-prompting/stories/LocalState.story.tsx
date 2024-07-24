import React, { useState } from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';
import { Answers } from 'inquirer';

export default { title: 'Misc/Examples' };

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
    }
];

export const localState = (): JSX.Element => {
    const [saveValues] = useStorage();
    const [answers, setAnswers] = useState<Answers>({
        external: 'external value',
        externalWithoutQuestion: 'testValue'
    });
    return (
        <Questions
            questions={questions}
            answers={answers}
            onChange={(newAnswers) => {
                saveValues(newAnswers);
                setAnswers(newAnswers);
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
