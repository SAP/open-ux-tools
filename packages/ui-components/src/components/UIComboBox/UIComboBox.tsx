import React from 'react';
import type { IComboBoxProps, IComboBoxState, IAutofillProps, IButtonProps } from '@fluentui/react';
import {
    ComboBox,
    IComboBox,
    IComboBoxOption,
    ISelectableOption,
    initializeComponentRef,
    KeyCodes,
    IOnRenderComboBoxLabelProps,
    SelectableOptionMenuItemType
} from '@fluentui/react';
import { UIHighlightMenuOption } from '../UIContextualMenu/UIHighlightMenuOption';
import './UIComboBox.scss';
import './Callout.scss';
import { UILoader } from '../UILoader';
import { UiIcons } from '../Icons';
import type { UIMessagesExtendedProps, InputValidationMessageInfo } from '../../helper/ValidationMessage';
import { getMessageInfo, MESSAGE_TYPES_CLASSNAME_MAP } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';
import { isDropdownEmpty, getCalloutCollisionTransformationPropsForDropdown } from '../UIDropdown';
import { CalloutCollisionTransform } from '../UICallout';
import { isHTMLInputElement } from '../../utilities';
import { REQUIRED_LABEL_INDICATOR } from '../types';

export {
    IComboBoxOption as UIComboBoxOption,
    ISelectableOption as UISelectableOption,
    IComboBox as UIComboBoxRef,
    IOnRenderComboBoxLabelProps as UIOnRenderComboBoxLabelProps,
    SelectableOptionMenuItemType as UISelectableOptionMenuItemType
};

export enum UIComboBoxLoaderType {
    /**
     * Loader within dropdown list
     */
    List = 'List',
    /**
     * Loader within input
     */
    Input = 'Input'
}

export interface UIComboBoxProps extends IComboBoxProps, UIMessagesExtendedProps {
    wrapperRef?: React.RefObject<HTMLDivElement>;
    highlight?: boolean;
    useComboBoxAsMenuMinWidth?: boolean;
    // Default value for "openMenuOnClick" is "true"
    openMenuOnClick?: boolean;
    /**
     *
     */
    onRefresh?(): void;
    /**
     *
     */
    onHandleChange?(value: string | number): void;
    tooltipRefreshButton?: string;
    /**
     * Show loading indicator(s).
     * Supported places:
     * 1. List - loader within dropdown list
     * 2. Input - loader within input
     */
    isLoading?: boolean | UIComboBoxLoaderType[];
    isForceEnabled?: boolean;
    readOnly?: boolean;
    calloutCollisionTransformation?: boolean;
    /**
     * Determines whether the `key` property should be considered during search.
     * By default, only the `text` property of an option is considered.
     *
     * @default false
     */
    searchByKeyEnabled?: boolean;
    /**
     * Custom filter function to apply custom filtering logic on top of the default search.
     * Receives the current search term and an option, returning `true` if the option should be shown,
     * `false` to hide it, or `undefined` to apply the default search filtering behavior.
     */
    customSearchFilter?: (searchTerm: string, option: IComboBoxOption) => boolean | undefined;
}
export interface UIComboBoxState {
    minWidth?: number;
    isListHidden?: boolean;
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

interface ComboBoxRef extends IComboBox {
    state: IComboBoxState;
    props: UIComboBoxProps & ComboBoxHoistedProps;
    _comboBoxWrapper: React.RefObject<HTMLDivElement>;
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
    private comboboxDomRef = React.createRef<HTMLDivElement>();
    private menuDomRef = React.createRef<HTMLDivElement>();
    private selectedElement: React.RefObject<HTMLDivElement> = React.createRef();
    private query = '';
    private ignoreOpenKeys: Array<string> = ['Meta', 'Control', 'Shift', 'Tab', 'Alt', 'CapsLock'];
    private isListHidden = false;
    private calloutCollisionTransform = new CalloutCollisionTransform(this.comboboxDomRef, this.menuDomRef);

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
        this.handleRefreshButton = this.handleRefreshButton.bind(this);
        this.onPendingValueChanged = this.onPendingValueChanged.bind(this);
        this.onMultiSelectChange = this.onMultiSelectChange.bind(this);
        this.onScrollToItem = this.onScrollToItem.bind(this);
        this.setFocus = this.setFocus.bind(this);
        this.onRenderIcon = this.onRenderIcon.bind(this);

        initializeComponentRef(this);

        this.state = {};
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
        let currentGroup: IComboBoxOption | undefined;
        let isGroupVisible = false;
        const updateGroupVisibility = () => {
            if (currentGroup) {
                currentGroup.hidden = !isGroupVisible;
            }
        };
        for (const option of opts) {
            if (option.itemType === SelectableOptionMenuItemType.Header) {
                // Update visibility of previously processed group
                updateGroupVisibility();
                // Reset current group and visibility flag
                currentGroup = option;
                isGroupVisible = false;
            } else {
                // Handle selectable item
                const isVisible = this.isOptionVisibleByQuery(option, this.query);
                option.hidden = !isVisible;
                if (this.isListHidden && !option.hidden) {
                    this.isListHidden = false;
                }
                // Groups should be visible if at least one item is visible within group
                isGroupVisible = isVisible || isGroupVisible;
            }
        }
        updateGroupVisibility();
    }

    /**
     * Determines whether an option should be hidden based on the current search query.
     * Applies a custom filter if `customSearchFilter` is provided, otherwise uses the default
     * search logic to match the `text` property (and `key` if `searchByKeyEnabled` is enabled).
     *
     * @param option - The option to evaluate for visibility.
     * @param query - The current search query string.
     * @returns `true` if the option should be hidden, `false` if it should be visible.
     */
    private isOptionVisibleByQuery(option: IComboBoxOption, query: string): boolean {
        let isVisible: boolean | undefined;
        if (this.props.customSearchFilter) {
            // Apply external custom search
            isVisible = this.props.customSearchFilter(query, option);
        }
        if (isVisible === undefined) {
            // Apply internal search
            isVisible = option.text.toLowerCase().includes(query);
            // Consider 'key' of option if property 'searchByKeyEnabled' is enabled
            if (this.props.searchByKeyEnabled && !isVisible) {
                isVisible = option.key.toString().toLowerCase().includes(this.query);
            }
        }
        return isVisible;
    }

    /**
     * Method prevents cursor from jumping to the end of input.
     *
     * @param {React.FormEvent<IComboBox>} event Combobox event object
     */
    private setCaretPosition(event: React.FormEvent<IComboBox>) {
        if (isHTMLInputElement(event.target)) {
            const input = event.target;
            const selectionEnd = input.selectionEnd;
            if (selectionEnd !== input.value.length) {
                window.requestAnimationFrame(() => {
                    input.selectionStart = selectionEnd;
                    input.selectionEnd = selectionEnd;
                });
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
        if (isHTMLInputElement(event.target)) {
            this.setCaretPosition(event);
            const input = event.target;
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
     *
     * @param event
     */
    private onClick(event: React.FormEvent<IComboBox>): void {
        this.setCaretPosition(event);
        const baseCombobox = this.comboBox.current;
        const isOpen = baseCombobox?.state.isOpen;
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
        const isOpen = baseCombobox?.state.isOpen;
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
     * Default renderer for combobox item when highlight mode is enabled.
     * We should pass highlight query within props and avoid rendering if it is hidden.
     *
     * @param {IComboBoxOption} props Combobox item props.
     * @param {Function} defaultRender Combobox item default renderer.
     * @returns {JSX.Element | null} Element to render.
     */
    private readonly _onRenderItem = (
        props?: IComboBoxOption,
        defaultRender?: (props?: IComboBoxOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (defaultRender && props) {
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
        if (this.props.onRenderItem) {
            return this.props.onRenderItem(props, this._onRenderItem.bind(this, props, defaultRender));
        }
        return this._onRenderItem(props, defaultRender);
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
     * Default renderer for combobox item's option/label when highlight mode is enabled.
     * We should use different componenet which support highlighting - 'ComboboxSearchOption'.
     *
     * @param {IComboBoxOption} props Combobox item props.
     * @param {Function} defaultRender Combobox item default renderer.
     * @returns {JSX.Element | null} Element to render.
     */
    private readonly _onRenderOption = (
        props?: IComboBoxOption,
        defaultRender?: (props?: IComboBoxOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (props && props.itemType !== SelectableOptionMenuItemType.Header) {
            return <UIHighlightMenuOption text={props.text} query={this.query} />;
        }
        return defaultRender ? defaultRender(props) : null;
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
        if (this.props.onRenderOption) {
            return this.props.onRenderOption(props, this._onRenderOption.bind(this, props, defaultRender));
        }
        return this._onRenderOption(props, defaultRender);
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
        const comboBoxWrapper = this.comboBox.current?._comboBoxWrapper.current;
        if (
            comboBoxWrapper &&
            this.props.useComboBoxAsMenuMinWidth &&
            comboBoxWrapper.clientWidth !== this.state.minWidth
        ) {
            this.setState({
                minWidth: comboBoxWrapper.clientWidth
            });
        }
    }

    /**
     * Method called only when property 'highlight' is true.
     * Method called after each value live change - we need recheck if there is any visible item after search is done.
     * 1. If there no any visible item - we hide menu callout.
     * 2. If there is any visible item - we show menu callout.
     *
     * @param option Selected option.
     * @param index Selected option's index.
     * @param value Text value entered in input.
     */
    private onPendingValueChanged(
        option?: IComboBoxOption | undefined,
        index?: number | undefined,
        value?: string | undefined
    ): void {
        if (this.state.isListHidden !== this.isListHidden) {
            this.setState({
                isListHidden: this.isListHidden
            });
        }
        if (this.props?.onPendingValueChanged) {
            this.props?.onPendingValueChanged(option, index, value);
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
     * Method returns class names string depending on props and component state.
     *
     * @param {InputValidationMessageInfo} messageInfo Error/warning message if applied
     * @returns {string} Class names of root combobox element.
     */
    private getClassNames(messageInfo: InputValidationMessageInfo): string {
        const { readOnly, disabled } = this.props;
        const errorSuffix = messageInfo.message ? MESSAGE_TYPES_CLASSNAME_MAP.get(messageInfo.type) : undefined;
        let classNames = `ts-ComboBox${messageInfo.message ? ' ts-ComboBox--' + errorSuffix : ''}`;
        if (readOnly && !disabled) {
            classNames += ' ts-ComboBox--readonly';
        }
        if (disabled) {
            classNames += ' ts-ComboBox--disabled';
        }
        if (isDropdownEmpty(this.props)) {
            classNames += ' ts-ComboBox--empty';
        }
        return classNames;
    }

    /**
     * Method returns properties for Autofill component(combobox's inner compnent for text input).
     * Method handles 'highlight' and 'readOnly' properties.
     *
     * @returns {IAutofillProps} Properties for Autofill component.
     */
    private getAutofillProps(): IAutofillProps {
        const { highlight, readOnly, disabled } = this.props;
        const autofill: IAutofillProps = {};
        // Handle search highligh
        if (highlight) {
            autofill.onKeyDownCapture = this.onKeyDown;
        }
        const tabIndex = 'tabIndex' in this.props ? this.props.tabIndex : undefined;
        // Handle readOnly property
        if (readOnly && !disabled) {
            autofill.readOnly = readOnly;
            autofill.tabIndex = tabIndex;
            // Adjust aria attributes for readonly
            autofill['aria-disabled'] = undefined;
            autofill['aria-readonly'] = true;
        } else if (disabled) {
            autofill.disabled = undefined;
            autofill.readOnly = true;
            autofill.tabIndex = tabIndex;
        }
        return autofill;
    }

    /**
     * Method returns if loader should be displayed for passed type.
     *
     * @param type Loader's place
     * @returns True if loader should be displayed for passed type.
     */
    private isLoaderApplied(type: UIComboBoxLoaderType): boolean {
        const { isLoading } = this.props;
        if (Array.isArray(isLoading)) {
            return isLoading.includes(type);
        }
        // Boolean value matches List option
        return !!isLoading && type === UIComboBoxLoaderType.List;
    }

    /**
     * Method renders dropdown expand icon.
     * Overwritten renderer to replace expand icon with loader when combobox has laoding property set.
     *
     * @param props Button properties
     * @param defaultRender Default icon renderer
     * @returns React element to render.
     */
    private onRenderIcon(
        props?: IButtonProps,
        defaultRender?: (props?: IButtonProps) => JSX.Element | null
    ): JSX.Element | null {
        if (this.isLoaderApplied(UIComboBoxLoaderType.Input)) {
            const styles = {
                label: {
                    fontSize: '11px',
                    fontWeight: 'normal'
                }
            };

            return <UILoader className="uiLoaderXSmall" labelPosition="right" styles={styles} />;
        }
        return defaultRender?.(props) ?? null;
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        let disabled = this.props.isForceEnabled ? false : !this.props.options.length;
        if (this.props.readOnly) {
            disabled = true;
        }
        return (
            <div ref={this.props.wrapperRef} className={this.getClassNames(messageInfo)}>
                <ComboBox
                    componentRef={this.comboBox}
                    ref={this.comboboxDomRef}
                    disabled={disabled}
                    iconButtonProps={{
                        iconProps: {
                            iconName: UiIcons.ArrowDown
                        },
                        onRenderIcon: this.onRenderIcon
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
                                        content: REQUIRED_LABEL_INDICATOR,
                                        color: 'var(--vscode-inputValidation-errorBorder)',
                                        paddingRight: 12
                                    }
                                }
                            })
                        },

                        errorMessage: [messageInfo.style]
                    }}
                    {...this.props}
                    calloutProps={{
                        calloutMaxHeight: 200,
                        popupProps: {
                            ref: this.menuDomRef
                        },
                        className: 'ts-Callout ts-Callout-Dropdown',
                        styles: {
                            ...(this.props.useComboBoxAsMenuMinWidth && {
                                calloutMain: {
                                    minWidth: this.state.minWidth,
                                    display: this.state.isListHidden ? 'none' : undefined
                                }
                            })
                        },

                        ...this.props.calloutProps,
                        ...getCalloutCollisionTransformationPropsForDropdown(this, this.calloutCollisionTransform)
                    }}
                    {...(this.props.highlight && {
                        onInput: this.onInput,
                        onMenuDismissed: this.reserQuery,
                        onResolveOptions: this.onResolveOptions,
                        onRenderItem: this.onRenderItem,
                        onRenderOption: this.onRenderOption,
                        placeholder: this.getPlaceholder(),
                        onPendingValueChanged: this.onPendingValueChanged
                    })}
                    autofill={this.getAutofillProps()}
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
                    {...(this.isLoaderApplied(UIComboBoxLoaderType.List) && {
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
