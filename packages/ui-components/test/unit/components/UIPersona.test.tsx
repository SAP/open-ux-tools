import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import { UIPersona, UIPersonaSize } from '../../../src/components/UIPersona';

describe('<UIPersona />', () => {
    let renderResult: ReturnType<typeof render>;

    beforeEach(() => {
        renderResult = render(<UIPersona text="John Doe" size={UIPersonaSize.size72} />);
    });

    afterEach(() => {
        renderResult.unmount();
    });

    it('Should render a UIPersona component', () => {
        const { container } = renderResult;
        expect(container.querySelector('.ms-Persona')).toBeTruthy();
        expect(container.querySelectorAll('.ms-Persona--size72').length).toEqual(2);
    });
});
