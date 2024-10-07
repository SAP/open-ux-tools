import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { ICalloutContentStyles } from '@fluentui/react';
import { Callout } from '@fluentui/react';
import type { UICalloutProps } from '../../../src/components/UICallout';
import { UICallout, UICalloutContentPadding } from '../../../src/components/UICallout';
import * as FluentUI from '@fluentui/react';

describe('<UICallout />', () => {
    let wrapper: Enzyme.ReactWrapper<UICalloutProps>;
    const getCalloutStyles = (): ICalloutContentStyles => {
        return wrapper.find(Callout).props().styles as ICalloutContentStyles;
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <UICallout>
                <div className="dummy"></div>
            </UICallout>
        );
    });

    afterEach(() => {
        wrapper.unmount();
        jest.clearAllMocks();
    });

    it('Should render a UITooltip component', () => {
        expect(wrapper.find('.ms-Callout').length).toEqual(1);
        const style = getCalloutStyles();
        expect(style.root?.['borderRadius']).toEqual(2);
        expect(style.beakCurtain?.['borderRadius']).toEqual(2);
        expect(style.calloutMain?.['borderRadius']).toEqual(2);
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
                wrapper.setProps({
                    focusTargetSiblingOnTabPress,
                    target
                });
                wrapper.find('.dummy').simulate('keydown', { key, shiftKey });
                expect(getNextElementSpy).toBeCalledTimes(focusNext ? 1 : 0);
                expect(getPreviousElementSpy).toBeCalledTimes(focusPrevious ? 1 : 0);
            });
        }
    });
});
