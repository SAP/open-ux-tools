import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { UiIcons, initIcons } from '../../../../src/components';
import type { UIFormattedTextProps } from '../../../../src/components/UITranslationInput/UIFormattedText';
import { UIFormattedText, formatText } from '../../../../src/components/UITranslationInput/UIFormattedText';

describe('<UIMessageText />', () => {
    initIcons();

    const values = {
        key: 'testKey',
        value: 'testValue',
        dummy: 'dummy'
    };
    const testCases = [
        {
            name: 'No key and matches',
            text: 'dummy test',
            values: values,
            expectedResult: 'dummy test'
        },
        {
            name: 'Single match',
            text: 'dummy {{{value}}} test',
            values: values,
            expectedResult: 'dummy testValue test'
        },
        {
            name: 'Multiple matches 1',
            text: 'dummy {{{value}}} test {{{key}}}',
            values: values,
            expectedResult: 'dummy testValue test testKey'
        },
        {
            name: 'Multiple matches 2',
            text: 'My {{{key}}} dummy {{{value}}} test {{{dummy}}} scenario with multiple {{{value}}} matches',
            values: values,
            expectedResult: 'My testKey dummy testValue test dummy scenario with multiple testValue matches'
        },
        {
            name: 'No matches',
            text: 'dummy {{{unknown}}} test',
            values: values,
            expectedResult: 'dummy {{{unknown}}} test'
        }
    ];
    describe('UIMessageText component', () => {
        test.each(testCases)('$name', ({ text, values }) => {
            const { container } = render(<UIFormattedText values={values}>{text}</UIFormattedText>);
            expect(container.querySelector('div')?.innerHTML).toMatchSnapshot();
        });
    });

    describe('formatText', () => {
        test.each(testCases)('$name', ({ text, values, expectedResult }) => {
            const result = formatText(text, values);
            expect(result).toEqual(expectedResult);
        });
    });
});
