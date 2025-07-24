import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UISection, UISectionLayout } from '../../../src/components/UISection/UISection';

describe('<Section />', () => {
    let renderResult: ReturnType<typeof render>;

    beforeEach(() => {
        renderResult = render(
            <UISection>
                <div>Dummy Content</div>
            </UISection>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        renderResult.unmount();
    });

    it('Should render a Shell component', () => {
        const { container } = renderResult;
        expect(container.querySelector('.section')).toBeTruthy();
    });

    it('Test "height" property', () => {
        const height = '500px';
        renderResult.rerender(
            <UISection height={height}>
                <div>Dummy Content</div>
            </UISection>
        );
        const { container } = renderResult;
        const section = container.querySelector('.section') as HTMLElement;
        expect(section.style.height).toEqual(height);
    });

    it('Test "className" property', () => {
        const className = 'dummyClass';
        renderResult.rerender(
            <UISection className={className}>
                <div>Dummy Content</div>
            </UISection>
        );
        const { container } = renderResult;
        expect(container.querySelector('.' + className)).toBeTruthy();
    });

    it('Test "title" property', () => {
        const title = 'dummy title';
        renderResult.rerender(
            <UISection title={title}>
                <div>Dummy Content</div>
            </UISection>
        );
        const { container } = renderResult;
        const titleElement = container.querySelector('.section__header__title');
        expect(titleElement?.textContent).toEqual(title);
    });

    it('Test "collapsible" property', () => {
        renderResult.rerender(
            <UISection layout={UISectionLayout.Extended}>
                <div>Dummy Content</div>
            </UISection>
        );
        const { container } = renderResult;
        expect(container.querySelectorAll('.section--extended').length).toEqual(1);
    });

    it('Test "onScroll" event', () => {
        const onScroll = jest.fn();
        renderResult.rerender(
            <UISection onScroll={onScroll} className="aaaa" collapsible={true}>
                <div>Dummy Content</div>
            </UISection>
        );
        const { container } = renderResult;
        const sectionBody = container.querySelector('.section__body');
        expect(sectionBody).toBeTruthy();
        fireEvent.scroll(sectionBody as HTMLElement, {});
        // Check result
        expect(onScroll).toBeCalledTimes(1);
    });

    it('Test "hidden" property', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll('.section--hidden').length).toEqual(0);
        renderResult.rerender(
            <UISection hidden={true}>
                <div>Dummy Content</div>
            </UISection>
        );
        expect(container.querySelectorAll('.section--hidden').length).toEqual(1);
    });

    it('Test data property', () => {
        const testValue = 'test value';
        const customRender = render(
            <UISection data-test={testValue}>
                <div>Dummy Content</div>
            </UISection>
        );
        const { container } = customRender;
        const section = container.querySelector('.section[data-test="test value"]') as HTMLElement;
        expect(section.getAttribute('data-test')).toEqual(testValue);
        customRender.unmount();
    });
});
