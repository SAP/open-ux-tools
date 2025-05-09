import React from 'react';

import type { ITextFieldProps, ITextFieldStyleProps, ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import type { UIMessagesExtendedProps, InputValidationMessageInfo } from '../../helper/ValidationMessage';
import { getMessageInfo } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';
import { REQUIRED_LABEL_INDICATOR } from '../types';

export { ITextField, ITextFieldProps } from '@fluentui/react';

export type UITextInputProps = ITextFieldProps & UIMessagesExtendedProps;

export const COMMON_INPUT_STYLES = {
    borderRadius: 2
};

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

export type InputRenderProps = React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>;

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

        this.onRenderInput = this.onRenderInput.bind(this);
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
     * Method returns styles for text field.
     *
     * @param {ITextFieldStyleProps} props Component properties.
     * @returns {Partial<ITextFieldStyles>} Styles to apply for text field.
     */
    private getStyles = (props: ITextFieldStyleProps): Partial<ITextFieldStyles> => {
        const messageInfo = getMessageInfo(this.props);
        return {
            ...{
                root: {
                    height: 'auto'
                },
                fieldGroup: [
                    // Common styles
                    {
                        backgroundColor: COLOR_STYLES.regular.backgroundColor,
                        borderWidth: 1,
                        borderStyle: COLOR_STYLES.regular.borderStyle,
                        borderColor: COLOR_STYLES.regular.borderColor,
                        color: COLOR_STYLES.regular.color,
                        borderRadius: COMMON_INPUT_STYLES.borderRadius,
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
                        borderRadius: COMMON_INPUT_STYLES.borderRadius
                    },
                    // Read only container - disable hover style
                    this.props.readOnly && {
                        borderStyle: COLOR_STYLES.readOnly.borderStyle,
                        backgroundColor: COLOR_STYLES.readOnly.backgroundColor,
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
                                border: this.getFocusBorder(messageInfo),
                                borderRadius: COMMON_INPUT_STYLES.borderRadius
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
                        borderRadius: COMMON_INPUT_STYLES.borderRadius,
                        selectors: {
                            '::placeholder': {
                                fontSize: 13,
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
                                        content: REQUIRED_LABEL_INDICATOR,
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

    /**
     * Method to extend HTML input element.
     * Custom rendering is used to use "readonly" attribute instead of "disabled" to make disabled field focusable.
     *
     * @param {InputRenderProps} [props] Input props.
     * @param {(props?: InputRenderProps) => JSX.Element | null} [defaultRender] Default renderer.
     * @returns {JSX.Element | null} Input element to render.
     */
    private onRenderDisabledInput(
        props?: InputRenderProps,
        defaultRender?: (props?: InputRenderProps) => JSX.Element | null
    ): JSX.Element | null {
        const inputProps = this.props.disabled
            ? {
                  ...props,
                  disabled: undefined,
                  readOnly: true,
                  ['aria-disabled']: true
              }
            : props;
        return defaultRender?.(inputProps) || null;
    }

    /**
     * Method to render HTML input element.
     *
     * @param {InputRenderProps} [props] Input props.
     * @param {(props?: InputRenderProps) => JSX.Element | null} [defaultRender] Default renderer.
     * @returns {JSX.Element | null} Input element to render.
     */
    private onRenderInput(
        props?: InputRenderProps,
        defaultRender?: (props?: InputRenderProps) => JSX.Element | null
    ): JSX.Element | null {
        if (this.props.onRenderInput) {
            return this.props.onRenderInput(props, (renderProps?: InputRenderProps): JSX.Element | null => {
                return this.onRenderDisabledInput(renderProps, defaultRender);
            });
        }
        return this.onRenderDisabledInput(props, defaultRender);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        const textFieldStyles = this.getStyles;
        return (
            <TextField
                {...this.props}
                onRenderInput={this.onRenderInput}
                errorMessage={messageInfo.message}
                styles={textFieldStyles}
            />
        );
    }
}
