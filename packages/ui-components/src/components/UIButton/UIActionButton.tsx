import React from 'react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import { ActionButton } from '@fluentui/react';

import { UIContextualMenu } from '../UIContextualMenu';

/**
 * UIActionButton component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/button
 *
 * @exports
 * @class UIActionButton
 * @extends {React.Component<IButtonProps, {}>}
 */
export class UIActionButton extends React.Component<IButtonProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IButtonProps} props
     */
    public constructor(props: IButtonProps) {
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
                selectors: {
                    '&:active': {
                        textDecoration: 'underline'
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
                fontWeight: 400,
                fontFamily: 'var(--vscode-font-family)'
            },
            rootDisabled: {
                backgroundColor: 'transparent',
                color: 'var(--vscode-foreground)',
                opacity: '0.4',
                pointerEvents: 'none'
            },
            rootHovered: {
                color: 'var(--vscode-foreground)',
                textDecoration: 'underline',
                backgroundColor: 'transparent',

                selectors: {
                    color: 'var(--vscode-foreground)',
                    'svg > path, svg > rect': {
                        fill: 'var(--vscode-foreground)'
                    }
                }
            },
            icon: {
                height: 16,
                lineHeight: 16,
                marginLeft: -3,
                selectors: {
                    'svg > path, svg > rect': {
                        fill: 'var(--vscode-foreground)'
                    }
                },
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
