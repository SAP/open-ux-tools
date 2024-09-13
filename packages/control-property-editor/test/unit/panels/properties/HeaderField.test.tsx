import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import React from 'react';
import type { HeaderFieldProps } from '../../../../src/panels/properties/HeaderField';
import { HeaderField } from '../../../../src/panels/properties/HeaderField';

describe('HeaderField', () => {
    const headerFieldProps: HeaderFieldProps = {
        label: 'testLabel',
        documentation: {} as any,
        value: 'testValue',
        hidden: false
    };

    const writeTextMock = jest.fn();
    Object.assign(global.navigator, {
        clipboard: {
            writeText: writeTextMock
        }
    });

    test('initial load', () => {
        render(<HeaderField {...headerFieldProps} />);
        const copyButton = screen.getByRole('button');
        expect(copyButton).toBeInTheDocument();

        fireEvent.click(copyButton);

        expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
        expect(writeTextMock).toBeCalled();
    });

    test('clipboard is updated after prop change', () => {
        const { rerender, debug } = render(<HeaderField {...headerFieldProps} />);

        const newHeaderFieldProps: HeaderFieldProps = {
            label: 'otherLabel',
            value: 'otherValue',
            hidden: false
        };
        rerender(<HeaderField {...newHeaderFieldProps} />);

        const copyButton = screen.getByRole('button');
        fireEvent.click(copyButton);

        expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
        expect(writeTextMock).toBeCalledWith('otherValue');
    });
});
