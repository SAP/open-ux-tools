import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Select, SelectProps } from '../../../../src/components';

const props: SelectProps = {
    name: 'select',
    value: '',
    onChange: jest.fn(),
    required: undefined,
    additionalInfo: '',
    errorMessage: undefined,
    placeholder: undefined,
    dependantPromptNames: [],
    options: [
        { key: 'testKey0', text: 'testText0', data: { value: 'testKey0' } },
        { key: 'testKey1', text: 'testText1', data: { value: 'testKey1' } }
    ],
    pending: false,
    type: 'list'
};

describe('Select', () => {
    initIcons();

    it('Render select', () => {
        render(<Select {...props} />);
        expect(document.getElementsByClassName('.ts-ComboBox')).toBeDefined();
    });

    it('Render filterBarId select', () => {
        render(<Select {...props} name="filterBarId" />);
        expect(document.getElementsByClassName('.ts-ComboBox')).toBeDefined();
    });

    it('Render filterBarId input', () => {
        render(<Select {...props} name="filterBarId" options={[]} />);
        expect(document.getElementsByClassName('.ts-Input')).toBeDefined();
    });

    it('Render select with value', () => {
        render(<Select {...props} value="testKey1" />);
        expect(screen.getByDisplayValue('testText1')).toBeDefined();
    });

    it('Test property options', () => {
        render(<Select {...props} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        expect(screen.queryAllByRole('option')).toHaveLength(2);
    });

    it('Test property onChange', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[0]);
        expect(onChangeFn).toHaveBeenCalled();
        expect(screen.getByDisplayValue('testText0')).toBeDefined();
    });

    it('Test property required', () => {
        render(<Select {...props} required={true} />);
        expect(document.getElementsByClassName('.is-required')).toBeDefined();
    });

    it('Test property additionalInfo', () => {
        render(<Select {...props} additionalInfo="testInfo" />);
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test property errorMessage', () => {
        render(<Select {...props} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test property placeholder', () => {
        render(<Select {...props} placeholder="testPlaceholder" />);
        expect(screen.getByPlaceholderText('testPlaceholder')).toBeDefined();
    });

    it('Test property pending', () => {
        render(<Select {...props} pending={true} />);
        expect(document.getElementsByClassName('ms-Spinner-circle')).toBeDefined();
    });

    it('Render filterBarId input', () => {
        render(<Select {...props} name="filterBarId" options={[]} />);
        expect(document.getElementsByClassName('.ts-Input')).toBeDefined();
    });

    it('Render filterBarId input with value', () => {
        render(<Select {...props} name="filterBarId" options={[]} value="testValue" />);
        expect(screen.getByDisplayValue('testValue')).toBeDefined();
    });

    it('Test filterBarId input property onChange', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} name="filterBarId" options={[]} onChange={onChangeFn} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalled();
    });

    it('Test filterBarId input property required', () => {
        render(<Select {...props} name="filterBarId" options={[]} required={true} />);
        expect(document.getElementsByClassName('.is-required')).toBeDefined();
    });

    it('Test filterBarId input property additionalInfo', () => {
        render(<Select {...props} name="filterBarId" options={[]} additionalInfo="testInfo" />);
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test filterBarId input property errorMessage', () => {
        render(<Select {...props} name="filterBarId" options={[]} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test filterBarId input property placeholder', () => {
        render(<Select {...props} name="filterBarId" options={[]} placeholder="testPlaceholder" />);
        expect(screen.getByPlaceholderText('Enter a new ID')).toBeDefined();
    });

    it('Test filterBarId input property pending', () => {
        render(<Select {...props} name="filterBarId" options={[]} pending={true} />);
        expect(document.getElementsByClassName('ms-Spinner-circle')).toBeDefined();
    });
});
