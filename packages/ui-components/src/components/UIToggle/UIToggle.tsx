import React from 'react';
import ReactDOM from 'react-dom';
import type { IToggleProps, IToggleStyleProps, IToggleStyles } from '@fluentui/react';
import { Toggle } from '@fluentui/react';

import type { UIComponentMessagesProps } from '../../helper/ValidationMessage';
import { getMessageInfo, MessageWrapper } from '../../helper/ValidationMessage';
import { UIIcon } from '../UIIcon';
import { renderToStaticMarkup } from 'react-dom/server';

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
    private toggleRootRef: React.RefObject<HTMLDivElement>;
    /**
     * Initializes component properties.
     *
     * @param {UIToggleProps} props
     */
    public constructor(props: UIToggleProps) {
        super(props);
        this.toggleRootRef = React.createRef<HTMLDivElement>();
    }
    componentDidMount() {
        this.replaceThumbWithIcon();
    }

    replaceThumbWithIcon() {
        if (this.toggleRootRef.current) {
            const thumbElement = (this.toggleRootRef.current as HTMLElement)?.querySelector('.ms-Toggle-thumb');

            if (thumbElement) {
                ReactDOM.render(<UIIcon iconName="SwitchOn" />, thumbElement);
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

    svgToDataUri() {
        const icon = (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15">
                <path
                    fill={'#84C881'}
                    fillRule="evenodd"
                    d="M7.497,10.97678 C7.365,10.97478 7.239,10.92078 7.147,10.82678 L4.147,7.82678 C3.951,7.63078 3.951,7.31278 4.147,7.11678 C4.343,6.92078 4.661,6.92078 4.857,7.11678 L7.477,9.71678 L11.107,5.15678 C11.296,4.95578 11.613,4.94678 11.814,5.13678 C11.991,5.30378 12.022,5.57378 11.887,5.77678 L7.887,10.77678 C7.799,10.88778 7.668,10.95678 7.527,10.96678 L7.497,10.97678 Z M8,1 C11.86,1 15,4.14 15,8 C15,11.86 11.86,15 8,15 C4.14,15 1,11.86 1,8 C1,4.14 4.14,1 8,1 M8,0 C3.582,0 0,3.582 0,8 C0,12.418 3.582,16 8,16 C12.418,16 16,12.418 16,8 C16,3.582 12.418,0 8,0"
                />
            </svg>
        );
        // const icon = icons[UiIcons.ConfirmationCheckSymbol] as React.ReactElement;
        const svgString = renderToStaticMarkup(icon);

        console.log('svgString', icon, svgString, `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`);
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
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
                    ':hover': {
                        backgroundColor: COLORS.thumb.background
                    }
                }
            };
        };

        const toggleComponent = (
            <div ref={this.toggleRootRef}>
                <Toggle {...this.props} styles={styles}></Toggle>
            </div>
        );

        return messageInfo.message ? (
            <MessageWrapper message={messageInfo}>{toggleComponent}</MessageWrapper>
        ) : (
            toggleComponent
        );
    }
}
