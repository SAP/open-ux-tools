import React from 'react';
import ReactDOM from 'react-dom';
import type { IToggleProps, IToggleStyleProps, IToggleStyles } from '@fluentui/react';
import { Toggle } from '@fluentui/react';

import type { UIComponentMessagesProps } from '../../helper/ValidationMessage';
import { getMessageInfo, MessageWrapper } from '../../helper/ValidationMessage';
import { UIIcon } from '../UIIcon';

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

const TOGGLE_SIZES = new Map<UIToggleSize, UIToggleSizeInfo>([
    [
        UIToggleSize.Standard,
        {
            width: 30,
            height: 18,
            padding: '0 2px',
            margin: '0',
            label: {
                fontSize: 13,
                padding: ''
            },
            circle: {
                width: 14,
                height: 14
            }
        }
    ],
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

const getIconStyleKey = (size: UIToggleSize, isSwitchOn: boolean): string => {
    return `${size}-${isSwitchOn ? 'on' : 'off'}`;
};

const ICON_STYLE = new Map<string, React.CSSProperties>([
    [
        getIconStyleKey(UIToggleSize.Standard, true),
        {
            position: 'relative',
            top: -13,
            left: -2
        }
    ],
    [
        getIconStyleKey(UIToggleSize.Standard, false),
        {
            position: 'relative',
            top: -16,
            left: -3
        }
    ],
    [
        getIconStyleKey(UIToggleSize.Small, true),
        {
            position: 'relative',
            top: -15,
            left: -3
        }
    ],
    [
        getIconStyleKey(UIToggleSize.Small, false),
        {
            position: 'relative',
            top: -17,
            left: -4
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
    private toggleRootRef: React.RefObject<HTMLDivElement>;
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
     * @return {void} This method does not return a value.
     */
    componentDidMount() {
        this.replaceThumbWithIcon();
    }

    /**
     * Handles the change event triggered by the user interaction.
     *
     * @param {React.MouseEvent<HTMLElement>} event - The mouse event object associated with the interaction.
     * @param {boolean} [checked] - An optional parameter indicating the current state of the interaction.
     * @return {void} This method does not return a value.
     */
    handleChange(event: React.MouseEvent<HTMLElement>, checked?: boolean) {
        this.replaceThumbWithIcon(checked);
        this.props.onChange?.(event, checked);
    }

    /**
     * Replaces the thumb element of a toggle switch with an icon based on the toggle's state.
     *
     * @param {boolean} [checked] Optional. Represents the state of the toggle switch. If not provided, it checks `defaultChecked` prop or defaults to `false`.
     * @return {void} Does not return a value.
     */
    replaceThumbWithIcon(checked?: boolean) {
        const isSwitchOn = checked ?? this.props.defaultChecked ?? false;
        if (this.toggleRootRef.current) {
            const thumbElement = (this.toggleRootRef.current as HTMLElement)?.querySelector('.ms-Toggle-thumb');

            if (thumbElement) {
                const style = ICON_STYLE.get(getIconStyleKey(this.props.size ?? UIToggleSize.Standard, isSwitchOn));
                ReactDOM.render(
                    <UIIcon iconName={isSwitchOn ? 'SwitchOn' : 'SwitchOff'} style={style} />,
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
        const { inlineLabelLeft, labelFlexGrow, size, inlineLabel } = this.props;
        const sizeInfo: UIToggleSizeInfo | undefined = TOGGLE_SIZES.get(size ?? UIToggleSize.Standard);
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
                    backgroundPosition: 'center',
                    backgroundColor: COLORS.thumb.background
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
