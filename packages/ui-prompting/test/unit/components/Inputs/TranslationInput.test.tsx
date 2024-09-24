import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';
import { TranslationInput } from '../../../../src/components';
import type { InputProps } from '../../../../src/components';

const props: InputProps = {
    value: '',
    name: 'testInput',
    onChange: jest.fn(),
    guiOptions: {
        mandatory: undefined,
        hint: '',
        placeholder: undefined
    },
    errorMessage: undefined
};

describe('TranslationInput', () => {
    initIcons();

    it('Render translation input', () => {
        render(<TranslationInput {...props} />);
        expect(document.getElementsByClassName('ts-Input')).toBeDefined();
    });

    it('Render translation input with value', () => {
        render(<TranslationInput {...props} value="testValue" />);
        expect(screen.getByDisplayValue('testValue')).toBeDefined();
    });

    it('Test property "id"', async () => {
        render(<TranslationInput {...props} id="test-id" />);
        expect(document.getElementById('test-id')).not.toBeNull();
    });

    it('Test property "onChange"', () => {
        const onChangeFn = jest.fn();
        render(<TranslationInput {...props} onChange={onChangeFn} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDefined();
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(onChangeFn).toHaveBeenCalled();
        expect(onChangeFn).toHaveBeenLastCalledWith('testInput', 'new value');
    });

    it('Test property "required"', () => {
        render(
            <TranslationInput
                {...props}
                guiOptions={{
                    mandatory: true
                }}
            />
        );
        expect(document.getElementsByClassName('is-required')).toBeDefined();
    });

    it('Test property "description"', () => {
        render(
            <TranslationInput
                {...props}
                guiOptions={{
                    hint: 'testInfo'
                }}
            />
        );
        expect(screen.getByTitle('testInfo')).toBeDefined();
    });

    it('Test property "errorMessage"', () => {
        render(<TranslationInput {...props} errorMessage="testErrorMessage" />);
        expect(screen.getByRole('alert')).toBeDefined();
    });

    it('Test property "placeholder"', () => {
        render(
            <TranslationInput
                {...props}
                guiOptions={{
                    placeholder: 'testPlaceholder'
                }}
            />
        );
        expect(screen.getByPlaceholderText('testPlaceholder')).toBeDefined();
    });
});
