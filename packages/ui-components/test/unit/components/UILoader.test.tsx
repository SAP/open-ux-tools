import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UILoaderProps } from '../../../src/components/UILoader/UILoader';
import { UILoader } from '../../../src/components/UILoader/UILoader';
import { Overlay } from '@fluentui/react';

describe('<UILoader />', () => {
    let wrapper: Enzyme.ReactWrapper<UILoaderProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(<UILoader />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UILoader component', () => {
        expect(wrapper.find('.ms-Spinner-circle').length).toEqual(1);
        expect(wrapper.find(Overlay).length).toEqual(0);
    });

    it('Block DOM', () => {
        wrapper.setProps({
            blockDOM: true
        });
        expect(wrapper.find('div.ui-loader-blocker').length).toEqual(1);
        expect(wrapper.find(Overlay).length).toEqual(1);
    });

    describe('<UILoader />', () => {
        it('Property "delayed" with block', () => {
            wrapper.setProps({
                blockDOM: true,
                delayed: true
            });
            expect(wrapper.find('div.ui-loader--delayed').length).toEqual(1);
            expect(wrapper.find(Overlay).length).toEqual(1);
        });

        it('Property "delayed" without block', () => {
            wrapper.setProps({
                blockDOM: false,
                delayed: true
            });
            expect(wrapper.find('div.ui-loader--delayed').length).toEqual(0);
            expect(wrapper.find(Overlay).length).toEqual(0);
        });
    });
});
