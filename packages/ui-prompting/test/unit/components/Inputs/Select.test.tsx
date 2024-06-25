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

    it('Render creatable select', () => {
        render(<Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} />);
        expect(document.getElementsByClassName('.ts-ComboBox')).toBeDefined();
    });

    it('Render creatable input', () => {
        render(<Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} options={[]} />);
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
        expect(onChangeFn).toHaveBeenCalledWith('select', 'testKey0');
        expect(screen.getByDisplayValue('testText0')).toBeDefined();
    });

    it('Test property onChange - boolean', () => {
        const onChangeFn = jest.fn();
        render(
            <Select
                {...props}
                onChange={onChangeFn}
                options={[
                    { text: 'False', key: 'false', data: { value: false } },
                    { text: 'True', key: 'true', data: { value: true } }
                ]}
            />
        );
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[0]);
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('select', false);
        expect(screen.getByDisplayValue('False')).toBeDefined();
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

    it('Render creatable input', () => {
        render(<Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} options={[]} />);
        expect(document.getElementsByClassName('.ts-Input')).toBeDefined();
    });

    it('Render creatable input with value', () => {
        render(
            <Select
                {...props}
                creation={{ inputPlaceholder: 'test input placeholder' }}
                options={[]}
                value="testValue"
            />
        );
        expect(screen.getByDisplayValue('testValue')).toBeDefined();
    });

    it('Test allowCreate property onChange - no options', () => {
        const onChangeFn = jest.fn();
        render(
            <Select
                {...props}
                creation={{ inputPlaceholder: 'test input placeholder' }}
                options={[]}
                onChange={onChangeFn}
            />
        );
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('select', 'new value');
    });

    it('Test allowCreate property onChange - select one of options', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        expect(options[0]).toBeDefined();
        fireEvent.click(options[0]);
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('select', 'testKey0');
        expect(screen.getByDisplayValue('testKey0')).toBeDefined();
    });

    it.skip('Test allowCreate property onChange - options available but enter a new value', () => {
        const onChangeFn = jest.fn();
        render(<Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(screen.getByDisplayValue('new value')).toBeDefined();
        expect(onChangeFn).toHaveBeenCalled();
    });

    it('Test creatable input property required', () => {
        render(
            <Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} options={[]} required={true} />
        );
        expect(document.getElementsByClassName('.is-required')).toBeDefined();
    });

    it('Test creatable input property additionalInfo', () => {
        render(
            <Select
                {...props}
                creation={{ inputPlaceholder: 'test input placeholder' }}
                options={[]}
                additionalInfo="testInfo"
            />
        );
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test creatable input property errorMessage', () => {
        render(
            <Select
                {...props}
                creation={{ inputPlaceholder: 'test input placeholder' }}
                options={[]}
                errorMessage="testErrorMessage"
            />
        );
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test creatable input property placeholder', () => {
        render(
            <Select
                {...props}
                creation={{ inputPlaceholder: 'test input placeholder' }}
                options={[]}
                placeholder="testPlaceholder"
            />
        );
        expect(screen.getByPlaceholderText('test input placeholder')).toBeDefined();
    });

    it('Test creatable input property pending', () => {
        render(
            <Select {...props} creation={{ inputPlaceholder: 'test input placeholder' }} options={[]} pending={true} />
        );
        expect(document.getElementsByClassName('ms-Spinner-circle')).toBeDefined();
    });
});
