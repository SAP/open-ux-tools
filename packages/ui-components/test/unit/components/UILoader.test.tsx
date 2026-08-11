import * as React from 'react';
import { render } from '@testing-library/react';
import type { UILoaderProps } from '../../../src/components/UILoader/UILoader';
import { UILoader } from '../../../src/components/UILoader/UILoader';

describe('<UILoader />', () => {
    const renderLoader = (props: UILoaderProps = {}) => render(<UILoader {...props} />);

    it('Should render a UILoader component', () => {
        const { container } = renderLoader();
        expect(container.firstChild).toBeTruthy();
    });

    it('Block DOM', () => {
        const { container } = renderLoader({ blockDOM: true });
        expect(container.querySelectorAll('div.ui-loader-blocker')).toHaveLength(1);
    });

    it('Property "delayed" with block', () => {
        const { container } = renderLoader({ blockDOM: true, delayed: true });
        expect(container.querySelectorAll('div.ui-loader--delayed')).toHaveLength(1);
    });

    it('Property "delayed" without block', () => {
        const { container } = renderLoader({ blockDOM: false, delayed: true });
        expect(container.querySelectorAll('div.ui-loader--delayed')).toHaveLength(0);
    });
});
