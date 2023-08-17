import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../utils';
import React from 'react';
import { Funnel } from '../../../../../src/app/panels/properties/Funnel';

describe('Funnel', () => {
    test('initial load', () => {
        render(<Funnel />);
        const funnel = screen.getByRole('button');
        expect(funnel).toBeInTheDocument();

        fireEvent.click(funnel);

        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
});
