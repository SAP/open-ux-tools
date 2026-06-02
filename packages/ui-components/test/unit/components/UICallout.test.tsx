import * as React from 'react';
import Enzyme from 'enzyme';
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

const { Callout } = await import('@fluentui/react');
const { UICallout, UICalloutContentPadding } = await import('../../../src/components/UICallout');
type UICalloutProps = import('../../../src/components/UICallout').UICalloutProps;

describe('<UICallout />', () => {
    let wrapper: Enzyme.ReactWrapper<UICalloutProps>;
    const getCalloutStyles = (): ICalloutContentStyles => {
        return wrapper.find(Callout).props().styles as ICalloutContentStyles;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        wrapper = Enzyme.mount(
            <UICallout>
                <div className="dummy"></div>
            </UICallout>
        );
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UITooltip component', () => {
        expect(wrapper.find('.ms-Callout').length).toEqual(1);
        const style = getCalloutStyles();
        expect(style.root?.['borderRadius']).toEqual(4);
        expect(style.beakCurtain?.['borderRadius']).toEqual(4);
        expect(style.calloutMain?.['borderRadius']).toEqual(4);
        expect(style.root?.['boxShadow']).toEqual('var(--ui-box-shadow-small)');
    });

    it('Property "contentPadding"', () => {
        // Default - None
        let style = getCalloutStyles();
        expect(style.calloutMain?.['padding']).toEqual(undefined);
        // Standard
        wrapper.setProps({
            contentPadding: UICalloutContentPadding.Standard
        });
        style = getCalloutStyles();
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
        wrapper.setProps({
            styles: expectStyles
        });
        const style = getCalloutStyles();
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
                wrapper.setProps({
                    focusTargetSiblingOnTabPress,
                    target
                });
                wrapper.find('.dummy').simulate('keydown', { key, shiftKey });
                expect(mockGetNextElement).toHaveBeenCalledTimes(focusNext ? 1 : 0);
                expect(mockGetPreviousElement).toHaveBeenCalledTimes(focusPrevious ? 1 : 0);
            });
        }
    });
});
