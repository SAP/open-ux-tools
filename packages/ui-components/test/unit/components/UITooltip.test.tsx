import * as React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import type { ICalloutContentStyles } from '@fluentui/react';
import { UITooltip } from '../../../src/components/UITooltip/UITooltip';
import type { UITooltipProps } from '../../../src/components/UITooltip/UITooltip';
import { UITooltipUtils } from '../../../src/components/UITooltip/UITooltipUtils';
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
            jest.useFakeTimers({ legacyFakeTimers: true });
        });

        afterEach(() => {
            jest.useRealTimers();
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
                jest.runAllTimers();
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
                jest.runAllTimers();
            });
            expect(onLayerMount).toHaveBeenCalledTimes(0);
        });
    });
});

describe('UITooltipUtils', () => {
    describe('getStyles', () => {
        it('returns styles with content background and color set', () => {
            const styles = UITooltipUtils.getStyles();
            expect(styles.content?.background).toBeDefined();
            expect(styles.content?.color).toBeDefined();
        });
    });

    describe('renderContent', () => {
        it('renders string content in a span', () => {
            const props = UITooltipUtils.renderContent('Hello');
            const { container } = render(props.onRenderContent!() as React.ReactElement);
            expect(container.querySelector('span')?.textContent).toBe('Hello');
        });

        it('renders null as empty string', () => {
            const props = UITooltipUtils.renderContent(null);
            const { container } = render(props.onRenderContent!() as React.ReactElement);
            expect(container.querySelector('span')?.textContent).toBe('');
        });

        it('renders a React element', () => {
            const props = UITooltipUtils.renderContent(<em>italic</em>);
            const { container } = render(props.onRenderContent!() as React.ReactElement);
            expect(container.querySelector('em')?.textContent).toBe('italic');
        });
    });

    describe('renderHTMLContent', () => {
        it('renders safe HTML content', () => {
            const props = UITooltipUtils.renderHTMLContent('<b>Hello</b>');
            const { container } = render(props.onRenderContent!() as React.ReactElement);
            expect(container.querySelector('b')?.textContent).toBe('Hello');
        });

        it('strips script tags', () => {
            const props = UITooltipUtils.renderHTMLContent('<script>alert("xss")</script><b>Safe</b>');
            const { container } = render(props.onRenderContent!() as React.ReactElement);
            expect(container.querySelectorAll('script')).toHaveLength(0);
            expect(container.querySelector('b')?.textContent).toBe('Safe');
        });

        it('strips inline event handlers', () => {
            const props = UITooltipUtils.renderHTMLContent('<p onclick="alert(1)">text</p>');
            const { container } = render(props.onRenderContent!() as React.ReactElement);
            expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull();
        });
    });
});
