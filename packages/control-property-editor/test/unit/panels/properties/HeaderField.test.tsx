import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import React from 'react';
import type { HeaderFieldProps } from '../../../../src/panels/properties/HeaderField';
import { HeaderField } from '../../../../src/panels/properties/HeaderField';
import { initI18n } from '../../../../src/i18n';

describe('HeaderField', () => {
    beforeAll(() => {
        initI18n();
    });
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
});
