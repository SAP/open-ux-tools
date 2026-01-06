jest.mock('../../../src/utilities', () => {
    const actual = jest.requireActual('../../../src/utilities');
    return {
        ...actual,
        focusToSibling: jest.fn()
    };
});

import * as React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UICallout, UICalloutContentPadding } from '../../../src/components/UICallout';
import * as FluentUI from '@fluentui/react';
import * as Utilities from '../../../src/utilities';
import { compareStylesBySelector } from '../../utils/styles';

describe('<UICallout />', () => {
    let rerender: (ui: React.ReactElement) => void;
    let targetElement: HTMLElement;
    const selectors = {
        root: '.ms-Callout',
        main: '.ms-Callout-main',
        beak: '.ms-Callout-beak',
        beakCurtain: '.ms-Callout-beakCurtain',
        container: '.ms-Callout-container'
    };
    const focusToSiblingMock = Utilities.focusToSibling as jest.Mock;

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
        // Default overwritten styles
        compareStylesBySelector(selectors.root, {
            borderRadius: '2px',
            boxShadow: 'var(--ui-box-shadow-small)'
        });
        compareStylesBySelector(selectors.main, {
            borderRadius: '2px'
        });
    });

    it('Property "contentPadding"', () => {
        // Default - None
        compareStylesBySelector(selectors.main, {
            padding: ''
        });

        // Standard
        rerender(
            <UICallout target={targetElement} contentPadding={UICalloutContentPadding.Standard}>
                <div className="dummy"></div>
            </UICallout>
        );
        compareStylesBySelector(selectors.main, {
            padding: '8px 8px 8px 8px'
        });
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
            <UICallout styles={expectStyles} target={`#${targetElement.id}`}>
                <div className="dummy"></div>
            </UICallout>
        );

        // Test that the component renders with custom styles
        compareStylesBySelector(selectors.root, {
            [property]: expectStyles.root[property]
        });
        compareStylesBySelector(selectors.beak, {
            [property]: expectStyles.beak[property]
        });
        compareStylesBySelector(selectors.beakCurtain, {
            [property]: expectStyles.beakCurtain[property]
        });
        compareStylesBySelector(selectors.main, {
            [property]: expectStyles.calloutMain[property]
        });
        compareStylesBySelector(selectors.container, {
            [property]: expectStyles.container[property]
        });
    });

    describe('Property "focusTargetSiblingOnTabPress"', () => {
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

        for (const testCase of testCases) {
            const { name, target, focusTargetSiblingOnTabPress, focusNext, focusPrevious, key, shiftKey } = testCase;
            it(name, () => {
                rerender(
                    <UICallout focusTargetSiblingOnTabPress={focusTargetSiblingOnTabPress} target={target}>
                        <div className="dummy"></div>
                    </UICallout>
                );

                const dummyElement = document.querySelector('.dummy');
                fireEvent.keyDown(dummyElement, { key, shiftKey });
                expect(focusToSiblingMock).toHaveBeenCalledTimes(focusNext || focusPrevious ? 1 : 0);
                if (focusNext || focusPrevious) {
                    const getNextElementCall = focusToSiblingMock.mock.calls[0];
                    expect(getNextElementCall[0]).toEqual(
                        typeof target === 'string' ? document.querySelector(target) : target
                    );
                    if (focusNext) {
                        expect(getNextElementCall[1]).toEqual(true);
                    } else if (focusPrevious) {
                        expect(getNextElementCall[1]).toEqual(false);
                    }
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
        compareStylesBySelector(selectors.main, {
            minWidth: '555px'
        });
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
        compareStylesBySelector(selectors.main, {
            minWidth: '123px'
        });
    });
});
