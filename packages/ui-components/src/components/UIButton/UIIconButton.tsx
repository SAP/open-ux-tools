import React from 'react';
import type { IButtonProps as IBaseButtonProps, IButtonStyles } from '@fluentui/react';
import { IconButton } from '@fluentui/react';

import { UIContextualMenu } from '../UIContextualMenu';

export enum UIIconButtonSizes {
    Default = 'Default',
    Wide = 'Wide'
}

export interface ButtonProps extends IBaseButtonProps {
    sizeType?: UIIconButtonSizes;
}

/**
 * UIIconButton component.
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/button
 *
 * @exports
 * @class UIIconButton
 * @extends {React.Component<ButtonProps, {}>}
 */
export class UIIconButton extends React.Component<ButtonProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {ButtonProps} props
     */
    public constructor(props: ButtonProps) {
        super(props);
    }

    /**
     * Method which returns button interaction background with including fallback for old VSCode or BAS versions.
     *
     * @param {string} color First choise color.
     * @returns {string} CSS value for background color with fallback.
     */
    private getButtonInteractionBackgroundColor(color: string): string {
        return `var(${color}, var(--vscode-menubar-selectionBackground))`;
    }

    protected setStyle = (props: ButtonProps): IButtonStyles => {
        const sizeType = props.sizeType || UIIconButtonSizes.Default;
        const width = sizeType === UIIconButtonSizes.Default ? 16 : 26;
        return {
            root: {
                minWidth: 'initial',
                height: 16,
                width: width,
                boxSizing: 'content-box',
                padding: 3,
                backgroundColor: 'transparent',
                borderRadius: 4,
                selectors: {
                    // Focus through tab navigation
                    '.ms-Fabric--isFocusVisible &:focus:after': {
                        outline: '1px solid var(--vscode-focusBorder)'
                    }
                }
            },
            rootDisabled: {
                backgroundColor: 'transparent',
                opacity: '0.4'
            },
            rootHasMenu: {
                width: width
            },
            rootHovered: {
                backgroundColor: this.getButtonInteractionBackgroundColor('--vscode-toolbar-hoverBackground'),
                outline: '1px dashed var(--vscode-contrastActiveBorder)'
            },
            rootPressed: {
                backgroundColor: this.getButtonInteractionBackgroundColor('--vscode-toolbar-activeBackground')
            },
            rootExpanded: {
                backgroundColor: this.getButtonInteractionBackgroundColor('--vscode-toolbar-hoverBackground'),
                width: width
            },
            rootExpandedHovered: { backgroundColor: 'transparent' },
            flexContainer: {
                width: '100%',
                height: '100%'
            },
            icon: {
                height: 16,
                width: width,
                lineHeight: 16
            },
            iconHovered: {
                backgroundColor: 'transparent'
            },
            menuIconExpanded: {
                display: 'none'
            },
            menuIcon: {
                display: 'none'
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <IconButton {...this.props} styles={this.setStyle(this.props)} menuAs={UIContextualMenu} />;
    }
}
