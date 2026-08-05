import * as React from 'react';
import { render } from '@testing-library/react';
import { UIPersona, UIPersonaSize } from '../../../src/components/UIPersona';

describe('<UIPersona />', () => {
    it('Should render a UIPersona component', () => {
        const { getAllByText } = render(<UIPersona text="John Doe" size={UIPersonaSize.size72} />);
        expect(getAllByText('John Doe').length).toBeGreaterThan(0);
    });

    it('Should forward size prop to Persona', () => {
        const { container: large } = render(<UIPersona text="John Doe" size={UIPersonaSize.size72} />);
        const { container: small } = render(<UIPersona text="John Doe" size={UIPersonaSize.size32} />);
        expect(large.innerHTML).not.toEqual(small.innerHTML);
    });
});
