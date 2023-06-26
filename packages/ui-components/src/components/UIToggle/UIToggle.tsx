import React from 'react';

import type { IToggleProps, IToggleStyleProps, IToggleStyles } from '@fluentui/react';
import { Toggle } from '@fluentui/react';

import type { UIComponentMessagesProps } from '../../helper/ValidationMessage';
import { getMessageInfo, MessageWrapper } from '../../helper/ValidationMessage';

export interface UIToggleProps extends IToggleProps, UIComponentMessagesProps {
    inlineLabelLeft?: boolean;
    labelFlexGrow?: boolean;
    // Default is 'Standard'
    size?: UIToggleSize;
}

export enum UIToggleSize {
    Standard = 'Standard',
    Small = 'Small'
}

interface UIToggleSizeInfo {
    width: number;
    height: number;
    padding: string;
    margin: string;
    label: {
        fontSize: number;
        padding: string;
    };
    circle: {
        width: number;
        height: number;
        borderWidth: number;
    };
}

const TOGGLE_SIZES = new Map<UIToggleSize, UIToggleSizeInfo>([
    [
        UIToggleSize.Small,
        {
            width: 30,
            height: 14,
            padding: '0 2px',
            margin: '0',
            label: {
                fontSize: 13,
                padding: '2px 0'
            },
            circle: {
                width: 10,
                height: 10,
                borderWidth: 5
            }
        }
    ]
]);

const DISABLED_OPACITY = 0.4;

const COLORS = {
    pill: {
        borderColor: 'var(--vscode-contrastBorder, transparent)',
        unchecked: {
            background: 'var(--vscode-titleBar-inactiveForeground)',
            hover: {
                background: 'var(--vscode-editorHint-foreground)',
                borderColor: 'var(--vscode-contrastActiveBorder, transparent)'
            }
        },
        checked: {
            background: 'var(--vscode-button-background)',
            hover: {
                background: 'var(--vscode-button-hoverBackground)',
                borderColor: 'var(--vscode-contrastActiveBorder, transparent)'
            }
        },
        focus: {
            outline: '1px solid var(--vscode-focusBorder) !important'
        }
    },
    thumb: {
        background: 'var(--vscode-button-foreground)'
    }
};

/**
 * UIToggle component.
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/toggle
 *
 * @exports
 * @class UIToggle
 * @extends {React.Component<IToggleProps, {}>}
 */
export class UIToggle extends React.Component<UIToggleProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UIToggleProps} props
     */
    public constructor(props: UIToggleProps) {
        super(props);
    }

    /**
     * Method returns size of margin bottom for root container depending on current props state.
     *
     * @param {string} [message] Validation message.
     * @returns {number | undefined} Value for margin bottom.
     */
    getMarginBottom(message?: string): number | undefined {
        const { inlineLabel } = this.props;
        if (message) {
            return inlineLabel ? 0 : 4;
        }
        return undefined;
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const { inlineLabelLeft, labelFlexGrow, size, inlineLabel } = this.props;
        const sizeInfo: UIToggleSizeInfo | undefined = TOGGLE_SIZES.get(size || UIToggleSize.Standard);
        const messageInfo = getMessageInfo(this.props);

        const styles = (styleProps: IToggleStyleProps): Partial<IToggleStyles> => {
            return {
                root: {
                    ...(labelFlexGrow && {
                        flexGrow: 1
                    }),
                    margin: sizeInfo?.margin,
                    marginBottom: this.getMarginBottom(messageInfo.message)
                },
                label: {
                    color: 'var(--vscode-foreground)',
                    fontWeight: 'normal',
                    fontSize: sizeInfo?.label.fontSize,
                    padding: sizeInfo?.label.padding,
                    ...(inlineLabel && { marginLeft: 10 }),
                    ...(inlineLabelLeft && {
                        order: 0,
                        marginLeft: 0,
                        marginRight: 10
                    }),
                    ...(labelFlexGrow && {
                        flexGrow: 1
                    }),
                    opacity: this.props.disabled ? DISABLED_OPACITY : 'inherit'
                },
                pill: {
                    height: sizeInfo?.height,
                    width: sizeInfo?.width,
                    padding: sizeInfo?.padding,
                    background: COLORS.pill.checked.background,
                    borderColor: COLORS.pill.borderColor,
                    borderStyle: 'solid',
                    ':hover': {
                        background: COLORS.pill.checked.hover.background,
                        borderColor: COLORS.pill.checked.hover.borderColor
                    },
                    [`:hover .ms-Toggle-thumb`]: {
                        backgroundColor: COLORS.thumb.background
                    },
                    ':disabled': {
                        background: COLORS.pill.checked.background,
                        borderColor: COLORS.pill.borderColor,
                        opacity: DISABLED_OPACITY
                    },
                    ...(!styleProps.checked && {
                        background: COLORS.pill.unchecked.background,
                        borderStyle: 'dashed',
                        ':hover': {
                            background: COLORS.pill.unchecked.hover.background,
                            borderColor: COLORS.pill.unchecked.hover.borderColor
                        },
                        [`:hover .ms-Toggle-thumb`]: {
                            backgroundColor: COLORS.thumb.background
                        },
                        ':disabled': {
                            background: COLORS.pill.unchecked.background,
                            borderColor: COLORS.pill.borderColor,
                            opacity: DISABLED_OPACITY
                        }
                    }),
                    selectors: {
                        ':focus::after': {
                            // Overwrite flunt ui focus borders
                            border: 'none !important',
                            outline: COLORS.pill.focus.outline
                        }
                    }
                },
                thumb: {
                    height: sizeInfo?.circle.height,
                    width: sizeInfo?.circle.width,
                    borderWidth: sizeInfo?.circle.borderWidth,
                    background: COLORS.thumb.background,
                    ':hover': {
                        backgroundColor: COLORS.thumb.background
                    }
                }
            };
        };

        const toogleComponent = <Toggle {...this.props} styles={styles} />;
        return messageInfo.message ? (
            <MessageWrapper message={messageInfo}>{toogleComponent}</MessageWrapper>
        ) : (
            toogleComponent
        );
    }
}
