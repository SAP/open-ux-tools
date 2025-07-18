import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { render } from '../../utils';
import { Funnel } from '../../../../src/panels/properties/Funnel';
import { filterNodes } from '../../../../src/slice';

describe('Funnel', () => {
    test('initial load', () => {
        render(<Funnel />);
        const funnel = screen.getByRole('button');
        expect(funnel).toBeInTheDocument();

        fireEvent.click(funnel);

        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    test('on filter option click', () => {
        const { dispatch } = render(<Funnel />);
        const funnel = screen.getByRole('button');
        expect(funnel).toBeInTheDocument();

        fireEvent.click(funnel);
        const checkBox = screen.getByRole('checkbox');
        expect(checkBox).toBeInTheDocument();
        expect(checkBox).toBeChecked();

        checkBox?.click();
        expect(checkBox).not.toBeChecked();
        expect(dispatch).toBeCalled();
        expect(dispatch).toBeCalledWith(filterNodes([{ name: 'show-editable-properties' as any, value: false }]));
    });
});
