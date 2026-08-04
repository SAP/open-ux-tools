import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type { ICalloutContentStyles } from '@fluentui/react';
import { UITooltip } from '../../../src/components/UITooltip/UITooltip';
import type { UITooltipProps } from '../../../src/components/UITooltip/UITooltip';
import { UIDefaultButton } from '../../../src/components/UIButton';

// Extract the CalloutStyles function from a UITooltip render() call.
// UITooltip is a class component that constructs the styles inline in render().
function getCalloutStyles(props: Partial<UITooltipProps> = {}): ICalloutContentStyles {
    const instance = new UITooltip(props as UITooltipProps);
    const jsx = instance.render() as React.ReactElement;
    // When showOnFocus is not true, render() wraps the TooltipHost in a <div>
    const tooltipHost = props.showOnFocus === true ? jsx : jsx.props.children;
    const calloutStylesFn = tooltipHost.props.calloutProps?.styles as (() => ICalloutContentStyles) | undefined;
    return calloutStylesFn?.() ?? ({} as ICalloutContentStyles);
}

describe('<UITooltip />', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a UITooltip component', () => {
        const { container } = render(<UITooltip />);
        expect(container.querySelectorAll('.ms-TooltipHost')).toHaveLength(1);
    });

    describe('Property "maxWidth"', () => {
        it('default is 200', () => {
            const styles = getCalloutStyles();
            expect(styles.calloutMain['maxWidth']).toEqual(200);
        });

        it('custom value is applied', () => {
            const styles = getCalloutStyles({ maxWidth: 'auto' });
            expect(styles.calloutMain['maxWidth']).toEqual('auto');
        });
    });

    describe('Property "showOnFocus"', () => {
        const buttonId = 'testButton';
        let onLayerMount: jest.Mock;

        beforeEach(() => {
            onLayerMount = jest.fn();
        });

        it('showOnFocus=true shows tooltip on focus', async () => {
            const { container } = render(
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
            const button = container.querySelector(`button#${buttonId}`) as HTMLElement;
            fireEvent.focus(button);
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            });
            expect(onLayerMount).toHaveBeenCalledTimes(1);
        });

        it('showOnFocus=false does not show tooltip on focus', async () => {
            const { container } = render(
                <UITooltip
                    content="This is the tooltip"
                    showOnFocus={false}
                    tooltipProps={{
                        calloutProps: {
                            onLayerMounted: onLayerMount
                        }
                    }}>
                    <UIDefaultButton id={buttonId}>Text</UIDefaultButton>
                </UITooltip>
            );
            const button = container.querySelector(`button#${buttonId}`) as HTMLElement;
            fireEvent.focus(button);
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            });
            expect(onLayerMount).toHaveBeenCalledTimes(0);
        });
    });
});
