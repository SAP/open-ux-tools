import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, ICalloutContentStyles } from '@fluentui/react';
import { TooltipHost } from '@fluentui/react';
import type { UITooltipProps } from '../../../src/components/UITooltip/UITooltip';
import { UITooltip } from '../../../src/components/UITooltip/UITooltip';
import { UIDefaultButton } from '../../../src/components/UIButton';

describe('<UITooltip />', () => {
    let wrapper: Enzyme.ReactWrapper<UITooltipProps>;
    const getToltipStyles = (): ICalloutContentStyles => {
        return (wrapper.find(TooltipHost).props().calloutProps.styles as IStyleFunction<{}, {}>)(
            {}
        ) as ICalloutContentStyles;
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(<UITooltip />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UITooltip component', () => {
        expect(wrapper.find('.ms-TooltipHost').length).toEqual(1);
    });

    it('Property "maxWidth" - default', () => {
        const styles = getToltipStyles();
        expect(styles.calloutMain['maxWidth']).toEqual(200);
    });

    it('Property "maxWidth" - custom', () => {
        const maxWidth = 'auto';
        wrapper.setProps({
            maxWidth
        });
        const styles = getToltipStyles();
        expect(styles.calloutMain['maxWidth']).toEqual(maxWidth);
    });

    describe('Property "showOnFocus"', () => {
        const buttonId = 'testButton';
        const buttonSelector = `button#${buttonId}`;
        let onLayerMount: jest.Mock;
        beforeEach(() => {
            onLayerMount = jest.fn();
            wrapper = Enzyme.mount(
                <UITooltip
                    content="This is the tooltip"
                    showOnFocus={true}
                    tooltipProps={{
                        calloutProps: {
                            onLayerMounted: onLayerMount
                        }
                    }}>
                    <UIDefaultButton id={buttonId}>Text</UIDefaultButton>
                </UITooltip>
            );
        });
        it('showOnFocus=true', async () => {
            wrapper.find(buttonSelector).simulate('focus');
            await new Promise((resolve) => setTimeout(resolve, 1000));
            expect(onLayerMount).toBeCalledTimes(1);
        });

        it('showOnFocus=false', async () => {
            wrapper.setProps({
                showOnFocus: false
            });
            wrapper.find(buttonSelector).simulate('focus');
            await new Promise((resolve) => setTimeout(resolve, 1000));
            expect(onLayerMount).toBeCalledTimes(0);
        });
    });
});
