import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { Input } from '../../../../src/components';
import type { InputProps } from '../../../../src/components';

const props: InputProps = {
    value: '',
    name: 'testInput',
    onChange: jest.fn(),
    required: undefined,
    additionalInfo: '',
    errorMessage: undefined,
    placeholder: undefined
};

describe('Input', () => {
    initIcons();

    it('Render input', () => {
        render(<Input {...props} />);
        expect(document.getElementsByClassName('ts-Input')).toBeDefined();
    });

    it('Render input with value', () => {
        render(<Input {...props} value="testValue" />);
        expect(screen.getByDisplayValue('testValue')).toBeDefined();
    });

    it('Test property onChange', () => {
        const onChangeFn = jest.fn();
        render(<Input {...props} onChange={onChangeFn} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenLastCalledWith('testInput', 'new value');
    });

    it('Test property required', () => {
        render(<Input {...props} required={true} />);
        expect(document.getElementsByClassName('is-required')).toBeDefined();
    });

    it('Test property additionalInfo', () => {
        render(<Input {...props} additionalInfo="testInfo" />);
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test property errorMessage', () => {
        render(<Input {...props} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test property placeholder', () => {
        render(<Input {...props} placeholder="testPlaceholder" />);
        expect(screen.getByPlaceholderText('testPlaceholder')).toBeDefined();
    });
});
