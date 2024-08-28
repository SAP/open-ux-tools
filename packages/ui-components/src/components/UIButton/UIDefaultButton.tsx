import React from 'react';
import type { IButtonProps, IButtonStyles, IStyle } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { UIContextualMenu } from '../UIContextualMenu';
import type { UIIContextualMenuProps } from '../UIContextualMenu';
import { COMMON_INPUT_STYLES } from '../UIInput';
import { UiIcons } from '../Icons';

const VSCODE_BORDER_COLOR = 'var(--vscode-button-border, transparent)';
export const BASE_STYLES = {
    color: 'var(--vscode-button-foreground)',
    checkedBorderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
    primary: {
        backgroundColor: 'var(--vscode-button-background)',
        disabledBorderColor: VSCODE_BORDER_COLOR,
        borderColor: VSCODE_BORDER_COLOR,
        hoverBackgroundColor: 'var(--vscode-button-hoverBackground)',
        hoverBorderColor: VSCODE_BORDER_COLOR
    },
    secondary: {
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        disabledBorderColor: VSCODE_BORDER_COLOR,
        borderColor: VSCODE_BORDER_COLOR,
        hoverBackgroundColor: 'var(--vscode-button-secondaryHoverBackground)',
        hoverBorderColor: VSCODE_BORDER_COLOR,
        color: 'var(--vscode-button-secondaryForeground)'
    },
    transparent: {
        backgroundColor: 'transparent',
        disabledBorderColor: 'transparent',
        borderColor: 'transparent',
        hoverBackgroundColor: 'var(--vscode-toolbar-hoverBackground, var(--vscode-menubar-selectionBackground))',
        hoverBorderColor: 'var(--vscode-contrastActiveBorder, transparent)',
        hoverBorderStyle: 'dashed',
        color: 'var(--vscode-foreground)',
        checkedBackgroundColor: 'var(--vscode-button-background)',
        checkedColor: 'var(--vscode-button-foreground)',
        checkedBorderStyle: 'solid'
    }
};
const ICON_SELECTOR = 'svg > path, svg > rect';

export interface UIDefaultButtonProps extends IButtonProps {
    /**
     * Changes the visual presentation of the button to be transparent.
     *
     * @default false
     */
    transparent?: boolean;
    menuProps?: UIIContextualMenuProps;
}

/**
 * UIDefaultButton component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/button
 *
 * @exports
 * @class UIDefaultButton
 * @extends {React.Component<UIDefaultButtonProps, {}>}
 */
export class UIDefaultButton extends React.Component<UIDefaultButtonProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UIDefaultButtonProps} props
     */
    public constructor(props: UIDefaultButtonProps) {
        super(props);
    }

    /**
     * Method returns styles for hover and press States of root button element.
     *
     * @param checked Is styles for checked state.
     * @param primary Is button primary.
     * @param transparent Is button transparent.
     * @returns Styles for hover and press States of root button element.
     */
    private getInteractionStyle(checked: boolean, primary?: boolean, transparent?: boolean): IStyle {
        let styles: IStyle = {
            color: BASE_STYLES.secondary.color,
            backgroundColor: BASE_STYLES.secondary.hoverBackgroundColor,
            borderColor: BASE_STYLES.secondary.hoverBorderColor,
            selectors: {
                [ICON_SELECTOR]: {
                    fill: BASE_STYLES.secondary.color
                }
            },
            ...(primary && {
                color: BASE_STYLES.color,
                backgroundColor: BASE_STYLES.primary.hoverBackgroundColor,
                borderColor: BASE_STYLES.primary.hoverBorderColor,
                selectors: {
                    [ICON_SELECTOR]: {
                        fill: BASE_STYLES.color
                    }
                }
            }),
            ...(checked && {
                borderColor: BASE_STYLES.checkedBorderColor
            })
        };
        if (transparent) {
            if (checked) {
                styles = {
                    ...styles,
                    color: BASE_STYLES.color,
                    backgroundColor: BASE_STYLES.primary.backgroundColor,
                    borderColor: BASE_STYLES.primary.borderColor,
                    selectors: {
                        [ICON_SELECTOR]: {
                            fill: BASE_STYLES.color
                        }
                    }
                };
            } else {
                styles = {
                    ...styles,
                    color: BASE_STYLES.transparent.color,
                    backgroundColor: BASE_STYLES.transparent.hoverBackgroundColor,
                    borderColor: BASE_STYLES.transparent.hoverBorderColor,
                    borderStyle: BASE_STYLES.transparent.hoverBorderStyle,
                    selectors: {
                        [ICON_SELECTOR]: {
                            fill: BASE_STYLES.transparent.color
                        }
                    }
                };
            }
        }
        if (checked) {
            styles = { ...styles, borderColor: BASE_STYLES.checkedBorderColor };
        }
        return styles;
    }

    /**
     * Method returns styles of root button element.
     *
     * @param props Button props.
     * @returns Styles of root button element.
     */
    protected setStyle = (props: UIDefaultButtonProps): IButtonStyles => {
        const { primary, transparent } = props;
        const dividerStyle: IStyle = {
            position: 'absolute',
            width: 1,
            right: 21,
            top: 0,
            bottom: 0,
            backgroundColor: 'var(--vscode-editor-background)'
        };
        const interactionStyles = {
            root: this.getInteractionStyle(false, primary, transparent),
            checked: this.getInteractionStyle(true, primary, transparent)
        };
        return {
            root: {
                minWidth: 'initial',
                height: 22,
                fontSize: '13px',
                fontWeight: 400,
                fontFamily: 'var(--vscode-font-family)',
                borderRadius: COMMON_INPUT_STYLES.borderRadius,
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
                backgroundColor: BASE_STYLES.secondary.backgroundColor,
                borderColor: BASE_STYLES.secondary.borderColor,
                color: BASE_STYLES.secondary.color,

                ...(primary && {
                    backgroundColor: BASE_STYLES.primary.backgroundColor,
                    borderColor: BASE_STYLES.primary.borderColor,
                    color: BASE_STYLES.color
                }),
                // Transparent button
                ...(transparent && {
                    backgroundColor: BASE_STYLES.transparent.backgroundColor,
                    borderColor: BASE_STYLES.transparent.borderColor,
                    color: BASE_STYLES.transparent.color
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
                backgroundColor: BASE_STYLES.secondary.backgroundColor,
                borderColor: BASE_STYLES.secondary.disabledBorderColor,
                color: BASE_STYLES.secondary.color,
                ...(primary && {
                    opacity: '0.5 !important',
                    color: BASE_STYLES.color,
                    backgroundColor: BASE_STYLES.primary.backgroundColor,
                    borderColor: BASE_STYLES.primary.disabledBorderColor
                }),
                ...(transparent && {
                    color: BASE_STYLES.transparent.color,
                    backgroundColor: BASE_STYLES.transparent.backgroundColor,
                    borderColor: BASE_STYLES.transparent.disabledBorderColor
                })
            },
            rootPressed: interactionStyles.root,
            rootHovered: interactionStyles.root,
            icon: {
                height: 16,
                lineHeight: 16,
                marginLeft: -3,
                color: BASE_STYLES.secondary.color,
                selectors: {
                    [ICON_SELECTOR]: {
                        fill: BASE_STYLES.secondary.color
                    }
                },
                ...(primary && {
                    color: BASE_STYLES.color,
                    selectors: {
                        [ICON_SELECTOR]: {
                            fill: BASE_STYLES.color
                        }
                    }
                }),
                ...(transparent && {
                    color: BASE_STYLES.transparent.color,
                    selectors: {
                        [ICON_SELECTOR]: {
                            fill: BASE_STYLES.transparent.color
                        }
                    }
                })
            },
            menuIcon: {
                selectors: {
                    'svg > path': {
                        fill: BASE_STYLES.secondary.color
                    },
                    ...(primary && {
                        'svg > path': {
                            fill: BASE_STYLES.color
                        }
                    })
                }
            },
            rootChecked: {
                backgroundColor: BASE_STYLES.secondary.backgroundColor,
                color: BASE_STYLES.secondary.color,
                borderColor: BASE_STYLES.checkedBorderColor,
                ...(primary && {
                    backgroundColor: BASE_STYLES.primary.backgroundColor,
                    color: BASE_STYLES.color
                }),
                ...(transparent && {
                    backgroundColor: BASE_STYLES.transparent.checkedBackgroundColor,
                    color: BASE_STYLES.transparent.checkedColor,
                    borderStyle: BASE_STYLES.transparent.checkedBorderStyle
                })
            },
            rootCheckedHovered: interactionStyles.checked,
            rootCheckedPressed: interactionStyles.checked,
            splitButtonMenuButton: {
                padding: 6,
                height: 22,
                boxSizing: 'border-box',
                borderRadius: `0 ${COMMON_INPUT_STYLES.borderRadius}px ${COMMON_INPUT_STYLES.borderRadius}px 0 !important`,
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
                backgroundColor: BASE_STYLES.primary.backgroundColor,
                borderColor: BASE_STYLES.primary.borderColor,
                color: BASE_STYLES.color,
                selectors: {
                    '&:hover': {
                        color: BASE_STYLES.color,
                        backgroundColor: 'var(--vscode-button-hoverBackground)',
                        borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                        selectors: {
                            [ICON_SELECTOR]: {
                                fill: BASE_STYLES.color
                            }
                        }
                    }
                }
            },
            splitButtonMenuButtonDisabled: {
                opacity: '0.5 !important',
                // Add to use hard coded value here as Theia doesn't support these values correctly
                backgroundColor: 'var(--vscode-button-secondaryBackground,#5f6a79)',
                borderColor: BASE_STYLES.secondary.backgroundColor,
                color: BASE_STYLES.secondary.color,
                ...(primary && {
                    color: BASE_STYLES.color,
                    backgroundColor: BASE_STYLES.primary.backgroundColor,
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
                color: BASE_STYLES.color,
                backgroundColor: 'var(--vscode-button-hoverBackground)',
                borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                selectors: {
                    [ICON_SELECTOR]: {
                        fill: BASE_STYLES.color
                    },

                    '&:hover': {
                        color: BASE_STYLES.color,
                        backgroundColor: 'var(--vscode-button-hoverBackground)',
                        borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                        selectors: {
                            [ICON_SELECTOR]: {
                                fill: BASE_STYLES.color
                            }
                        }
                    }
                }
            },
            splitButtonDivider: dividerStyle,
            splitButtonDividerDisabled: dividerStyle,
            splitButtonContainerFocused: {
                '.ms-Fabric--isFocusVisible &:focus:after': {
                    border: 'none',
                    outlineColor: 'var(--vscode-focusBorder)',
                    inset: -2
                }
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const defaultMenuIconProps = this.props.menuProps?.items
            ? {
                  // Overwrite build-in fluentui icon
                  iconName: UiIcons.ArrowDown
              }
            : undefined;
        return (
            <DefaultButton
                menuIconProps={defaultMenuIconProps}
                {...this.props}
                styles={this.setStyle(this.props)}
                menuAs={UIContextualMenu}
            />
        );
    }
}
