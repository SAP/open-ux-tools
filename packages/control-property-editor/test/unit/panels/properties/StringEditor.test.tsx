import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import React from 'react';
import { StringEditor } from '../../../../src/panels/properties/StringEditor';

describe('StringEditor', () => {
    const controlId = 'testControlId';

    test('initial load', () => {
        const value = 'testValue12345';
        const props: any = {
            icons: [],
            isIcon: false,
            isEnabled: false,
            name: 'testProperty',
            value
        };
        render(<StringEditor property={...props} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
    });
    test('render suffix', () => {
        const value = 'testValue12345';
        const props: any = {
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
            ],
            isEnabled: false,
            isIcon: true,
            name: 'testProperty',
            value
        };
        render(<StringEditor property={...props} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
    });

    test('integer value', () => {
        const value = '12345';
        const props: any = {
            icons: [],
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'integer'
        };

        render(<StringEditor property={...props} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.change(textBox, { target: { value: 'testName1' } });
        expect((textBox as any).value).toBe('1');
    });
    test('float value', () => {
        const value = '0.12345';
        const props: any = {
            icons: [],
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'float'
        };

        render(<StringEditor property={...props} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe(value);
        fireEvent.change(textBox, { target: { value: '5.3f04f.23' } });
        expect((textBox as any).value).toBe('5.30423');
    });

    test('float value onBlur', () => {
        const value = '5.300';
        const props: any = {
            icons: [],
            isEnabled: false,
            isIcon: false,
            name: 'testProperty',
            value,
            type: 'float'
        };

        render(<StringEditor property={...props} controlId={controlId} />);

        const textBox = screen.getByDisplayValue(value);
        expect(textBox).toBeInTheDocument();
        expect((textBox as any).value).toBe('5.300');
        fireEvent.blur(textBox);
        expect((textBox as any).value).toBe('5.3');
    });
});
