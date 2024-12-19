import React from 'react';
import ReactDOM from 'react-dom';
import type { IToggleProps, IToggleStyleProps, IToggleStyles } from '@fluentui/react';
import { Toggle } from '@fluentui/react';

import type { UIComponentMessagesProps } from '../../helper/ValidationMessage';
import { getMessageInfo, MessageWrapper } from '../../helper/ValidationMessage';
import { UIIcon } from '../UIIcon';
import { UiIcons } from '../Icons';

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
    width?: number;
    height?: number;
    padding?: string;
    margin?: string;
    label: {
        fontSize?: number;
        padding?: string;
    };
    circle: {
        width?: number;
        height?: number;
        borderWidth?: number;
    };
}
const TOGGLE_SIZE = {
    width: 30,
    height: 18,
    padding: '0 1px',
    margin: '0px 6px 0px 6px',
    label: {
        fontSize: 13,
        padding: '0px 0px 1px 0px'
    },
    circle: {
        width: 14,
        height: 14,
        borderWidth: 1
    }
};

const ICON_STYLE = new Map<boolean, React.CSSProperties>([
    [
        true,
        {
            position: 'relative',
            top: -9,
            left: 0
        }
    ],
    [
        false,
        {
            position: 'relative',
            top: -11,
            left: 0
        }
    ]
]);

const DISABLED_OPACITY = 0.4;

const COLORS = {
    pill: {
        unchecked: {
            background: 'var(--vscode-editorWidget-background)',
            borderColor: 'var(--vscode-editorWidget-border)',
            hover: {
                background: 'var(--vscode-editorWidget-background)',
                borderColor: 'var(--vscode-editorWidget-border)'
            }
        },
        checked: {
            background: 'var(--vscode-editorWidget-background)',
            borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-editorWidget-border))',
            hover: {
                background: 'var(--vscode-editorWidget-background)',
                borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-editorWidget-border))'
            }
        },
        focus: {
            outline: '1px solid var(--vscode-focusBorder) !important'
        }
    },
    thumb: {
        unchecked: {
            background: 'var(--vscode-button-secondaryBackground)',
            borderColor: 'var(--vscode-button-border, transparent)',
            hover: {
                borderColor: 'var(--vscode-button-border, transparent)',
                background: 'var(--vscode-contrastBorder, var(--vscode-button-secondaryHoverBackground))'
            }
        },
        checked: {
            background: 'var(--vscode-button-background)',
            borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
            hover: {
                borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-border, transparent))',
                background: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))'
            }
        }
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
    private readonly toggleRootRef: React.RefObject<HTMLDivElement>;
    /**
     * Initializes component properties.
     *
     * @param {UIToggleProps} props
     */
    public constructor(props: UIToggleProps) {
        super(props);
        this.toggleRootRef = React.createRef<HTMLDivElement>();
        this.handleChange = this.handleChange.bind(this);
        this.replaceThumbWithIcon = this.replaceThumbWithIcon.bind(this);
    }

    /**
     * Lifecycle method called immediately after a component is mounted.
     * Executes initialization logic such as DOM manipulations or fetching data.
     *
     * @returns {void} This method does not return a value.
     */
    componentDidMount() {
        this.replaceThumbWithIcon(this.props.checked ?? this.props.defaultChecked);
    }

    /**
     * Determines whether the component should update when the new props are received.
     * This method is typically used for performance optimization.
     *
     * @param {UIToggleProps} nextProps - The next props to be received by the component.
     * @returns {boolean} A boolean value indicating whether the component should update.
     */
    shouldComponentUpdate(nextProps: UIToggleProps): boolean {
        if (nextProps.checked !== this.props.checked) {
            this.replaceThumbWithIcon(nextProps.checked);
        }
        return true;
    }

    /**
     * Handles the change event triggered by the user interaction.
     *
     * @param {React.MouseEvent<HTMLElement>} event - The mouse event object associated with the interaction.
     * @param {boolean} [checked] - An optional parameter indicating the current state of the interaction.
     * @returns {void} This method does not return a value.
     */
    handleChange(event: React.MouseEvent<HTMLElement>, checked?: boolean) {
        this.replaceThumbWithIcon(checked);
        this.props.onChange?.(event, checked);
    }

    /**
     * Replaces the thumb element of a toggle switch with an icon based on the toggle's state.
     *
     * @param {boolean} [checked] Optional. Represents the state of the toggle switch. If not provided, it checks `defaultChecked` prop or defaults to `false`.
     * @returns {void} Does not return a value.
     */
    replaceThumbWithIcon(checked = false): void {
        if (this.toggleRootRef.current) {
            const thumbElement = (this.toggleRootRef.current as HTMLElement)?.querySelector('.ms-Toggle-thumb');

            if (thumbElement) {
                const style = ICON_STYLE.get(checked);
                ReactDOM.render(
                    <UIIcon iconName={checked ? UiIcons.SwitchOn : UiIcons.SwitchOff} style={style} />,
                    thumbElement
                );
            }
        }
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
        const { inlineLabelLeft, labelFlexGrow, inlineLabel } = this.props;
        const sizeInfo: UIToggleSizeInfo | undefined = TOGGLE_SIZE;
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
                    borderColor: COLORS.pill.checked.borderColor,
                    borderStyle: 'solid',
                    ':hover': {
                        background: COLORS.pill.checked.hover.background,
                        borderColor: COLORS.pill.checked.hover.borderColor
                    },
                    ':disabled': {
                        background: COLORS.pill.checked.background,
                        borderColor: COLORS.pill.checked.borderColor,
                        opacity: DISABLED_OPACITY
                    },
                    ...(!styleProps.checked && {
                        background: COLORS.pill.unchecked.background,
                        borderColor: COLORS.pill.unchecked.borderColor,
                        borderStyle: 'solid',
                        // This is a bug: the best implementation approach is to set hover styles in the "thumb" section.
                        // However, the hover styles for the unchecked thumb don't work properly
                        ':hover .ms-Toggle-thumb': {
                            background: COLORS.thumb.unchecked.hover.background,
                            borderColor: COLORS.thumb.unchecked.hover.borderColor
                        },
                        ':hover': {
                            background: COLORS.pill.unchecked.hover.background,
                            borderColor: COLORS.pill.unchecked.hover.borderColor
                        },
                        ':disabled': {
                            background: COLORS.pill.unchecked.background,
                            borderColor: COLORS.pill.unchecked.borderColor,
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
                    backgroundPosition: 'center',
                    borderColor: COLORS.thumb.checked.borderColor,
                    backgroundColor: COLORS.thumb.checked.background,
                    ':hover': {
                        background: COLORS.thumb.checked.hover.background,
                        borderColor: COLORS.thumb.checked.hover.borderColor
                    },
                    ...(!styleProps.checked && {
                        borderColor: COLORS.thumb.unchecked.borderColor,
                        backgroundColor: COLORS.thumb.unchecked.background
                    })
                }
            };
        };

        const toggleComponent = (
            <div ref={this.toggleRootRef}>
                <Toggle {...this.props} styles={styles} onChange={this.handleChange}></Toggle>
            </div>
        );

        return messageInfo.message ? (
            <MessageWrapper message={messageInfo}>{toggleComponent}</MessageWrapper>
        ) : (
            toggleComponent
        );
    }
}
