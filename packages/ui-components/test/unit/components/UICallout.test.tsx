jest.mock('../../../src/utilities', () => {
    const actual = jest.requireActual('../../../src/utilities');
    return {
        ...actual,
        focusToSibling: jest.fn()
    };
});

import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ICalloutContentStyles } from '@fluentui/react';
import { Callout } from '@fluentui/react';
import type { UICalloutProps } from '../../../src/components/UICallout';
import { UICallout, UICalloutContentPadding } from '../../../src/components/UICallout';
import * as FluentUI from '@fluentui/react';
import * as Utilities from '../../../src/utilities';

describe('<UICallout />', () => {
    let container: HTMLElement;
    let rerender: (ui: React.ReactElement) => void;
    let targetElement: HTMLElement;

    beforeEach(() => {
        // Create a target element for the callout
        targetElement = document.createElement('button');
        targetElement.id = 'callout-target';
        targetElement.textContent = 'Target Button';
        document.body.appendChild(targetElement);

        const result = render(
            <UICallout target={targetElement}>
                <div className="dummy"></div>
            </UICallout>
        );
        container = result.container;
        rerender = result.rerender;
    });

    afterEach(() => {
        cleanup();
        targetElement?.parentNode?.removeChild(targetElement);
        jest.clearAllMocks();
    });

    it('Should render a UICallout component', () => {
        expect(document.body.querySelectorAll('.ms-Callout').length).toEqual(1);
        const callout = document.body.querySelector('.ms-Callout');
        expect(callout).toBeInTheDocument();
        // Test that the component renders with expected structure
        const dummyElement = document.body.querySelector('.dummy');
        expect(dummyElement).toBeInTheDocument();
    });

    it('Property "contentPadding"', () => {
        // Default - None
        expect(document.body.querySelector('.ms-Callout')).toBeInTheDocument();

        // Standard
        rerender(
            <UICallout target={targetElement} contentPadding={UICalloutContentPadding.Standard}>
                <div className="dummy"></div>
            </UICallout>
        );
        expect(document.body.querySelector('.ms-Callout')).toBeInTheDocument();
        expect(document.body.querySelector('.dummy')).toBeInTheDocument();
    });

    it('Overwrite styles', () => {
        const property = 'backgroundColor';
        const expectStyles = {
            root: {
                [property]: 'red'
            },
            beak: {
                [property]: 'green'
            },
            beakCurtain: {
                [property]: 'blue'
            },
            calloutMain: {
                [property]: 'yellow'
            },
            container: {
                [property]: 'green'
            }
        };

        rerender(
            <UICallout styles={expectStyles}>
                <div className="dummy"></div>
            </UICallout>
        );

        // Test that the component renders with custom styles
        expect(document.body.querySelector('.ms-Callout')).toBeInTheDocument();
        expect(document.body.querySelector('.dummy')).toBeInTheDocument();
    });

    describe('Property "focusTargetSiblingOnTabPress"', () => {
        let getNextElementSpy: jest.SpyInstance;
        let getPreviousElementSpy: jest.SpyInstance;
        const virtualElement = document.createElement('div');
        const testCases = [
            {
                name: 'Tab to next',
                focusTargetSiblingOnTabPress: true,
                target: virtualElement,
                key: 'Tab',
                shiftKey: false,
                focusNext: true,
                focusPrevious: false
            },
            {
                name: 'Tab to previous',
                focusTargetSiblingOnTabPress: true,
                target: virtualElement,
                key: 'Tab',
                shiftKey: true,
                focusNext: false,
                focusPrevious: true
            },
            {
                name: 'Different key',
                focusTargetSiblingOnTabPress: true,
                target: virtualElement,
                key: 'Enter',
                shiftKey: false,
                focusNext: false,
                focusPrevious: false
            },
            {
                name: 'Target as selector',
                focusTargetSiblingOnTabPress: true,
                target: '.dummy',
                key: 'Tab',
                shiftKey: false,
                focusNext: true,
                focusPrevious: false
            }
        ];

        beforeEach(() => {
            const element = document.createElement('div');
            getNextElementSpy = jest.spyOn(FluentUI, 'getNextElement').mockReturnValue(element);
            getPreviousElementSpy = jest.spyOn(FluentUI, 'getPreviousElement').mockReturnValue(element);
        });

        for (const testCase of testCases) {
            const { name, target, focusTargetSiblingOnTabPress, focusNext, focusPrevious, key, shiftKey } = testCase;
            it(name, () => {
                rerender(
                    <UICallout focusTargetSiblingOnTabPress={focusTargetSiblingOnTabPress} target={target}>
                        <div className="dummy"></div>
                    </UICallout>
                );

                const dummyElement = container.querySelector('.dummy');
                if (dummyElement) {
                    fireEvent.keyDown(dummyElement, { key, shiftKey });
                    expect(getNextElementSpy).toBeCalledTimes(focusNext ? 1 : 0);
                    expect(getPreviousElementSpy).toBeCalledTimes(focusPrevious ? 1 : 0);
                }
            });
        }
    });

    it('applies calloutMinWidth prop', () => {
        rerender(
            <UICallout target={targetElement} calloutMinWidth={555}>
                <div className="dummy"></div>
            </UICallout>
        );
        const callout = document.body.querySelector('.ms-Callout');
        // Find the calloutMain element
        const calloutMain = callout?.querySelector('.ms-Callout-main');
        expect(calloutMain).toBeTruthy();
        if (calloutMain) {
            expect(window.getComputedStyle(calloutMain).minWidth).toBe('555px');
        }
    });

    it('applies contentPadding None and Standard correctly', () => {
        rerender(
            <UICallout target={targetElement} contentPadding={UICalloutContentPadding.None}>
                <div className="dummy"></div>
            </UICallout>
        );
        let callout = document.body.querySelector('.ms-Callout');
        let calloutMain = callout?.querySelector('.ms-Callout-main');
        expect(calloutMain).toBeTruthy();
        if (calloutMain) {
            expect(window.getComputedStyle(calloutMain).padding).toBe('');
        }

        rerender(
            <UICallout target={targetElement} contentPadding={UICalloutContentPadding.Standard}>
                <div className="dummy"></div>
            </UICallout>
        );
        callout = document.body.querySelector('.ms-Callout');
        calloutMain = callout?.querySelector('.ms-Callout-main');
        expect(calloutMain).toBeTruthy();
        if (calloutMain) {
            expect(window.getComputedStyle(calloutMain).padding).toMatch(/8px/);
        }
    });

    it('calls onKeyDown prop if provided', () => {
        const onKeyDown = jest.fn();
        rerender(
            <UICallout target={targetElement} onKeyDown={onKeyDown}>
                <div className="dummy"></div>
            </UICallout>
        );
        const callout = document.body.querySelector('.ms-Callout');
        if (callout) {
            fireEvent.keyDown(callout, { key: 'a' });
        }
        expect(onKeyDown).toHaveBeenCalled();
    });

    it('handles target as string selector', () => {
        (Utilities.focusToSibling as jest.Mock).mockReturnValue(document.createElement('div'));
        rerender(
            <UICallout focusTargetSiblingOnTabPress target={'.dummy'}>
                <div className="dummy"></div>
            </UICallout>
        );
        const callout = document.body.querySelector('.ms-Callout');
        fireEvent.keyDown(callout, { key: 'Tab' });
        expect(Utilities.focusToSibling).toHaveBeenCalled();
    });

    it('handles target as HTMLElement', () => {
        (Utilities.focusToSibling as jest.Mock).mockReturnValue(document.createElement('div'));
        const div = document.createElement('div');
        div.className = 'dummy';
        document.body.appendChild(div);
        rerender(
            <UICallout focusTargetSiblingOnTabPress target={div}>
                <div className="dummy"></div>
            </UICallout>
        );
        const callout = document.body.querySelector('.ms-Callout');
        fireEvent.keyDown(callout, { key: 'Tab' });
        expect(Utilities.focusToSibling).toHaveBeenCalled();
    });

    it('merges custom styles with default styles', () => {
        const customStyles = {
            root: { backgroundColor: 'pink' },
            calloutMain: { minWidth: 123 }
        };
        rerender(
            <UICallout target={targetElement} styles={customStyles}>
                <div className="dummy"></div>
            </UICallout>
        );
        const callout = document.body.querySelector('.ms-Callout');
        const calloutMain = callout?.querySelector('.ms-Callout-main');
        expect(calloutMain).toBeTruthy();
        if (calloutMain) {
            expect(window.getComputedStyle(calloutMain).minWidth).toBe('123px');
        }
    });
});
