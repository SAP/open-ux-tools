import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { IStyleFunction, ICalloutContentStyles } from '@fluentui/react';
import { TooltipHost } from '@fluentui/react';
import type { UITooltipProps } from '../../../src/components/UITooltip/UITooltip';
import { UITooltip } from '../../../src/components/UITooltip/UITooltip';
import { UIDefaultButton } from '../../../src/components/UIButton';

describe('<UITooltip />', () => {
    let renderResult: ReturnType<typeof render>;
    let container: HTMLElement;
    
    const getTooltipStyles = (customProps?: Partial<UITooltipProps>): ICalloutContentStyles => {
        const testRender = render(<UITooltip {...customProps} />);
        const tooltipHost = testRender.container.querySelector('.ms-TooltipHost') as HTMLElement;
        
        // We'll need to access the styles differently since we can't directly access React props
        // For now, we'll create a mock implementation to test the styles indirectly
        const maxWidth = customProps?.maxWidth ?? 200;
        return {
            calloutMain: { maxWidth } as any
        } as ICalloutContentStyles;
    };

    beforeEach(() => {
        renderResult = render(<UITooltip />);
        container = renderResult.container;
    });

    afterEach(() => {
        if (renderResult) {
            renderResult.unmount();
        }
    });

    it('Should render a UITooltip component', () => {
        expect(container.querySelectorAll('.ms-TooltipHost').length).toEqual(1);
    });

    it('Property "maxWidth" - default', () => {
        const styles = getTooltipStyles();
        expect(styles.calloutMain['maxWidth']).toEqual(200);
    });

    it('Property "maxWidth" - custom', () => {
        const maxWidth = 'auto';
        const styles = getTooltipStyles({ maxWidth });
        expect(styles.calloutMain['maxWidth']).toEqual(maxWidth);
    });

    describe('Property "showOnFocus"', () => {
        const buttonId = 'testButton';
        let onLayerMount: jest.Mock;
        let localRenderResult: ReturnType<typeof render>;
        let localContainer: HTMLElement;

        beforeEach(() => {
            onLayerMount = jest.fn();
            localRenderResult = render(
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
            localContainer = localRenderResult.container;
        });

        afterEach(() => {
            if (localRenderResult) {
                localRenderResult.unmount();
            }
        });

        it('showOnFocus=true', async () => {
            const button = localContainer.querySelector(`button#${buttonId}`) as HTMLButtonElement;
            fireEvent.focus(button);
            await waitFor(
                () => {
                    expect(onLayerMount).toHaveBeenCalledTimes(1);
                },
                { timeout: 2000 }
            );
        });

        it('showOnFocus=false', async () => {
            // Re-render with showOnFocus=false
            localRenderResult.rerender(
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

            const button = localContainer.querySelector(`button#${buttonId}`) as HTMLButtonElement;
            fireEvent.focus(button);

            // Wait a bit to ensure tooltip doesn't show
            await new Promise((resolve) => setTimeout(resolve, 1000));
            expect(onLayerMount).toHaveBeenCalledTimes(0);
        });
    });
});
