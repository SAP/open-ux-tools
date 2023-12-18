import React from 'react';
import { Questions } from '../src/components';
import type { Question } from '../src/components';

export default { title: 'Basic/Questions' };

const questions: Question[] = [
    {
        name: 'Dummy1',
        type: 'input'
    },
    {
        name: 'Dummy2',
        type: 'checkbox'
    },
    {
        name: 'Dummy3',
        type: 'list'
    }
];

export const defaultUsage = (): JSX.Element => {
    return <Questions questions={questions} />;
};
