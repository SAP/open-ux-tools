import * as React from 'react';
import { render } from '@testing-library/react';
import type { UILoaderProps } from '../../../src/components/UILoader/UILoader';
import { UILoader } from '../../../src/components/UILoader/UILoader';
import { Overlay } from '@fluentui/react';

describe('<UILoader />', () => {

    it('Should render a UILoader component', () => {
        const { container } = render(<UILoader />);
        expect(container.querySelector('.ms-Spinner-circle')).toBeInTheDocument();
        expect(container.querySelector('.ms-Overlay')).not.toBeInTheDocument();
    });

    it('Block DOM', () => {
        const { container } = render(<UILoader blockDOM={true} />);
        expect(container.querySelector('div.ui-loader-blocker')).toBeInTheDocument();
        expect(container.querySelector('.ms-Overlay')).toBeInTheDocument();
    });

    describe('<UILoader />', () => {
        it('Property "delayed" with block', () => {
            const { container } = render(<UILoader blockDOM={true} delayed={true} />);
            expect(container.querySelector('div.ui-loader--delayed')).toBeInTheDocument();
            expect(container.querySelector('.ms-Overlay')).toBeInTheDocument();
        });

        it('Property "delayed" without block', () => {
            const { container } = render(<UILoader blockDOM={false} delayed={true} />);
            expect(container.querySelector('div.ui-loader--delayed')).not.toBeInTheDocument();
            expect(container.querySelector('.ms-Overlay')).not.toBeInTheDocument();
        });
    });
});
