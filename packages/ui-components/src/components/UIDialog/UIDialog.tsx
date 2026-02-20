import React from 'react';
import type { IDialogProps, IDialogFooterProps } from '@fluentui/react';
import { Dialog as BaseDialog, DialogFooter } from '@fluentui/react';
import { UIDefaultButton } from '../UIButton';
import { deepMerge } from '../../utilities/DeepMerge';

import '../../styles/_shadows.scss';

export interface DialogProps extends IDialogProps {
    // Accept and cancel buttons options
    acceptButtonText?: string;
    cancelButtonText?: string;
    acceptButtonId?: string;
    cancelButtonId?: string;
    onAccept?: () => void;
    onCancel?: () => void;
    // Scroll area - default is content
    scrollArea?: UIDialogScrollArea;
    // Default is false
    closeButtonVisible?: boolean;
    // Custom footer using JSX element
    footer?: React.ReactElement | React.ReactElement[];
    // Header render in single or multi lines
    // Default is single line
    multiLineTitle?: boolean;
    /**
     * The title text to display at the top of the dialog.
     */
    title?: string | JSX.Element;
    // Is dialog open should be animated with fade in animation
    // Default value for "isOpenAnimated" is "true"
    isOpenAnimated?: boolean;
}

export const DIALOG_MAX_HEIGHT_OFFSET = 32;

export const DIALOG_STYLES = {
    background: 'var(--vscode-editorWidget-background)',
    boxShadow: 'var(--ui-box-shadow-medium)',
    borderColor: 'var(--vscode-editorWidget-border)',
    borderRadius: 4,
    vPadding: 20,
    vPaddingHalf: 10,
    hPadding: 45,
    title: {
        color: 'var(--vscode-panelTitle-activeForeground)'
    },
    contentText: {
        fontSize: 13,
        color: 'var(--vscode-foreground)'
    },
    modalOverlay: {
        background: 'var(--vscode-editor-background)',
        opacity: 0.8
    }
};

export interface DialogState {
    resizeMaxHeight?: number;
    isMounted?: boolean;
}

export enum UIDialogScrollArea {
    // Header and footer freezed and content is scrollable
    Content = 'Content',
    // Whole dialog is scrollable - default FluentUI behaviour, but it is buggy with large content
    Dialog = 'Dialog'
}

/**
 * UIDialog component.
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/dialog
 * and https://app.abstract.com/projects/42046ab5-889d-4a59-88e6-1089e98cba67/branches/master/commits/f1fcd77447bb2b32aab3498311c1c39517e47e49/files/1455D538-559B-48EF-8D9F-1C2884ED540B/layers/AFDAAFD3-BFA6-4E96-BB6D-057DD13753E5
 *
 * @exports
 * @class UIDialog
 * @extends {React.Component<IDialogProps, {}>}
 */
export class UIDialog extends React.Component<DialogProps, DialogState> {
    // Default values for public component properties
    static readonly defaultProps = { isOpenAnimated: true };
    /**
     * Initializes component properties.
     *
     * @param {DialogProps} props
     */
    public constructor(props: DialogProps) {
        super(props);
        this.onResize = this.onResize.bind(this);
        this.onModalLayerMount = this.onModalLayerMount.bind(this);
        this.onModalLayerUnmount = this.onModalLayerUnmount.bind(this);
        this.attachResize = this.attachResize.bind(this);
        this.detachResize = this.detachResize.bind(this);
        this.onHeaderMouseDown = this.onHeaderMouseDown.bind(this);
        this.state = {
            resizeMaxHeight: this.getResizeMaxHeight(),
            isMounted: false
        };
    }

    /**
     * Called when component is rerendered.
     *
     * @param {Readonly<DialogProps>} prevProps
     */
    componentDidUpdate(prevProps: Readonly<DialogProps>): void {
        const { scrollArea } = this.props;
        if (prevProps.scrollArea !== scrollArea) {
            if (scrollArea === UIDialogScrollArea.Content) {
                this.attachResize();
            } else {
                this.detachResize();
            }
        }
    }

    /**
     * Method handles modal dialog mount event.
     */
    private onModalLayerMount(): void {
        this.attachResize();
        this.setState({
            isMounted: true
        });
    }

    /**
     * Method handles modal dialog unmount event.
     */
    private onModalLayerUnmount(): void {
        this.detachResize();
        this.setState({
            isMounted: false
        });
    }

    /**
     * Method attaches to window resize event.
     */
    private attachResize(): void {
        // Window resize handled
        window.addEventListener('resize', this.onResize);
        this.onResize();
    }

    /**
     * Method detaches from window resize event.
     */
    private detachResize(): void {
        window.removeEventListener('resize', this.onResize);
    }

    /**
     * Method handles window resizer event to update calculation for content scrollarea size.
     */
    private onResize(): void {
        this.setState({
            resizeMaxHeight: this.getResizeMaxHeight()
        });
    }

    /**
     * Method returns maximal height for dialog content "scrollArea=Content" mode.
     *
     * @returns {number} Max size of dialog.
     */
    private getResizeMaxHeight(): number {
        return window.innerHeight - DIALOG_MAX_HEIGHT_OFFSET;
    }

    /**
     * Method returns footer element depending in component props.
     * Three states.
     * 1. Accept/Decline buttons.
     * 2. Custom content of footer.
     * 3. No footer.
     *
     * @returns {JSX.Element | null} Footer element to render.
     */
    getFooter(): JSX.Element | undefined {
        let element;
        const { acceptButtonText, cancelButtonText, onAccept, onCancel, acceptButtonId, cancelButtonId, footer } =
            this.props;
        const dialogFooterProps: IDialogFooterProps = {
            styles: {
                actionsRight: {
                    width: '100%',
                    textAlign: 'center',
                    justifyContent: 'center',
                    margin: '0px'
                },
                actions: {
                    margin: `${DIALOG_STYLES.vPaddingHalf}px 0 ${DIALOG_STYLES.vPadding}px`,
                    lineHeight: 'auto'
                },
                action: {
                    margin: '0px 5px'
                }
            }
        };

        if (footer) {
            element = <DialogFooter {...dialogFooterProps}>{footer}</DialogFooter>;
        } else if (onAccept || onCancel) {
            element = (
                <DialogFooter {...dialogFooterProps}>
                    {onAccept ? (
                        <UIDefaultButton onClick={onAccept} primary style={{ height: '26px' }} id={acceptButtonId}>
                            {acceptButtonText}
                        </UIDefaultButton>
                    ) : (
                        ''
                    )}
                    {onCancel ? (
                        <UIDefaultButton onClick={onCancel} style={{ height: '26px' }} id={cancelButtonId}>
                            {cancelButtonText}
                        </UIDefaultButton>
                    ) : (
                        ''
                    )}
                </DialogFooter>
            );
        }
        return element;
    }

    /**
     * Method handles mousedown event for dialog header area.
     * Method added to handle scenario when we open dropdown menu and move dialog.
     * Code in method sets focus to focuszone's placeholder - it triggers close for opened dropdown menu.
     *
     * @param {React.MouseEvent} event Mousedown event
     */
    onHeaderMouseDown(event: React.MouseEvent): void {
        if (!this.props.modalProps?.dragOptions) {
            // No need to handle non draggable
            return;
        }
        const dialogFocusZone = (event.target as HTMLElement).closest('.ms-Dialog-main');
        if (dialogFocusZone?.firstChild) {
            const focusPlaceholder = dialogFocusZone.firstChild as HTMLElement;
            focusPlaceholder.focus();
        }
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const {
            acceptButtonText,
            cancelButtonText,
            onAccept,
            onCancel,
            acceptButtonId,
            cancelButtonId,
            footer,
            closeButtonVisible,
            multiLineTitle,
            scrollArea = UIDialogScrollArea.Content,
            children,
            ...rest
        } = this.props;
        const dialogProps: IDialogProps = {
            minWidth: '460px',
            modalProps: {
                layerProps: {
                    onLayerDidMount: this.onModalLayerMount,
                    onLayerWillUnmount: this.onModalLayerUnmount
                },
                overlay: {
                    styles: {
                        root: {
                            background: DIALOG_STYLES.modalOverlay.background,
                            opacity: DIALOG_STYLES.modalOverlay.opacity
                        }
                    }
                }
            },
            styles: {
                root: {
                    opacity: !this.props.isOpenAnimated || this.state.isMounted ? undefined : 0
                },
                main: {
                    backgroundColor: DIALOG_STYLES.background,
                    border: `1px solid ${DIALOG_STYLES.borderColor}`,
                    boxShadow: DIALOG_STYLES.boxShadow,
                    borderRadius: DIALOG_STYLES.borderRadius,
                    minHeight: 100,
                    ...(scrollArea === UIDialogScrollArea.Content && {
                        overflow: 'hidden',

                        '.ms-Modal-scrollableContent': {
                            overflow: 'hidden',
                            height: '100%'
                        }
                    })
                }
            },
            dialogContentProps: {
                title: this.props.title,
                titleProps: {
                    className: 'ui-medium-header',
                    style: {
                        padding: `${DIALOG_STYLES.vPadding}px 0  5px`,
                        textAlign: 'center',
                        color: DIALOG_STYLES.title.color,
                        ...(!multiLineTitle && {
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            padding: `${DIALOG_STYLES.vPadding}px ${DIALOG_STYLES.hPadding}px 5px`
                        })
                    },
                    onMouseDown: this.onHeaderMouseDown
                },
                styles: {
                    button: {
                        display: !closeButtonVisible ? 'none' : undefined
                    },
                    inner: {
                        padding: '0',
                        ...(scrollArea === UIDialogScrollArea.Content && {
                            height: '100%',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        })
                    },
                    subText: {
                        margin: '0',
                        lineHeight: 18,
                        ...DIALOG_STYLES.contentText
                    },
                    content: {
                        ...DIALOG_STYLES.contentText,
                        ...(scrollArea === UIDialogScrollArea.Content && {
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: this.state.resizeMaxHeight
                        })
                    },
                    innerContent: {
                        padding: `${DIALOG_STYLES.vPaddingHalf}px ${DIALOG_STYLES.hPadding}px`,
                        boxSizing: 'border-box',
                        ...(scrollArea === UIDialogScrollArea.Content && {
                            height: '100%',
                            overflow: 'auto',
                            boxSizing: 'border-box'
                        })
                    }
                }
            }
        };

        const props = deepMerge(dialogProps, rest);

        return (
            <BaseDialog {...props}>
                {children}
                {this.getFooter()}
            </BaseDialog>
        );
    }
}
