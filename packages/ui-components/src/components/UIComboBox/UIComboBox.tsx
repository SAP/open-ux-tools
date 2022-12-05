import React from 'react';
import type { IComboBoxProps, IComboBoxState } from '@fluentui/react';
import {
    ComboBox,
    IComboBox,
    IComboBoxOption,
    initializeComponentRef,
    KeyCodes,
    IOnRenderComboBoxLabelProps
} from '@fluentui/react';
import { UIHighlightMenuOption } from '../UIContextualMenu/UIHighlightMenuOption';
import './UIComboBox.scss';
import './Callout.scss';
import { UILoader } from '../UILoader';
import { UiIcons } from '../Icons';
import type { UIMessagesExtendedProps } from '../../helper/ValidationMessage';
import { getMessageInfo, MESSAGE_TYPES_CLASSNAME_MAP } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';

export {
    IComboBoxOption as UIComboBoxOption,
    IComboBox as UIComboBoxRef,
    IOnRenderComboBoxLabelProps as UIOnRenderComboBoxLabelProps
};

export interface UIComboBoxProps extends IComboBoxProps, UIMessagesExtendedProps {
    highlight?: boolean;
    useComboBoxAsMenuMinWidth?: boolean;
    // Default value for "openMenuOnClick" is "true"
    openMenuOnClick?: boolean;
    onRefresh?(): void;
    onHandleChange?(value: string | number): void;
    tooltipRefreshButton?: string;
    isLoading?: boolean;
    isForceEnabled?: boolean;
}
export interface UIComboBoxState {
    minWidth?: number;
    isListHidden?: boolean;
    toggleRefresh: boolean;
}

interface ComboboxItemInfo {
    index: number;
    option: IComboBoxOption;
}

// Interface of reference to base/'fluentui' component - we need read some properties directly from base component's state.
interface ComboBoxHoistedProps {
    hoisted: {
        selectedIndices: number[];
        currentOptions: IComboBoxOption[];
    };
}
export interface ComboBoxRef extends IComboBox {
    state: IComboBoxState;
    props: UIComboBoxProps & ComboBoxHoistedProps;
}

/**
 * UIComboBox component.
 *
 * @exports
 * @class {UIComboBox}
 * @extends {React.Component<UIComboBoxProps, UIComboBoxState>}
 */
export class UIComboBox extends React.Component<UIComboBoxProps, UIComboBoxState> {
    // Default values for public component properties
    static defaultProps = { openMenuOnClick: true };
    // Reference to fluent ui combobox
    private comboBox = React.createRef<ComboBoxRef>();
    private root: React.RefObject<HTMLDivElement> = React.createRef();
    private selectedElement: React.RefObject<HTMLDivElement> = React.createRef();
    private query = '';
    private ignoreOpenKeys: Array<string> = ['Meta', 'Control', 'Shift', 'Tab', 'Alt', 'CapsLock'];
    private isListHidden = false;

    /**
     * Initializes component properties.
     *
     * @param {UIComboBoxProps} props
     */
    public constructor(props: UIComboBoxProps) {
        super(props);

        this.onInput = this.onInput.bind(this);
        this.reserQuery = this.reserQuery.bind(this);
        this.onResolveOptions = this.onResolveOptions.bind(this);
        this.onRenderItem = this.onRenderItem.bind(this);
        this.onRenderOption = this.onRenderOption.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onClick = this.onClick.bind(this);
        this.toggleRefresh = this.toggleRefresh.bind(this);
        this.handleRefreshButton = this.handleRefreshButton.bind(this);
        this.onPendingValueChanged = this.onPendingValueChanged.bind(this);
        this.onMultiSelectChange = this.onMultiSelectChange.bind(this);
        this.onScrollToItem = this.onScrollToItem.bind(this);
        this.setFocus = this.setFocus.bind(this);

        initializeComponentRef(this);

        this.state = {
            toggleRefresh: false
        };
    }

    /**
     *
     * @param {UIComboBoxProps} nextProps
     * @returns {boolean}
     */
    shouldComponentUpdate(nextProps: UIComboBoxProps): boolean {
        if (nextProps.options !== this.props.options && this.query) {
            // Filter options
            this.updateHiddenOptions(nextProps.options);
        }
        return true;
    }

    /**
     * Updates hidden options.
     *
     * @param {IComboBoxOption[]} opts
     */
    private updateHiddenOptions(opts: IComboBoxOption[]): void {
        this.isListHidden = true;
        for (const option of opts) {
            option.hidden = option.text.toLowerCase().indexOf(this.query) === -1;
            if (this.isListHidden && !option.hidden) {
                this.isListHidden = false;
            }
        }
    }

    /**
     * Method filters options and hides unmatched options.
     *
     * @param {React.FormEvent<IComboBox>} event Combobox event object
     */
    private onInput(event: React.FormEvent<IComboBox>): void {
        this.isListHidden = false;
        if (event.target) {
            const input = event.target as HTMLInputElement;
            this.query = input.value.trimStart().toLowerCase();
            // Filter options
            const baseCombobox = this.comboBox.current;
            if (baseCombobox) {
                this.updateHiddenOptions(baseCombobox.props.hoisted.currentOptions);
            }
        }
    }

    /**
     * Method opens menu when user clicks on Combobox (input or button).
     */
    private onClick(): void {
        const baseCombobox = this.comboBox.current;
        const isOpen = baseCombobox && baseCombobox.state.isOpen;
        const isDisabled = this.props.disabled;
        if (this.props.openMenuOnClick && baseCombobox && !isOpen && !isDisabled) {
            baseCombobox.focus(true);
        }
    }

    /**
     * Method handles keydown event and does following.
     * 1. Fix for bug(in fluentui sources) regarding keyboard navigation when last item is not visible.
     * 2. Opens list when user enters any key.
     *
     * @param {React.FormEvent<HTMLInputElement>} event Keydown event
     */
    private onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
        let handled = false;
        const baseCombobox = this.comboBox.current;
        const isOpen = baseCombobox && baseCombobox.state.isOpen;
        if (event.which === KeyCodes.down || event.which === KeyCodes.up) {
            handled = this._setCyclingNavigation(event.which === KeyCodes.down);
        }
        if (handled) {
            // Do not handle keydown of combobox
            event.preventDefault();
            event.stopPropagation();
        } else if (!this.ignoreOpenKeys.includes(event.key) && baseCombobox && !isOpen) {
            // Open dropdown list on first key press instead of showing it right after focus
            baseCombobox.focus(true);
        }
    }

    /**
     * Method resets search query.
     */
    private reserQuery(): void {
        this.query = '';
        for (const option of this.props.options) {
            delete option.hidden;
        }
        this.isListHidden = false;
        this.setState({
            isListHidden: this.isListHidden
        });
    }

    /**
     * Method called on combobox option resolvation.
     * We should not allow to add any custom option.
     *
     * @returns {IComboBoxOption[]} Array of combobox items.
     */
    private onResolveOptions = (): IComboBoxOption[] => {
        return this.props.options;
    };

    /**
     * Method called on combobox item render.
     * We should pass query to it and avoid rendering if it is hidden.
     *
     * @param {IComboBoxOption} props Combobox item props.
     * @param {Function} defaultRender Combobox item default renderer.
     * @returns {JSX.Element | null} Element to render.
     */
    private onRenderItem = (
        props?: IComboBoxOption,
        defaultRender?: (props?: IComboBoxOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (defaultRender && props && !props.itemType) {
            // Use data for custom onRender functions
            props.data = this.query;
            if (props.title === undefined) {
                // Apply title by default if property not provided
                // In older fluent-ui versions it was applied by default, but behavior changed in version '8.66.2'
                props.title = props.text;
            }
            const selected = props.index !== undefined && this.getCurrentSelectedIndex() === props.index;
            return !props.hidden ? (
                <div
                    key={props.key}
                    ref={selected ? this.selectedElement : undefined}
                    className={`${selected ? 'ts-ComboBox--selected' : ''}`}>
                    {defaultRender(props)}
                </div>
            ) : null;
        }
        return null;
    };

    /**
     * Method to get current selected index.
     *
     * @returns {number | undefined} Selected item index.
     */
    private getCurrentSelectedIndex = (): number | undefined => {
        const baseCombobox = this.comboBox.current;
        if (!baseCombobox) {
            return undefined;
        }
        if (baseCombobox.state.currentPendingValueValidIndex !== -1) {
            return baseCombobox.state.currentPendingValueValidIndex;
        }
        return baseCombobox.props.hoisted.selectedIndices ? baseCombobox.props.hoisted.selectedIndices[0] : undefined;
    };

    /**
     * Return a value for the placeholder.
     *
     * @returns {string}
     */
    private getPlaceholder = (): string => {
        if (this.props.placeholder) {
            return this.props.placeholder;
        } else {
            // That string should be translated
            return 'Search or select from dropdown';
        }
    };

    /**
     * Method called on combobox item's option/label render.
     * We should use different componenet which support highlighting - 'ComboboxSearchOption'.
     *
     * @param {IComboBoxOption} props Combobox item props.
     * @param {Function} defaultRender Combobox item default renderer.
     * @returns {JSX.Element | null} Element to render.
     */
    private readonly onRenderOption = (
        props?: IComboBoxOption,
        defaultRender?: (props?: IComboBoxOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (props) {
            return <UIHighlightMenuOption text={props.text} query={this.query} />;
        }
        return defaultRender ? defaultRender(props) : null;
    };

    /**
     * Method which determines what is next visible item - it is used to fix bug in fluentui sources..
     *
     * @param {number} index Current index.
     * @param {boolean} forward Dirrection to look up.
     * @returns {ComboboxItemInfo | null} Combobox item object.
     */
    private getNextVisibleItem(index: number, forward: boolean): ComboboxItemInfo | null {
        const limit = this.props.options.length;
        while (index >= 0 && index < limit) {
            if (this.props.options[index] && !this.props.options[index].hidden) {
                return {
                    option: this.props.options[index],
                    index
                };
            }
            index = index + (forward ? 1 : -1);
        }
        return null;
    }

    /**
     * Method is used as fix for bug(in fluentui sources) regarding keyboard navigation when last item is not visible.
     *
     * @param {boolean} forward Dirrection to look up.
     * @returns {boolean} Returs true if method changed navigation.
     */
    private _setCyclingNavigation(forward: boolean): boolean {
        const baseCombobox = this.comboBox.current as unknown as React.Component<IComboBoxProps, IComboBoxState> | null;
        if (baseCombobox && baseCombobox.state.currentPendingValueValidIndex >= 0) {
            // Check if there exists any visible item in that direction
            let index = baseCombobox.state.currentPendingValueValidIndex;
            const limit = this.props.options.length - 1;
            index = index + (forward ? 1 : -1);
            let option = this.getNextVisibleItem(index, forward);
            if (option) {
                // Item exists - no need for custom logic as we are fixing issue in base control
                return false;
            }
            // Item was not found - make circular navigation
            option = this.getNextVisibleItem(forward ? 0 : limit, forward);
            if (option) {
                // We fixed issue in base combobox control -
                //   when last item is not visible and we navigate it
                baseCombobox.setState({
                    currentPendingValueValidIndex: option.index,
                    currentPendingValue: option.option.text
                });
                return true;
            }
        }
        return false;
    }

    /**
     * Method for property 'useComboBoxAsMenuMinWidth' - method resolves current dropdown width and updates state with latest value.
     * 'minWidth' from state is used to set callout size in render.
     */
    private calculateMenuMinWidth(): void {
        const root = this.root.current;
        if (root && this.props.useComboBoxAsMenuMinWidth && root.clientWidth !== this.state.minWidth) {
            this.setState({
                minWidth: root.clientWidth
            });
        }
    }

    /**
     * Method called only when property 'highlight' is true.
     * Method called after each value live change - we need recheck if there is any visible item after search is done.
     * 1. If there no any visible item - we hide menu callout.
     * 2. If there is any visible item - we show menu callout.
     */
    private onPendingValueChanged(): void {
        if (this.state.isListHidden !== this.isListHidden) {
            this.setState({
                isListHidden: this.isListHidden
            });
        }
    }

    /**
     * Public method to close menu callout if it is open.
     */
    public dismissMenu(): void {
        if (this.comboBox.current) {
            this.comboBox.current.dismissMenu();
        }
    }

    /**
     * Public method to set the focus on the combo box.
     */
    public setFocus(): void {
        if (this.comboBox.current) {
            this.comboBox.current.focus();
        }
    }

    /**
     * Method called only when property 'onRefresh' has been defined.
     * It is called when the menu Open and Dismiss to handle the toggleRefresh state.
     */
    private toggleRefresh(): void {
        this.setState({
            toggleRefresh: !this.state.toggleRefresh
        });
    }

    /**
     * Method called only when property 'onRefresh' has been defined.
     * It is called when click on the refresh buttonIcon.
     */
    private handleRefreshButton() {
        const baseCombobox = this.comboBox.current;

        if (this.props.useComboBoxAsMenuMinWidth) {
            this.calculateMenuMinWidth();
        }

        if (this.props.onRefresh) {
            this.props.onRefresh();
            baseCombobox?.focus(true);
        }
    }

    public handleChange: IComboBoxProps['onChange'] = (event, option): void => {
        if (option && this.props.onHandleChange) {
            this.props.onHandleChange(option.key);
        }
    };

    private onRenderListLoading = (): JSX.Element | null => {
        const styles = {
            label: {
                fontSize: '11px',
                fontWeight: 'normal'
            }
        };

        return (
            <div className="option-loading">
                <UILoader label="Loading" className="uiLoaderXSmall" labelPosition="right" styles={styles} />
            </div>
        );
    };

    /**
     * Handle multiselect change by avoiding 'blur' event.
     * Problem is that blur event uses suggested value and toggles selection for it.
     *
     * @param {React.FormEvent<IComboBox>} event on change
     * @param {IComboBoxOption} option changed option
     * @param {number} index option index
     * @param {string} value changed value
     */
    private onMultiSelectChange(
        event: React.FormEvent<IComboBox>,
        option?: IComboBoxOption,
        index?: number,
        value?: string
    ): void {
        // Ignore toggle if change triggered by blur
        if (this.props.onChange && event.type !== 'blur') {
            this.props.onChange(event, option, index, value);
        }
    }

    /**
     * Method is used to fix bug in fluent ui.
     * Bug is for multiselect combobox - when keyboard navigation is used, then scrollbar position is not updated to make selected option visible in viewport.
     */
    private onScrollToItem(): void {
        // Multi select only
        const selectedElement = this.selectedElement.current;
        if (!this.props.multiSelect || !selectedElement) {
            return;
        }
        const offsetParent = selectedElement.offsetParent as HTMLElement;
        if (offsetParent) {
            const size = offsetParent.clientHeight;
            const scrollSize = offsetParent.scrollHeight;
            if (scrollSize > size) {
                const elementTop = selectedElement.offsetTop;
                const elementBottom = elementTop + selectedElement.clientHeight;
                const scrollTop = offsetParent.scrollTop;
                const scrollBottom = scrollTop + size;

                if (!(elementTop >= scrollTop && elementBottom <= scrollBottom)) {
                    // Outline node is not visible in viewport
                    const diff = elementBottom > scrollBottom ? elementBottom - scrollBottom : elementTop - scrollTop;
                    offsetParent.scrollTop = scrollTop + diff;
                }
            }
        }
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        const errorSuffix = messageInfo.message ? MESSAGE_TYPES_CLASSNAME_MAP.get(messageInfo.type) : undefined;
        return (
            <div ref={this.root} className={`ts-ComboBox${messageInfo.message ? ' ts-ComboBox--' + errorSuffix : ''}`}>
                <ComboBox
                    componentRef={this.comboBox}
                    disabled={this.props.isForceEnabled ? false : !this.props.options.length}
                    iconButtonProps={{
                        iconProps: {
                            iconName: UiIcons.ArrowDown
                        }
                    }}
                    calloutProps={{
                        calloutMaxHeight: 200,
                        className: 'ts-Callout ts-Callout-Dropdown',
                        styles: {
                            ...(this.props.useComboBoxAsMenuMinWidth && {
                                calloutMain: {
                                    minWidth: this.state.minWidth,
                                    display: this.state.isListHidden ? 'none' : undefined
                                }
                            })
                        }
                    }}
                    styles={{
                        label: {
                            ...labelGlobalStyle,
                            ...(this.props.disabled && {
                                opacity: '0.4'
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

                        errorMessage: [messageInfo.style]
                    }}
                    {...this.props}
                    {...(this.props.highlight && {
                        onInput: this.onInput,
                        onMenuDismissed: this.reserQuery,
                        onResolveOptions: this.onResolveOptions,
                        onRenderItem: this.onRenderItem,
                        onRenderOption: this.onRenderOption,
                        placeholder: this.getPlaceholder(),
                        autofill: {
                            onKeyDownCapture: this.onKeyDown
                        },
                        onPendingValueChanged: this.onPendingValueChanged
                    })}
                    {...(this.props.useComboBoxAsMenuMinWidth && {
                        // Use 'onMenuOpen', because there can be dynamic size of combobox
                        onMenuOpen: this.calculateMenuMinWidth.bind(this)
                    })}
                    {...(this.props.openMenuOnClick && {
                        onClick: this.onClick.bind(this)
                    })}
                    {...(this.props.onRefresh && {
                        onMenuOpen: this.handleRefreshButton,
                        onChange: this.handleChange
                    })}
                    {...(this.props.isLoading && {
                        onRenderList: this.onRenderListLoading
                    })}
                    {...(this.props.multiSelect && {
                        onScrollToItem: this.onScrollToItem,
                        ...(this.props.onChange && {
                            onChange: this.onMultiSelectChange
                        })
                    })}
                    errorMessage={messageInfo.message}
                />
            </div>
        );
    }
}
