import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Questions } from '../../../src/components';
import { PromptQuestion } from '../../../src/types';

describe('Questions', () => {
    initIcons();

    it('Render questions', async () => {
        render(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={jest.fn()}
                questions={[
                    {
                        type: 'input',
                        name: 'testInput'
                    },
                    {
                        type: 'checkbox',
                        name: 'testCheckbox'
                    }
                ]}
            />
        );
        expect(screen.getByText('testInput')).toBeDefined();
        expect(screen.getByText('testCheckbox')).toBeDefined();
    });

    it('Dynamic questions', async () => {
        const onChoiceRequest = jest.fn();
        const dynamicQuestion1: PromptQuestion = {
            type: 'list',
            name: 'test1',
            selectType: 'dynamic'
        };
        const dynamicQuestion2 = {
            ...dynamicQuestion1,
            name: 'test2'
        };
        const dynamicQuestion3 = {
            ...dynamicQuestion1,
            name: 'test3'
        };

        const { rerender } = render(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={onChoiceRequest}
                questions={[dynamicQuestion1, dynamicQuestion2]}
            />
        );
        // Render with initial questions
        expect(onChoiceRequest).toBeCalledTimes(1);
        expect(onChoiceRequest).toBeCalledWith(['test1', 'test2'], {});
        onChoiceRequest.mockReset();
        // Rereneder with same questions, but with new reference
        rerender(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={onChoiceRequest}
                questions={[dynamicQuestion2, dynamicQuestion1]}
            />
        );
        expect(onChoiceRequest).toBeCalledTimes(0);
        // Rereneder with new question
        rerender(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={onChoiceRequest}
                questions={[dynamicQuestion1, dynamicQuestion2, dynamicQuestion3]}
            />
        );
        expect(onChoiceRequest).toBeCalledTimes(1);
        expect(onChoiceRequest).toBeCalledWith(['test1', 'test2', 'test3'], {});
    });

    it('Render filterBarId - input or select', async () => {
        // no choices available
        render(
            <Questions
                answers={{}}
                choices={{}}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={jest.fn()}
                questions={[
                    {
                        type: 'list',
                        selectType: 'static',
                        name: 'filterBarId',
                        message: 'Filter Bar Id'
                    }
                ]}
            />
        );
        const inputField = screen.getByLabelText('Filter Bar Id');
        expect(inputField).toBeDefined();
        expect(inputField.classList).toContain('ms-TextField-field');
        expect(inputField.classList).not.toContain('ms-ComboBox-Input');

        // choices available
        render(
            <Questions
                answers={{}}
                choices={{ filterBarId: [{ name: 'one', value: 'one' }] }}
                validation={{}}
                onChange={jest.fn()}
                onChoiceRequest={jest.fn()}
                questions={[
                    {
                        type: 'list',
                        selectType: 'static',
                        name: 'filterBarId',
                        message: 'Filter Bar Id 2'
                    }
                ]}
            />
        );
        const comboBox = screen.getByLabelText('Filter Bar Id 2');
        expect(comboBox).toBeDefined();
        expect(comboBox.classList).not.toContain('ms-TextField-field');
        expect(comboBox.classList).toContain('ms-ComboBox-Input');
    });
});
