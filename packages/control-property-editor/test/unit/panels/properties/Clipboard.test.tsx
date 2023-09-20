import { screen } from '@testing-library/react';
import { render } from '../../utils';
import React from 'react';
import type { ClipboardProps } from '../../../../src/panels/properties/Clipboard';
import { Clipboard } from '../../../../src/panels/properties/Clipboard';

describe('Clipboard', () => {
    const clipboardProps: ClipboardProps = {
        label: 'testLabel'
    };

    test('initial load', () => {
        render(<Clipboard {...clipboardProps} />);

        expect(screen.getByTestId('copied-to-clipboard-popup')).toBeInTheDocument();
        expect(screen.getByTestId('copied-to-clipboard-message')).toBeInTheDocument();
    });
});
