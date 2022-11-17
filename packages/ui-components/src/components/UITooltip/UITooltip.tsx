import React from 'react';

import type {
    ITooltipHostProps,
    ITooltipHostStyles,
    ICalloutProps,
    ICalloutContentStyles,
    ITooltipProps
} from '@fluentui/react';
import { TooltipHost, TooltipDelay } from '@fluentui/react';
import { getCalloutStyle, CALLOUT_STYLES } from '../UICallout';

export { TooltipDelay as UITooltipDelay, ITooltipProps as UIToolTipProps };

export interface UITooltipProps extends ITooltipHostProps {
    // Default is 200
    maxWidth?: number | string;
    // Show tooltip on focus. Default is "false"
    showOnFocus?: boolean;
}

/**
 * UITooltip component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/tooltip
 * it can be used like <UITooltip tooltipProps={TooltipUtils.renderContent(value.name)}>{value.name}</UITooltip>
 *
 * @exports
 * @class UITooltip
 * @extends {React.Component<UITooltipProps, {}>}
 */
export class UITooltip extends React.Component<UITooltipProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UITooltipProps} props
     */
    public constructor(props: UITooltipProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const maxWidth = this.props.maxWidth !== undefined ? this.props.maxWidth : 200;
        const TooltipHostStyles = (): Partial<ITooltipHostStyles> => ({
            ...{
                root: {
                    display: 'inline-block'
                },
                content: {
                    backgroundColor: CALLOUT_STYLES.background,
                    color: CALLOUT_STYLES.text,
                    fontFamily: CALLOUT_STYLES.font
                }
            },
            ...this.props.styles
        });

        const CalloutStyles = (): Partial<ICalloutContentStyles> => {
            // We can not reuse `UICallout` component from `UITooltip`, but we can reuse same styles from `UICallout` component
            // In result callout in Tooltip would look same/similar
            return getCalloutStyle({
                calloutMinWidth: 0,
                // Apply some different styles
                styles: {
                    root: {
                        display: 'inline-block'
                    },
                    calloutMain: {
                        padding: 10,
                        maxWidth
                    }
                }
            });
        };

        const CalloutProps: ICalloutProps = {
            beakWidth: 10,
            styles: CalloutStyles
        };

        const tooltipHost = (
            <TooltipHost
                {...this.props}
                styles={TooltipHostStyles}
                calloutProps={{ ...CalloutProps, ...this.props.calloutProps }}
            />
        );

        return this.props.showOnFocus ? (
            tooltipHost
        ) : (
            <div
                onFocusCapture={(event) => {
                    if (event.target.parentElement && event.target.parentElement.classList.contains('ms-TooltipHost')) {
                        // Stop propagation to avoid display of tooltip on focus
                        event.stopPropagation();
                    }
                }}>
                {tooltipHost}
            </div>
        );
    }
}
