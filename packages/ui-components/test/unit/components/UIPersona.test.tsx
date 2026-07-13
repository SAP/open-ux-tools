import * as React from 'react';
import { render } from '@testing-library/react';
import { UIPersona, UIPersonaSize } from '../../../src/components/UIPersona';

describe('<UIPersona />', () => {
    it('Should render a UIPersona component', () => {
        const { container } = render(<UIPersona text="John Doe" size={UIPersonaSize.size72} />);
        expect(container.querySelectorAll('.ms-Persona').length).toEqual(1);
        expect(container.querySelectorAll('.ms-Persona--size72').length).toEqual(2);
    });
});
