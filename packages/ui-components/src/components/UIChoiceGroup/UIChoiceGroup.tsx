import React from 'react';
import type {
    IChoiceGroupOption,
    IChoiceGroupProps,
    IChoiceGroupStyles,
    IChoiceGroupOptionProps
} from '@fluentui/react';
import { ChoiceGroup } from '@fluentui/react';
import { labelGlobalStyle } from '../UILabel';

export type ChoiceGroupOption = IChoiceGroupOption;
export type ChoiceGroupOptionProps = IChoiceGroupOptionProps;

export interface ChoiceGroupProps extends IChoiceGroupProps {
    // Render each radio option
    inline?: boolean;
}

// Reusable styles
const UI_CHOICE_GROUP_LABEL_STYLE = {
    fontSize: 13,
    family: 'var(--vscode-font-family)',
    disableOpacity: 0.4
};
const UI_CHOICE_GROUP_STYLES = {
    label: {
        ...UI_CHOICE_GROUP_LABEL_STYLE,
        color: 'var(--vscode-input-foreground)'
    },
    radio: {
        borderColor: 'var(--vscode-editorWidget-border)',
        background: 'var(--vscode-input-background)',
        bullet: {
            background: 'var(--vscode-input-foreground)'
        },
        hover: {
            background: 'var(--vscode-focusBorder)'
        },
        focus: {
            borderColor: 'var(--vscode-focusBorder)'
        },
        label: {
            ...UI_CHOICE_GROUP_LABEL_STYLE,
            color: 'var(--vscode-foreground)'
        }
    }
};

/**
 * UIChoiceGroup component.
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/choicegroup
 *
 * @exports
 * @class UIChoiceGroup
 * @extends {React.Component<IChoiceGroupProps, {}>}
 */
export class UIChoiceGroup extends React.Component<ChoiceGroupProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {ChoiceGroupProps} props
     */
    public constructor(props: ChoiceGroupProps) {
        super(props);
    }

    setStyles = (): Partial<IChoiceGroupStyles> => {
        return {
            root: {
                // Label
                '.ms-ChoiceFieldGroup label.ms-Label': {
                    fontWeight: 'bold',
                    fontSize: UI_CHOICE_GROUP_STYLES.label.fontSize,
                    fontStyle: 'normal',
                    lineHeight: 15,
                    color: UI_CHOICE_GROUP_STYLES.label.color,
                    marginTop: 10,
                    padding: 0
                },
                // Choice/Radio field
                '.ms-ChoiceField': {
                    minHeight: 20
                },
                '.ms-ChoiceField-field': {
                    fontWeight: 'normal',
                    fontSize: UI_CHOICE_GROUP_STYLES.radio.label.fontSize,
                    fontStyle: 'normal',
                    lineHeight: 18,
                    color: UI_CHOICE_GROUP_STYLES.radio.label.color,
                    margin: 0
                },
                '.ms-ChoiceField-field::before': {
                    backgroundColor: UI_CHOICE_GROUP_STYLES.radio.background,
                    borderColor: UI_CHOICE_GROUP_STYLES.radio.borderColor,
                    top: 0,
                    left: 0,
                    width: 18,
                    height: 18
                },
                '.ms-ChoiceField-field::after': {
                    left: 5,
                    top: 5,
                    height: 8,
                    width: 8,
                    borderWidth: 4,
                    backgroundColor: UI_CHOICE_GROUP_STYLES.radio.background,
                    // Remove animation
                    transition: 'none'
                },
                // Option Label
                '.ms-ChoiceFieldLabel': {
                    paddingLeft: 26
                },
                // Checked/Selected
                '.ms-ChoiceField-field.is-checked::after': {
                    borderColor: UI_CHOICE_GROUP_STYLES.radio.bullet.background
                },
                // Hover
                '.ms-ChoiceField-field:hover': {
                    'span.ms-ChoiceFieldLabel': {
                        color: UI_CHOICE_GROUP_STYLES.radio.label.color
                    },
                    '::before': {
                        borderColor: UI_CHOICE_GROUP_STYLES.radio.hover.background
                    },
                    '::after': {
                        borderColor: 'transparent',
                        background: 'transparent'
                    }
                },
                // Hover + selected
                'label.ms-ChoiceField-field.is-checked:hover::after': {
                    borderColor: UI_CHOICE_GROUP_STYLES.radio.bullet.background
                },
                // Focus
                '.ms-ChoiceField-wrapper.is-inFocus::after': {
                    borderColor: UI_CHOICE_GROUP_STYLES.radio.focus.borderColor
                },
                '.ms-ChoiceField-input:focus': {
                    opacity: 0
                },
                // Disabled State
                '.is-disabled + .ms-ChoiceField-field': {
                    ' .ms-ChoiceFieldLabel': {
                        opacity: UI_CHOICE_GROUP_STYLES.radio.label.disableOpacity,
                        color: UI_CHOICE_GROUP_STYLES.radio.label.color
                    },
                    ':hover::before': {
                        borderColor: UI_CHOICE_GROUP_STYLES.radio.borderColor
                    },
                    ':after': {
                        opacity: UI_CHOICE_GROUP_STYLES.radio.label.disableOpacity
                    }
                }
            },
            label: {
                ...labelGlobalStyle,
                ...(this.props.disabled && {
                    opacity: UI_CHOICE_GROUP_STYLES.label.disableOpacity,
                    color: UI_CHOICE_GROUP_STYLES.label.color
                }),
                ...(this.props.required && {
                    selectors: {
                        '::after': {
                            content: `' *'`,
                            color: 'var(--vscode-inputValidation-errorBorder)',
                            paddingRight: 12
                        }
                    }
                })
            },
            ...(this.props.inline && {
                flexContainer: {
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    selectors: {
                        '> .ms-ChoiceField': {
                            paddingRight: 16
                        }
                    }
                }
            })
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <ChoiceGroup styles={this.setStyles} {...this.props} />;
    }
}
