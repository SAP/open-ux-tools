import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type { IStyleFunction, ICalloutContentStyles, ITooltipHostProps } from '@fluentui/react';

// Capture props that UITooltip passes down to TooltipHost
let capturedProps: ITooltipHostProps | undefined;

const actual = await import('@fluentui/react');
const OriginalTooltipHost = actual.TooltipHost;
const mocked = {
    ...actual,
    TooltipHost: (props: ITooltipHostProps) => {
        capturedProps = props;
        return React.createElement(OriginalTooltipHost as React.ComponentType<ITooltipHostProps>, props);
    }
};
jest.unstable_mockModule('@fluentui/react', () => mocked);

const { UITooltip } = await import('../../../src/components/UITooltip/UITooltip');
const { UIDefaultButton } = await import('../../../src/components/UIButton');

const getTooltipStyles = (): ICalloutContentStyles => {
    return (capturedProps?.calloutProps?.styles as IStyleFunction<{}, {}>)({}) as ICalloutContentStyles;
};

describe('<UITooltip />', () => {
    beforeEach(() => {
        capturedProps = undefined;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a UITooltip component', () => {
        const { container } = render(<UITooltip />);
        expect(container.querySelectorAll('.ms-TooltipHost').length).toEqual(1);
    });

    it('Property "maxWidth" - default', () => {
        render(<UITooltip />);
        const styles = getTooltipStyles();
        expect(styles.calloutMain['maxWidth']).toEqual(200);
    });

    it('Property "maxWidth" - custom', () => {
        const maxWidth = 'auto';
        const { rerender } = render(<UITooltip />);
        rerender(<UITooltip maxWidth={maxWidth} />);
        const styles = getTooltipStyles();
        expect(styles.calloutMain['maxWidth']).toEqual(maxWidth);
    });

    describe('Property "showOnFocus"', () => {
        const buttonId = 'testButton';
        let onLayerMount: jest.Mock;

        beforeEach(() => {
            onLayerMount = jest.fn();
        });

        it('showOnFocus=true', async () => {
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
            await act(async () => {
                fireEvent.focus(button);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            });
            expect(onLayerMount).toHaveBeenCalledTimes(1);
        });

        it('showOnFocus=false', async () => {
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
            await act(async () => {
                fireEvent.focus(button);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            });
            expect(onLayerMount).toHaveBeenCalledTimes(0);
        });
    });
});
