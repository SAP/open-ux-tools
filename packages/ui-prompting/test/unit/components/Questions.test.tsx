import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Questions } from '../../../src/components';
import { PromptsLayoutType } from '../../../src/types';
import { QuestionsProps } from '../../../dist';
import { questions } from '../../mock-data/questions';

describe('Questions', () => {
    initIcons();

    const props: QuestionsProps = {
        questions: [],
        answers: {},
        choices: {},
        validation: {},
        onChoiceRequest: jest.fn(),
        onChange: jest.fn(),
        layoutType: undefined,
        groups: [],
        showDescriptions: undefined
    };

    it('Render questions component - empty question array, SingleColumn layout', async () => {
        render(<Questions {...props} layoutType={undefined} />);
        expect(document.getElementsByClassName('prompt-entries')).toBeDefined();
        expect(document.getElementsByClassName('prompt-entries-wrapper-single')[0]).toBeDefined();
    });

    it('Render questions component - 4 items question array, 2 groups, MultipleColumn layout with description', async () => {
        render(
            <Questions
                {...props}
                layoutType={PromptsLayoutType.MultiColumn}
                questions={Object.values(questions)}
                showDescriptions={true}
                groups={[
                    { title: 'group0', id: 'group0', description: ['description0'] },
                    { title: 'group1', id: 'group1', description: ['description1'] }
                ]}
            />
        );
        expect(document.getElementsByClassName('prompt-entry')).toHaveLength(4);
        expect(document.getElementsByClassName('prompts-group')).toHaveLength(2);
        expect(screen.getByText('description0')).toBeDefined();
        expect(document.getElementsByClassName('prompt-entries-wrapper-multi')[0]).toBeDefined();
    });

    it('Render questions component - onChoiceRequest', async () => {
        const onChoiceRequestFn = jest.fn();
        render(
            <Questions
                {...props}
                layoutType={undefined}
                questions={[questions.dynamicList]}
                onChoiceRequest={onChoiceRequestFn}
            />
        );
        expect(onChoiceRequestFn).toHaveBeenCalled();
    });

    it('Render questions component - onChange', async () => {
        const onChangeFn = jest.fn();
        render(<Questions {...props} layoutType={undefined} questions={[questions.input]} onChange={onChangeFn} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalledWith({ 'testInput': 'new value' }, 'testInput', 'new value');
    });

    it('Render questions component - validation', async () => {
        const { rerender } = render(
            <Questions {...props} layoutType={undefined} questions={Object.values(questions)} />
        );
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
        rerender(
            <Questions
                {...props}
                layoutType={undefined}
                questions={Object.values(questions)}
                validation={{
                    testInput: { isValid: false, errorMessage: 'validation failure' },
                    testStaticList: { isValid: false, errorMessage: 'validation failure' },
                    testDynamicList: { isValid: false, errorMessage: 'validation failure' },
                    testCheckbox: { isValid: false, errorMessage: 'validation failure' }
                }}
            />
        );
        expect(screen.queryAllByRole('alert')).toHaveLength(4);
    });

    it('Render questions component - answers and choices', async () => {
        render(
            <Questions
                {...props}
                layoutType={undefined}
                questions={Object.values(questions)}
                answers={{
                    testInput: 'testName0',
                    testStaticList: 'testValue0',
                    testDynamicList: 'testValue0',
                    testCheckbox: 'testValue0'
                }}
                choices={{
                    testStaticList: [{ name: 'testName0', value: 'testValue0' }],
                    testDynamicList: [{ name: 'testName0', value: 'testValue0' }],
                    testCheckbox: [{ name: 'testName0', value: 'testValue0' }]
                }}
            />
        );
        expect(screen.queryAllByDisplayValue('testName0')).toHaveLength(4);
    });
});
