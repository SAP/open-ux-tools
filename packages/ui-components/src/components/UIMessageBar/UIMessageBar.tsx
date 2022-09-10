import React from 'react';
import type { IMessageBarProps, IMessageBarStyles } from '@fluentui/react';
import { MessageBar, MessageBarType } from '@fluentui/react';

import { UiIcons } from '../Icons';

export { MessageBarType as UIMessageBarType };

/**
 * UIMessageBar component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/MessageBar
 *
 * @exports
 * @class UIMessageBar
 * @extends {React.Component<IMessageBarProps, {}>}
 */
export class UIMessageBar extends React.Component<IMessageBarProps, {}> {
    /**
     * Initializes component properties.
     * @param {IMessageBarProps} props
     */
    public constructor(props: IMessageBarProps) {
        super(props);
    }

    protected setStyle = (props: IMessageBarProps): IMessageBarStyles => {
        return {
            root: {
                ...(props.messageBarType === MessageBarType.error && {
                    backgroundColor: 'transparent'
                }),
                ...(props.messageBarType === MessageBarType.success && {
                    backgroundColor: 'transparent'
                })
            },
            innerText: {
                fontSize: 13,
                lineHeight: 18,
                color: 'var(--vscode-foreground)',
                selectors: {
                    p: {
                        margin: 0
                    }
                }
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <MessageBar
                {...this.props}
                messageBarIconProps={
                    this.props.messageBarType === MessageBarType.error
                        ? { iconName: UiIcons.Error }
                        : { iconName: UiIcons.Success }
                }
                styles={this.setStyle(this.props)}>
                {this.props.children}
            </MessageBar>
        );
    }
}
