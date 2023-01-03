import React from 'react';

import type { ITextFieldProps, ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import type { UIMessagesExtendedProps } from '../../helper/ValidationMessage';
import { getMessageInfo } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';

export { ITextField, ITextFieldProps } from '@fluentui/react';

export type UITextInputProps = ITextFieldProps & UIMessagesExtendedProps;

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
                            backgroundColor: 'var(--vscode-input-background)',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: 'var(--vscode-editorWidget-border)',
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
                                    borderColor: 'var(--vscode-focusBorder)'
                                }
                            }
                        },
                        // Disabled field
                        props.disabled &&
                        !props.multiline && {
                            color: 'var(--vscode-input-foreground)',
                            opacity: 0.4,
                            borderRadius: 0
                        },
                        // Read only container - disable hover style
                        this.props.readOnly && {
                            borderStyle: 'dashed',
                            // No hover efect on input without value
                            selectors: !this.props.value ? {
                                '&:hover': {
                                    borderColor: 'var(--vscode-editorWidget-border)'
                                }
                            } : undefined
                        },
                        // Error message
                        props.hasErrorMessage && {
                            borderColor: messageInfo.style.borderColor
                        },
                        props.focused && {
                            selectors: {
                                ':after': {
                                    border: `1px solid var(${this.props.errorMessage ? messageInfo.style.borderColor : '--vscode-focusBorder'
                                        })`
                                }
                            }
                        },
                    ],
                    field: [
                        // Common styles
                        {
                            backgroundColor: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
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
                            backgroundColor: 'var(--vscode-editor-background)'
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
                                    opacity: '0.4'
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
