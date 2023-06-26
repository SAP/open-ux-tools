import React from 'react';
import type { IButtonProps, IButtonStyles, IStyle } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { UIContextualMenu } from '../UIContextualMenu';

/**
 * UIDefaultButton component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/button
 *
 * @exports
 * @class UIDefaultButton
 * @extends {React.Component<IButtonProps, {}>}
 */
export class UIDefaultButton extends React.Component<IButtonProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IButtonProps} props
     */
    public constructor(props: IButtonProps) {
        super(props);
    }

    protected setStyle = (props: IButtonProps): IButtonStyles => {
        const dividerStyle: IStyle = {
            position: 'absolute',
            width: 1,
            right: 21,
            top: 0,
            bottom: 0,
            backgroundColor: 'var(--vscode-editor-background)'
        };
        return {
            root: {
                minWidth: 'initial',
                height: 22,
                fontSize: '13px',
                fontWeight: 400,
                fontFamily: 'var(--vscode-font-family)',
                borderRadius: 0,
                paddingLeft: 13,
                paddingRight: 13,
                // Add to use hard coded value here as Theia doesn't support these values correctly
                // as on Theia
                // `--vscode-button-secondaryBackground` does not exist and is replaced by:
                // `--vscode-secondaryButton-background` = #ffffff
                // `--vscode-secondaryButton-foreground` does not exist
                // And on VSCode `--vscode-button-secondaryForeground` exist and is equal to `#ffffff`
                // So if we use the declare Theia variable `--vscode-secondaryButton-background` it will be white on white!!!
                // And to finish these stuff of course Theia mess with the highContrast theme as it does not have any of them.
                // Theia colors are a mess!!!!
                backgroundColor: 'var(--vscode-button-secondaryBackground, #5f6a79)',
                borderColor: 'var(--vscode-contrastBorder, var(--vscode-button-secondaryBackground, #5f6a79))',
                color: 'var(--vscode-button-secondaryForeground, #ffffff)',

                ...(props.primary && {
                    backgroundColor: 'var(--vscode-button-background)',
                    borderColor: 'var(--vscode-contrastBorder, var(--vscode-button-background))',
                    color: 'var(--vscode-button-foreground)'
                }),

                selectors: {
                    '.ms-Fabric--isFocusVisible &:focus:after': {
                        outlineColor: 'var(--vscode-focusBorder)',
                        inset: -3
                    }
                }
            },
            flexContainer: {
                height: 18
            },
            label: {
                marginLeft: 0,
                marginRight: 0,
                fontWeight: 400,
                lineHeight: 20,
                whiteSpace: 'nowrap'
            },
            rootDisabled: {
                opacity: '0.5 !important',
                // Add to use hard coded value here as Theia doesn't support these values correctly
                backgroundColor: 'var(--vscode-button-secondaryBackground,#5f6a79)',
                borderColor: 'var(--vscode-button-secondaryBackground, #5f6a79)',
                color: 'var(--vscode-button-secondaryForeground, #ffffff)',
                ...(props.primary && {
                    opacity: '0.5 !important',
                    color: 'var(--vscode-button-foreground)',
                    backgroundColor: 'var(--vscode-button-background)',
                    borderColor: 'var(--vscode-button-background)'
                })
            },
            rootHovered: {
                // Add to use hard coded value here as Theia doesn't support these values correctly
                color: 'var(--vscode-button-secondaryForeground, #ffffff)',
                backgroundColor: 'var(--vscode-button-secondaryHoverBackground, #4c5561)',
                borderColor:
                    'var(--vscode-contrastActiveBorder, var(--vscode-button-secondaryHoverBackground, #4c5561))',
                selectors: {
                    'svg > path, svg > rect': {
                        fill: 'var(--vscode-button-secondaryForeground, #ffffff)'
                    }
                },
                ...(props.primary && {
                    color: 'var(--vscode-button-foreground)',
                    backgroundColor: 'var(--vscode-button-hoverBackground)',
                    borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                    selectors: {
                        'svg > path, svg > rect': {
                            fill: 'var(--vscode-button-foreground)'
                        }
                    }
                })
            },
            icon: {
                height: 16,
                lineHeight: 16,
                marginLeft: -3,
                color: 'var(--vscode-button-secondaryForeground)',
                selectors: {
                    'svg > path, svg > rect': {
                        fill: 'var(--vscode-button-secondaryForeground, #ffffff)'
                    }
                },
                ...(props.primary && {
                    color: 'var(--vscode-button-foreground)',
                    selectors: {
                        'svg > path, svg > rect': {
                            fill: 'var(--vscode-button-foreground)'
                        }
                    }
                })
            },
            menuIcon: {
                selectors: {
                    'svg > path': {
                        fill: 'var(--vscode-button-secondaryForeground, #ffffff)'
                    },
                    ...(props.primary && {
                        'svg > path': {
                            fill: 'var(--vscode-button-foreground)'
                        }
                    })
                }
            },
            splitButtonMenuButton: {
                padding: 6,
                height: 22,
                boxSizing: 'border-box',
                borderRadius: '0 !important',
                borderLeft: 'none',
                outline: 'transparent',
                userSelect: 'none',
                display: 'inline-block',
                textDecoration: 'none',
                textAlign: 'center',
                cursor: 'pointer',
                verticalAlign: 'top',
                width: 22,
                marginLeft: -1,
                marginTop: 0,
                marginRight: 0,
                marginBottom: 0,
                backgroundColor: 'var(--vscode-button-background)',
                borderColor: 'var(--vscode-contrastBorder, var(--vscode-button-background))',
                color: 'var(--vscode-button-foreground)',
                selectors: {
                    '&:hover': {
                        color: 'var(--vscode-button-foreground)',
                        backgroundColor: 'var(--vscode-button-hoverBackground)',
                        borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                        selectors: {
                            'svg > path, svg > rect': {
                                fill: 'var(--vscode-button-foreground)'
                            }
                        }
                    }
                }
            },
            splitButtonMenuButtonDisabled: {
                opacity: '0.5 !important',
                // Add to use hard coded value here as Theia doesn't support these values correctly
                backgroundColor: 'var(--vscode-button-secondaryBackground,#5f6a79)',
                borderColor: 'var(--vscode-button-secondaryBackground, #5f6a79)',
                color: 'var(--vscode-button-secondaryForeground, #ffffff)',
                ...(props.primary && {
                    color: 'var(--vscode-button-foreground)',
                    backgroundColor: 'var(--vscode-button-background)',
                    borderColor: 'var(--vscode-button-background)'
                })
            },
            splitButtonMenuFocused: {
                selectors: {
                    '&:focus': {
                        color: 'red'
                    }
                }
            },
            splitButtonMenuButtonExpanded: {
                color: 'var(--vscode-button-foreground)',
                backgroundColor: 'var(--vscode-button-hoverBackground)',
                borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                selectors: {
                    'svg > path, svg > rect': {
                        fill: 'var(--vscode-button-foreground)'
                    },

                    '&:hover': {
                        color: 'var(--vscode-button-foreground)',
                        backgroundColor: 'var(--vscode-button-hoverBackground)',
                        borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                        selectors: {
                            'svg > path, svg > rect': {
                                fill: 'var(--vscode-button-foreground)'
                            }
                        }
                    }
                }
            },
            splitButtonDivider: dividerStyle,
            splitButtonDividerDisabled: dividerStyle
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <DefaultButton {...this.props} styles={this.setStyle(this.props)} menuAs={UIContextualMenu} />;
    }
}
