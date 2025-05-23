import React from 'react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import { ActionButton } from '@fluentui/react';

import { UIContextualMenu } from '../UIContextualMenu';
import type { UIIContextualMenuProps } from '../UIContextualMenu';

interface UIButtonProps extends IButtonProps {
    menuProps?: UIIContextualMenuProps;
}

/**
 * UIActionButton component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/button
 *
 * @exports
 * @class UIActionButton
 * @extends {React.Component<IButtonProps, {}>}
 */
export class UIActionButton extends React.Component<UIButtonProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IButtonProps} props
     */
    public constructor(props: UIButtonProps) {
        super(props);
    }

    protected setStyle = (): IButtonStyles => {
        return {
            root: {
                minWidth: 'initial',
                height: 22,
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--vscode-foreground)',
                borderRadius: 0,
                whiteSpace: 'nowrap',
                backgroundColor: 'transparent',
                textDecoration: 'underline',
                selectors: {
                    '&:active': {
                        textDecoration: 'none'
                    },
                    // Focus through tab navigation
                    '.ms-Fabric--isFocusVisible &:focus:after': {
                        outline: '1px solid var(--vscode-focusBorder)'
                    }
                }
            },
            label: {
                marginLeft: 0,
                marginRight: 0,
                fontSize: '13px',
                fontWeight: 400
            },
            rootDisabled: {
                backgroundColor: 'transparent',
                color: 'var(--vscode-foreground)',
                opacity: '0.4',
                pointerEvents: 'none'
            },
            rootHovered: {
                color: 'var(--vscode-foreground)',
                backgroundColor: 'var(--vscode-menubar-selectionBackground)',
                outline: '1px solid var(--vscode-contrastActiveBorder)',
                borderRadius: 3,
                textDecoration: 'none',
                selectors: {
                    color: 'var(--vscode-foreground)'
                }
            },
            icon: {
                height: 16,
                lineHeight: 16,
                marginLeft: 0,
                position: 'relative',
                top: 1
            },
            menuIcon: {
                position: 'relative',
                top: 1
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <ActionButton {...this.props} styles={this.setStyle()} menuAs={UIContextualMenu} />;
    }
}
