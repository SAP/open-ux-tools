import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { ICalloutContentStyles } from '@fluentui/react';

const { getNextElement: mockGetNextElement, getPreviousElement: mockGetPreviousElement } = await (async () => {
    const actual = await import('@fluentui/react');
    const mocked = {
        ...actual,
        getNextElement: jest.fn(),
        getPreviousElement: jest.fn()
    };
    jest.unstable_mockModule('@fluentui/react', () => mocked);
    return mocked;
})();

const { UICallout, UICalloutContentPadding, getCalloutStyle } = await import('../../../src/components/UICallout');
import type { UICalloutProps } from '../../../src/components/UICallout';

describe('<UICallout />', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a UITooltip component', () => {
        render(
            <UICallout>
                <div className="dummy"></div>
            </UICallout>
        );
        expect(document.querySelector('.ms-Callout')).toBeTruthy();
        const style = getCalloutStyle({}) as ICalloutContentStyles;
        expect(style.root?.['borderRadius']).toEqual('var(--vscode-cornerRadius-small, 4px)');
        expect(style.beakCurtain?.['borderRadius']).toEqual('var(--vscode-cornerRadius-small, 4px)');
        expect(style.calloutMain?.['borderRadius']).toEqual('var(--vscode-cornerRadius-small, 4px)');
        expect(style.root?.['boxShadow']).toEqual('var(--ui-box-shadow-small)');
    });

    it('Property "contentPadding"', () => {
        // Default - None
        let style = getCalloutStyle({}) as ICalloutContentStyles;
        expect(style.calloutMain?.['padding']).toBeUndefined();
        // Standard
        style = getCalloutStyle({ contentPadding: UICalloutContentPadding.Standard }) as ICalloutContentStyles;
        expect(style.calloutMain?.['padding']).toEqual(8);
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
        const style = getCalloutStyle({ styles: expectStyles }) as ICalloutContentStyles;
        expect(style.root?.[property]).toEqual(expectStyles.root[property]);
        expect(style.beak?.[property]).toEqual(expectStyles.beak[property]);
        expect(style.beakCurtain?.[property]).toEqual(expectStyles.beakCurtain[property]);
        expect(style.calloutMain?.[property]).toEqual(expectStyles.calloutMain[property]);
        expect(style.container?.[property]).toEqual(expectStyles.container[property]);
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

        beforeEach(() => {
            jest.clearAllMocks();
            const element = document.createElement('div');
            (mockGetNextElement as jest.Mock).mockReturnValue(element);
            (mockGetPreviousElement as jest.Mock).mockReturnValue(element);
        });

        for (const testCase of testCases) {
            const { name, target, focusTargetSiblingOnTabPress, focusNext, focusPrevious, key, shiftKey } = testCase;
            it(name, () => {
                const props: UICalloutProps = { focusTargetSiblingOnTabPress, target };
                render(
                    <UICallout {...props}>
                        <div className="dummy"></div>
                    </UICallout>
                );
                const dummy = document.querySelector('.dummy') as HTMLElement;
                fireEvent.keyDown(dummy, { key, shiftKey });
                expect(mockGetNextElement).toHaveBeenCalledTimes(focusNext ? 1 : 0);
                expect(mockGetPreviousElement).toHaveBeenCalledTimes(focusPrevious ? 1 : 0);
            });
        }
    });
});
