import React from 'react';
import { Questions } from '../src/components';
import type { IQuestion } from '../src/components';
import { initIcons } from '@sap-ux/ui-components';

export default { title: 'Basic/Questions' };

initIcons();

const questions: IQuestion[] = [
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
        type: 'list',
        choices: [
            {
                name: 'test1',
                value: 'test1'
            },
            {
                name: 'test2',
                value: 'test2'
            }
        ]
    }
] as any;
// const questions: IQuestion[] = [
//     {
//         name: 'Dummy1',
//         type: 'input'
//     },
//     {
//         name: 'Dummy2',
//         type: 'checkbox'
//     },
//     {
//         name: 'Dummy3',
//         type: 'list',
//         choices: [
//             {
//                 name: 'test1',
//                 value: 'test1'
//             },
//             {
//                 name: 'test2',
//                 value: 'test2'
//             }
//         ]
//     }
// ];

export const defaultUsage = (): JSX.Element => {
    return (
        <Questions
            questions={questions}
            answers={{}}
            choices={{}}
            onChange={() => {}}
            onChoiceRequest={() => {}}
            validation={{}}
        />
    );
};
