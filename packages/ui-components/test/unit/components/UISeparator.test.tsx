import * as React from 'react';
import { render } from '@testing-library/react';

import type { UISeparatorProps } from '../../../src/components/UISeparator';
import { UISeparator } from '../../../src/components/UISeparator';

describe('<UISeparator />', () => {
    it('Should render a UISeparator component', () => {
        const { getAllByRole } = render(<UISeparator />);
        expect(getAllByRole('separator').length).toEqual(1);
    });
});
