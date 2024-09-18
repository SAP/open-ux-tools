import React from 'react';
import { screen, fireEvent } from '@testing-library/react';

import type {
    FloatControlProperty,
    IntegerControlProperty,
    StringControlProperty,
    StringControlPropertyWithOptions
} from '@sap-ux-private/control-property-editor-common';

import { render } from '../../utils';
import type { PropertyInputProps } from '../../../../src/panels/properties/types';
import { StringEditor } from '../../../../src/panels/properties/StringEditor';

describe('StringEditor', () => {
    const controlId = 'testControlId';

    test('initial load', () => {
        const value = 'testValue12345';
        const property: StringControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            type: 'string',
            isIcon: false,
            isEnabled: false,
            name: 'testProperty',
            value
        };
        render(<StringEditor controlName="testControl" property={property} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
    });
    test('render suffix', () => {
        const value = 'testValue12345';
        const props: StringControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            type: 'string',
            isEnabled: true,
            isIcon: true,
            name: 'testProperty',
            value
        };
        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />, {
            initialState: {
                icons: [
                    {
                        content: 'testData2',
                        fontFamily: 'SAP-fontFamily',
                        name: 'testName2'
                    },
                    {
                        content: 'testData3',
                        fontFamily: 'SAP-fontFamily',
                        name: 'testName3'
                    }
                ]
            }
        });

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();

        const valueHelpButton = screen.getByTitle('Select Icon');
        expect(valueHelpButton).toBeInTheDocument();
    });

    test('integer value', () => {
        const value = '12345';
        const props: IntegerControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: true,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'integer'
        };

        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.change(textBox, { target: { value: 'testName1' } });
        expect((textBox as any).value).toBe('1');
    });
    test('integer value onBlur', () => {
        const value = '1234';
        const props: IntegerControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'integer'
        };

        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.change(textBox, { target: { value: '12345' } });
        fireEvent.blur(textBox);
        expect((textBox as any).value).toBe('12345');
    });

    test('Do not trigger changeProperty when no change in prop value', () => {
        const value = '1234';
        const props: IntegerControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'integer'
        };
        const { dispatch } = render(
            <StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />
        );

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.blur(textBox);
        expect(dispatch).toBeCalledTimes(0);
    });

    test('integer value onPress "Enter"', () => {
        const value = '1234';
        const props: IntegerControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'integer'
        };

        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.change(textBox, { target: { value: '12345' } });
        fireEvent.keyPress(textBox, { key: 'Enter', code: 'Enter', charCode: 13 });
        expect((textBox as any).value).toBe('12345');
    });

    test('float value', () => {
        const value = '0.12345';
        const props: FloatControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'float'
        };

        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.change(textBox, { target: { value: '5.3f04f.23' } });
        expect((textBox as any).value).toBe('5.30423');
    });
    test('float value onBlur', () => {
        const value = '5.300';
        const props: FloatControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'float'
        };

        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe('5.300');
        fireEvent.blur(textBox);
        expect((textBox as any).value).toBe('5.300');
    });
    test('float value onPress "Enter"', () => {
        const value = '5.300';
        const props: FloatControlProperty = {
            editor: 'input',
            readableName: 'Test Property',
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'float'
        };

        render(<StringEditor controlName="testControl" property={{ ...props }} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe('5.300');
        fireEvent.keyPress(textBox, { key: 'Enter', code: 'Enter', charCode: 13 });
        expect((textBox as any).value).toBe('5.300');
    });
});
