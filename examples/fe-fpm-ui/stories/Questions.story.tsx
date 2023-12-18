import React from 'react';
import { Questions } from '../src/components';
import type { Question } from '../src/components';

export default { title: 'Basic/Questions' };

const questions: Question[] = [
    {
        type: 'input'
    },
    {
        type: 'input'
    },
    {
        type: 'checkbox'
    },
    {
        type: 'input'
    },
    {
        type: 'list'
    }
];

export const defaultUsage = (): JSX.Element => {
    return <Questions questions={questions} />;
};
