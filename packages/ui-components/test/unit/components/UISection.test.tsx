import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UISectionProps } from '../../../src/components/UISection/UISection';
import { UISection, UISectionLayout } from '../../../src/components/UISection/UISection';

describe('<Section />', () => {
    let wrapper: Enzyme.ReactWrapper<UISectionProps>;

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    it('Should render a Shell component', () => {
        expect(wrapper.exists()).toEqual(true);
        expect(wrapper.find('.section').length).toEqual(1);
    });

    it('Test "height" property', () => {
        const height = '500px';
        wrapper.setProps({
            height
        });
        const dom: HTMLElement = wrapper.getDOMNode();
        expect(dom.style.height).toEqual(height);
    });

    it('Test "className" property', () => {
        const className = 'dummyClass';
        wrapper.setProps({
            className
        });
        expect(wrapper.find('.' + className).length).toBeGreaterThan(0);
    });

    it('Test "title" property', () => {
        const title = 'dummy title';
        wrapper.setProps({
            title
        });
        expect(wrapper.find('.section__header__title').text()).toEqual(title);
    });

    it('Test "collapsible" property', () => {
        wrapper.setProps({
            layout: UISectionLayout.Extended
        });
        expect(wrapper.find('.section--extended').length).toEqual(1);
    });

    it('Test "onScroll" event', () => {
        const onScroll = jest.fn();
        wrapper.setProps({
            onScroll
        });
        expect(wrapper.find('.section__body').length).toEqual(1);
        wrapper.find('.section__body').simulate('scroll', {});
        // Check result
        expect(onScroll).toBeCalledTimes(1);
    });

    it('Test "hidden" property', () => {
        expect(wrapper.find('.section--hidden').length).toEqual(0);
        wrapper.setProps({
            hidden: true
        });
        expect(wrapper.find('.section--hidden').length).toEqual(1);
    });
});
