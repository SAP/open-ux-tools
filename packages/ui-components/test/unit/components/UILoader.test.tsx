import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import type { UILoaderProps } from '../../../src/components/UILoader/UILoader';
import { UILoader } from '../../../src/components/UILoader/UILoader';

describe('<UILoader />', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        unmountComponentAtNode(container);
        container.remove();
    });

    const renderLoader = (props: UILoaderProps = {}): void => {
        act(() => {
            render(<UILoader {...props} />, container);
        });
    };

    it('Should render a UILoader component', () => {
        renderLoader();
        expect(container.querySelectorAll('.ms-Spinner-circle')).toHaveLength(1);
        expect(container.querySelectorAll('.ms-Overlay')).toHaveLength(0);
    });

    it('Block DOM', () => {
        renderLoader({ blockDOM: true });
        expect(container.querySelectorAll('div.ui-loader-blocker')).toHaveLength(1);
        expect(container.querySelectorAll('.ms-Overlay')).toHaveLength(1);
    });

    describe('<UILoader />', () => {
        it('Property "delayed" with block', () => {
            renderLoader({ blockDOM: true, delayed: true });
            expect(container.querySelectorAll('div.ui-loader--delayed')).toHaveLength(1);
            expect(container.querySelectorAll('.ms-Overlay')).toHaveLength(1);
        });

        it('Property "delayed" without block', () => {
            renderLoader({ blockDOM: false, delayed: true });
            expect(container.querySelectorAll('div.ui-loader--delayed')).toHaveLength(0);
            expect(container.querySelectorAll('.ms-Overlay')).toHaveLength(0);
        });
    });
});
