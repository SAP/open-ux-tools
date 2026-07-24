import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UISection, UISectionLayout } from '../../../src/components/UISection/UISection';

describe('<Section />', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a Shell component', () => {
        const { container } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelector('.section')).not.toBeNull();
        expect(container.querySelectorAll('.section')).toHaveLength(1);
    });

    it('Test "height" property', () => {
        const height = '500px';
        const { container, rerender } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        rerender(
            <UISection height={height}>
                <div>Dummy Content</div>
            </UISection>
        );
        const section = container.querySelector('.section') as HTMLElement;
        expect(section.style.height).toEqual(height);
    });

    it('Test "className" property', () => {
        const className = 'dummyClass';
        const { container, rerender } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        rerender(
            <UISection className={className}>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelectorAll('.' + className).length).toBeGreaterThan(0);
    });

    it('Test "title" property', () => {
        const title = 'dummy title';
        const { container, rerender } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        rerender(
            <UISection title={title}>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelector('.section__header__title')?.textContent).toEqual(title);
    });

    it('Test "collapsible" property', () => {
        const { container, rerender } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        rerender(
            <UISection layout={UISectionLayout.Extended}>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelectorAll('.section--extended')).toHaveLength(1);
    });

    it('Test "onScroll" event', () => {
        const onScroll = jest.fn();
        const { container, rerender } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        rerender(
            <UISection onScroll={onScroll} className="aaaa" collapsible={true}>
                <div>Dummy Content</div>
            </UISection>
        );
        const body = container.querySelector('.section__body') as HTMLElement;
        expect(body).not.toBeNull();
        fireEvent.scroll(body);
        expect(onScroll).toHaveBeenCalledTimes(1);
    });

    it('Test "hidden" property', () => {
        const { container, rerender } = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelectorAll('.section--hidden')).toHaveLength(0);
        rerender(
            <UISection hidden={true}>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelectorAll('.section--hidden')).toHaveLength(1);
    });

    it('Test data property', () => {
        const testValue = 'test value';
        const { container } = render(
            <UISection data-test={testValue}>
                <div>Dummy Content</div>
            </UISection>
        );
        const section = container.querySelector(`.section[data-test="${testValue}"]`) as HTMLElement;
        expect(section.getAttribute('data-test')).toEqual(testValue);
    });
});
