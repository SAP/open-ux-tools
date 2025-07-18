import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { UISeparatorProps } from '../../../src/components/UISeparator';
import { UISeparator } from '../../../src/components/UISeparator';

describe('<UISeparator />', () => {
    let renderResult: ReturnType<typeof render>;
    let container: HTMLElement;

    beforeEach(() => {
        renderResult = render(<UISeparator />);
        container = renderResult.container;
    });

    afterEach(() => {
        if (renderResult) {
            renderResult.unmount();
        }
    });

    it('Should render a UISeparator component', () => {
        expect(container.querySelectorAll('[role="separator"]').length).toEqual(1);
    });
});
