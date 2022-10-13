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
     *
     * @param {IMessageBarProps} props
     */
    public constructor(props: IMessageBarProps) {
        super(props);
    }

    protected setStyle = (props: IMessageBarProps): IMessageBarStyles => {
        const { messageBarType } = props;
        return {
            root: {
                ...((messageBarType === MessageBarType.error || messageBarType === MessageBarType.success) && {
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
        const iconName = this.props.messageBarType === MessageBarType.error ? UiIcons.Error : UiIcons.Success;
        return (
            <MessageBar {...this.props} messageBarIconProps={{ iconName }} styles={this.setStyle(this.props)}>
                {this.props.children}
            </MessageBar>
        );
    }
}
