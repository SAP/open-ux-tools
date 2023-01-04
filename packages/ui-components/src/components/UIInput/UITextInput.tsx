import React from 'react';

import type { ITextFieldProps, ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import type { UIMessagesExtendedProps, InputValidationMessageInfo } from '../../helper/ValidationMessage';
import { getMessageInfo } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';

export { ITextField, ITextFieldProps } from '@fluentui/react';

export type UITextInputProps = ITextFieldProps & UIMessagesExtendedProps;

const COLOR_STYLES = {
    regular: {
        backgroundColor: 'var(--vscode-input-background)',
        borderColor: 'var(--vscode-editorWidget-border)',
        color: 'var(--vscode-input-foreground)',
        borderStyle: 'solid'
    },
    disabled: {
        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
        opacity: 0.5
    },
    readOnly: {
        backgroundColor: 'var(--vscode-editor-background)',
        borderStyle: 'dashed'
    },
    hover: {
        borderColor: 'var(--vscode-focusBorder)'
    },
    focus: {
        borderColor: 'var(--vscode-focusBorder)'
    }
};

/**
 * UITextInput component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/textfield
 *
 * @exports
 * @class UITextInput
 * @extends {React.Component<ITextFieldProps, {}>}
 */
export class UITextInput extends React.Component<UITextInputProps> {
    /**
     * Initializes component properties.
     *
     * @param {UITextInputProps} props
     */
    public constructor(props: UITextInputProps) {
        super(props);
    }

    /**
     * Method returns value for CSS property "border" for focus state.
     *
     * @param {InputValidationMessageInfo} messageInfo
     * @returns {string} Value for CSS "border" property.
     */
    private getFocusBorder(messageInfo: InputValidationMessageInfo): string {
        let color = COLOR_STYLES.focus.borderColor;
        if (this.props.errorMessage && messageInfo.style.borderColor) {
            color = `var(${messageInfo.style.borderColor})`;
        }
        return `1px ${COLOR_STYLES.regular.borderStyle} ${color}`;
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        const textFieldStyles = (props: ITextFieldStyleProps): Partial<ITextFieldStyles> => {
            return {
                ...{
                    root: {
                        height: 'auto',
                        fontFamily: 'var(--vscode-font-family)'
                    },
                    fieldGroup: [
                        // Common styles
                        {
                            backgroundColor: COLOR_STYLES.regular.backgroundColor,
                            borderWidth: 1,
                            borderStyle: COLOR_STYLES.regular.borderStyle,
                            borderColor: COLOR_STYLES.regular.borderColor,
                            color: COLOR_STYLES.regular.color,
                            borderRadius: 0,
                            boxSizing: 'initial'
                        },
                        // Single line common styles
                        !props.multiline && {
                            height: 24,
                            maxHeight: 24,
                            minHeight: 24
                        },
                        // Hoverable input
                        !props.disabled && {
                            selectors: {
                                '&:hover': {
                                    borderColor: COLOR_STYLES.hover.borderColor
                                }
                            }
                        },
                        // Disabled field
                        props.disabled && {
                            backgroundColor: COLOR_STYLES.disabled.backgroundColor,
                            opacity: COLOR_STYLES.disabled.opacity,
                            borderRadius: 0
                        },
                        // Read only container - disable hover style
                        this.props.readOnly && {
                            borderStyle: COLOR_STYLES.readOnly.borderStyle,
                            // No hover efect on input without value
                            selectors: !this.props.value
                                ? {
                                      '&:hover': {
                                          borderColor: 'var(--vscode-editorWidget-border)'
                                      }
                                  }
                                : undefined
                        },
                        // Error message
                        props.hasErrorMessage && {
                            borderColor: messageInfo.style.borderColor
                        },
                        props.focused && {
                            selectors: {
                                ':after': {
                                    border: this.getFocusBorder(messageInfo)
                                }
                            }
                        }
                    ],
                    field: [
                        // Common styles
                        {
                            backgroundColor: COLOR_STYLES.regular.backgroundColor,
                            color: COLOR_STYLES.regular.color,
                            fontSize: '13px',
                            fontWeight: 'normal',
                            boxSizing: 'border-box',
                            selectors: {
                                '::placeholder': {
                                    fontSize: 13,
                                    fontFamily: 'var(--vscode-font-family)',
                                    color: 'var(--vscode-input-placeholderForeground)'
                                }
                            }
                        },
                        // Single line common styles
                        !props.multiline && {
                            lineHeight: 'normal'
                        },
                        // Multi line common styles
                        props.multiline && {
                            minHeight: '60px',
                            height: 'auto',
                            display: 'flex'
                        },
                        // Disabled input
                        props.disabled && {
                            backgroundColor: 'transparent'
                        },
                        // Readonly input
                        this.props.readOnly && {
                            fontStyle: 'italic',
                            backgroundColor: COLOR_STYLES.readOnly.backgroundColor
                        },
                        // Input with icon
                        props.hasIcon && {
                            selectors: {
                                '&:hover': {
                                    cursor: 'pointer'
                                }
                            }
                        }
                    ],
                    suffix: {
                        backgroundColor: 'var(--vscode-input-background)'
                    },
                    subComponentStyles: {
                        label: {
                            root: [
                                {
                                    marginTop: 25,
                                    ...labelGlobalStyle
                                },
                                props.disabled && {
                                    opacity: COLOR_STYLES.disabled.opacity
                                },
                                props.required && {
                                    selectors: {
                                        '::after': {
                                            content: `' *'`,
                                            color: 'var(--vscode-inputValidation-errorBorder)',
                                            paddingRight: 12
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    errorMessage: [messageInfo.style],
                    icon: [
                        {
                            bottom: 2
                        }
                    ]
                }
            };
        };

        return <TextField {...this.props} errorMessage={messageInfo.message} styles={textFieldStyles} />;
    }
}
