import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Input, MultiSelect, MultiSelectProps, Select, SelectProps } from '../../../src/components';
import { inputs } from '../../mock-data/questions';
import { PromptQuestion } from '../../../src/types';

const renderInput = (input: PromptQuestion) => {
    if (input.type === 'input') {
        render(<Input {...input} />);
    } else if (input.type === 'checkbox') {
        render(<MultiSelect {...(input as MultiSelectProps)} />);
    } else if (input.type === 'list') {
        render(<Select {...(input as SelectProps)} />);
    }
};

describe('Inputs', () => {
    initIcons();

    for (const input of inputs) {
        it(`Render ${input.name}`, () => {
            let inputField: HTMLElement;
            renderInput(input);
            inputField = screen.getByPlaceholderText(input.placeholder || '');
            expect(inputField).toBeDefined();
            if (input.name === 'filterBarId') {
                if ((input as SelectProps).options?.length) {
                    expect(inputField.classList).toContain('ms-ComboBox-Input');
                } else {
                    expect(inputField.classList).toContain('ms-TextField-field');
                }
            }
        });
    }
});
