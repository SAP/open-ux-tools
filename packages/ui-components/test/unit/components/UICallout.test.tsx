import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { ICalloutContentStyles } from '@fluentui/react';
import { Callout } from '@fluentui/react';
import type { UICalloutProps } from '../../../src/components/UICallout';
import { UICallout, UICalloutContentPadding } from '../../../src/components/UICallout';

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
    });

    it('Should render a UITooltip component', () => {
        expect(wrapper.find('.ms-Callout').length).toEqual(1);
    });

    it('Property "contentPadding"', () => {
        // Default - None
        let style = getCalloutStyles();
        expect(style.calloutMain['padding']).toEqual(undefined);
        // Standard
        wrapper.setProps({
            contentPadding: UICalloutContentPadding.Standard
        });
        style = getCalloutStyles();
        expect(style.calloutMain['padding']).toEqual(8);
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
        expect(style.root[property]).toEqual(expectStyles.root[property]);
        expect(style.beak[property]).toEqual(expectStyles.beak[property]);
        expect(style.beakCurtain[property]).toEqual(expectStyles.beakCurtain[property]);
        expect(style.calloutMain[property]).toEqual(expectStyles.calloutMain[property]);
        expect(style.container[property]).toEqual(expectStyles.container[property]);
    });
});
