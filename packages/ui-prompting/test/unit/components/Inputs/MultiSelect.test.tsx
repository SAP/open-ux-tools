import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import type { MultiSelectProps } from '../../../../src/components';
import { MultiSelect } from '../../../../src/components';

const props: MultiSelectProps = {
    value: '',
    name: 'testList',
    onChange: jest.fn(),
    guiOptions: {
        mandatory: undefined,
        hint: '',
        placeholder: undefined
    },
    errorMessage: undefined,
    type: 'checkbox',
    choices: [
        { name: 'testText0', value: 'testValue0' },
        { name: 'testText1', value: 'testValue1' }
    ],
    pending: false
};

describe('MultiSelect', () => {
    initIcons();

    it('Render multiselect', () => {
        render(<MultiSelect {...props} />);
        expect(document.getElementsByClassName('.ts-ComboBox')).toBeDefined();
    });

    it('Test property "id"', async () => {
        render(<MultiSelect {...props} id="test-id" />);
        expect(document.getElementById('test-id')).not.toBeNull();
    });

    it('Render multiselect with value', () => {
        render(<MultiSelect {...props} value="testValue1" />);
        expect(screen.getByDisplayValue('testText1')).toBeDefined();
    });

    it('Test property options', () => {
        render(<MultiSelect {...props} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        expect(screen.queryAllByRole('option')).toHaveLength(2);
    });

    it('Test property onChange', () => {
        const onChangeFn = jest.fn();
        render(<MultiSelect {...props} onChange={onChangeFn} />);
        const input = screen.getByRole('combobox');
        expect(input).toBeDefined();
        const button = document.getElementsByClassName('ms-Button')[0];
        fireEvent.click(button);
        const options = screen.queryAllByRole('option');
        // select 1st item
        fireEvent.click(options[0]);
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenCalledWith('testList', 'testValue0');
        expect(screen.getByPlaceholderText('testText0')).toBeDefined();
        // select 2nd item
        fireEvent.click(options[1]);
        expect(onChangeFn).toHaveBeenCalledTimes(2);
        expect(onChangeFn).toHaveBeenCalledWith('testList', 'testValue0,testValue1');
        expect(screen.getByPlaceholderText('testText0, testText1')).toBeDefined();
        // deselect 2nd item
        fireEvent.click(options[1]);
        expect(onChangeFn).toHaveBeenCalledTimes(3);
        expect(onChangeFn).toHaveBeenCalledWith('testList', 'testValue0');
        fireEvent.click(button);
        expect(screen.getByPlaceholderText('testText0')).toBeDefined();
    });

    it('Test value reset', () => {
        const { rerender } = render(<MultiSelect {...props} value={'testValue0,testValue1'} />);
        let input = screen.getByRole('combobox');
        expect(input.getAttribute('value')).toEqual('testText0, testText1');
        rerender(<MultiSelect {...props} value={undefined} />);
        input = screen.getByRole('combobox');
        expect(input.getAttribute('value')).toEqual('');
    });

    it('Test property required', () => {
        render(
            <MultiSelect
                {...props}
                guiOptions={{
                    mandatory: true
                }}
            />
        );
        expect(document.getElementsByClassName('.is-required')).toBeDefined();
    });

    it('Test property description', () => {
        render(
            <MultiSelect
                {...props}
                guiOptions={{
                    hint: 'testInfo'
                }}
            />
        );
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test property errorMessage', () => {
        render(<MultiSelect {...props} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
        expect(screen.getByText('testErrorMessage')).toBeDefined();
    });

    it('Test property placeholder', () => {
        render(
            <MultiSelect
                {...props}
                guiOptions={{
                    placeholder: 'testPlaceholder'
                }}
            />
        );
        expect(screen.getByPlaceholderText('testPlaceholder')).toBeDefined();
    });

    it('Test property pending', () => {
        const { container } = render(<MultiSelect {...props} pending={true} />);
        expect(container.getElementsByClassName('ms-Spinner-circle')).toBeDefined();
    });
});
