import React from 'react';
import uuid from 'uuid';
import type {
    IContextualMenuProps,
    IContextualMenuItem,
    ITextField,
    IContextualMenuListProps,
    IRenderFunction,
    IContextualMenuItemProps,
    IContextualMenuItemRenderFunctions,
    FocusZone,
    IPopupRestoreFocusParams
} from '@fluentui/react';
import { DirectionalHint, FocusZoneTabbableElements, setIconOptions } from '@fluentui/react';

import { UITextInput } from '../UIInput';
import { UIContextualMenu, UIHighlightMenuOption } from '../UIContextualMenu';
import { UIIconButton } from '../UIButton/UIIconButton';
import { UiIcons } from '../Icons';

import type { UIMessagesExtendedProps } from '../../helper/ValidationMessage';
import { getMessageInfo } from '../../helper/ValidationMessage';

import './UITreeDropdown.scss';

export { DirectionalHint as UIDirectionalHint };

export interface ItemsProps {
    label: string;
    value: string;
    children?: ItemsProps[];
    subMenuProps?: IContextualMenuProps;
    split?: boolean;
}

export interface UITreeDropdownProps extends UIMessagesExtendedProps {
    label?: string;
    disabled?: boolean;
    required?: boolean;
    value?: string;
    items: ItemsProps[];
    onParameterValueChange(value: string): void;
    placeholderText: string;
    valueSeparator?: string;
    directionalHint?: DirectionalHint;
    maxWidth?: number;
    useTargetWidth?: string;
    errorMessage?: string;
}

interface TreeItemInfo {
    level: number;
    item: IContextualMenuItem;
    index: number;
    parent?: TreeItemInfo;
}

export interface UITreeDropdownState {
    hasSelected: boolean;
    originalItems: IContextualMenuItem[];
    isHidden: boolean;
    value?: string;
    query: string;
    items: IContextualMenuItem[];
    valueSeparator: string;
    uiidInput: string;
    isDisabled: boolean;
    isMenuOpen: boolean;
    valueChanged: boolean;
}

const SELECTOR_CLASSES = {
    callout: 'ui-tree-callout',
    scrollArea: 'ms-ContextualMenu-container',
    splitButton: 'ms-ContextualMenu-splitMenu'
};

export enum EdgePosition {
    First = 'First',
    Last = 'Last'
}

const KEYBOARD_KEYS = {
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    Enter: 'Enter',
    Escape: 'Escape'
};

/**
 * UITreeDropdown component.
 *
 * @exports
 * @class UIVerticalDivider
 * @extends {React.Component<UITreeDropdownProps, UITreeDropdownState>}
 */
export class UITreeDropdown extends React.Component<UITreeDropdownProps, UITreeDropdownState> {
    private readonly UITreeDropdownRef = React.createRef<{ props: UITreeDropdownProps }>();
    private readonly UITreeDropdownFocusZoneRef = React.createRef<FocusZone>();
    private inputRef = React.createRef<ITextField>();

    private submenuRefs: { [key: string]: React.RefObject<{ props: UITreeDropdownProps }> } = {};
    private defaultSubmenuFocus?: TreeItemInfo;

    // Calculated offset for submenu positions
    // It is added because root menu can have scrollbar - in result root menu's items width is smaller than root menu.
    // In such case(when scrollbar) submenu is positioned near to expand/hovered item and position is not on the edge of root menu.
    // Using offset/margin we can do corrections to position of submenu and place it one the edge of root menu.
    private submenuOffset = 0;
    private lastKeyDown = '';
    // Hold original value which should be stored when contextmenu opened
    // Restore can happend if user presses Escape on keyboard
    private originalValue?: string;
    /**
     * Initializes component properties.
     *
     * @param {UITreeDropdownProps} props
     */
    public constructor(props: UITreeDropdownProps) {
        super(props);
        this.state = {
            query: '',
            hasSelected: this.props.value ? true : false,
            // value has to be set, otherwise react treats this as "uncontrolled" component
            // and displays warnings when value is set later on
            value: this.props.value || '',
            isHidden: true,
            originalItems: [],
            items: [],
            valueSeparator: this.props.valueSeparator || '.',
            uiidInput: uuid.v4(),
            isDisabled: this.props.items.length ? false : true,
            isMenuOpen: false,
            valueChanged: false
        };
        this.toggleMenu = this.toggleMenu.bind(this);
        this.onWindowKeyDown = this.onWindowKeyDown.bind(this);
        this.handleCustomDownKey = this.handleCustomDownKey.bind(this);

        // Suppress icon warnings, as they are irrelevant
        setIconOptions({ disableWarnings: true });
    }

    public componentDidMount = (): void => {
        if (this.props.items.length) {
            this.buildItems(this.props.items);
            this.setState({ isDisabled: false });
        }
    };

    public componentDidUpdate = (prevProps: UITreeDropdownProps): void => {
        if (this.props.items.length !== prevProps.items.length) {
            this.setState({ isHidden: true });
            this.setState({ isDisabled: this.props.items.length ? false : true });
            this.buildItems(this.props.items);
        }
        if (this.props.value !== prevProps.value) {
            this.setState({ value: this.props.value });
        }
        // Calculate size for submenu offset
        this.calculateSubmenuOffset();
    };

    /**
     * Map the payload.
     *
     * @param {ItemsProps[]} items
     */
    buildItems = (items: ItemsProps[]): void => {
        if (this.state.items.length !== items.length) {
            items = items.map(this.buildSubItems);

            const mapedItems = this.mapValuesToContextMenu(items);

            this.setState({
                originalItems: mapedItems,
                items: mapedItems
            });
        }
    };

    /**
     * Sub items values and style.
     *
     * @param {ItemsProps} item
     * @returns {ItemsProps}
     */
    buildSubItems = (item: ItemsProps): ItemsProps => {
        if (item.children && item.children.length) {
            item.children = item.children.map((el) => {
                const regex = new RegExp(item.value, 'ig');
                const value =
                    el.value.search(regex) === -1 ? `${item.value}${this.state.valueSeparator}${el.value}` : el.value;

                return {
                    ...el,
                    split: false,
                    value
                };
            });
        }

        return item;
    };

    /**
     * Map GD payload to ContextMenu payload.
     *
     * @param {ItemsProps[]} items
     * @param {number} level
     * @returns {IContextualMenuItem[]}
     */
    mapValuesToContextMenu = (items: ItemsProps[], level = 0): IContextualMenuItem[] => {
        return items.map((item: ItemsProps) => {
            if (item.children && item.children.length) {
                item.split = true;

                const refId = this.getRefId(item.value, level);
                if (!this.submenuRefs[refId]) {
                    this.submenuRefs[refId] = React.createRef();
                }
                item.subMenuProps = {
                    componentRef: this.submenuRefs[refId],
                    items: this.mapValuesToContextMenu(item.children, level + 1),
                    focusZoneProps: {
                        handleTabKey: FocusZoneTabbableElements.none,
                        onFocus: () => {
                            const openerItem = this.defaultSubmenuFocus?.parent;
                            if (openerItem && openerItem.item.value === item.value && openerItem.level === level) {
                                this.focusItemWithValue(
                                    this.state.value,
                                    this.defaultSubmenuFocus?.parent?.item.subMenuProps?.items
                                );
                            }
                        }
                    }
                };
            }

            return {
                ...item,
                key: item.value,
                text: item.label,
                className: 'ui-tree-dropdown-list-item',
                onClick: (): void => this.handleSelection(item.value),
                onRenderContent: this.handleRenderContent
            };
        });
    };

    /**
     * Handle the selected value.
     *
     * @param {string} value
     */
    handleSelection = (value: string): void => {
        this.setState({ hasSelected: true, value: value, valueChanged: false }, () =>
            this.props.onParameterValueChange(value)
        );
    };
    /**
     * Handle the keypress value.
     *
     * @param {React.KeyboardEvent<HTMLInputElement>} event
     */
    handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        switch (event.key) {
            case 'Enter':
                if (!this.state.isMenuOpen) {
                    this.toggleMenu(false, event);
                } else {
                    this.setState({ valueChanged: true });
                    this.handleSelection(this.state.value ? this.state.value : '');
                }
                break;
            case 'ArrowDown':
                if (!this.state.isMenuOpen) {
                    // Open dropdown contextMenu if closed
                    this.toggleMenu(false, event);
                } else {
                    this.focusDropdown(event, event.key);
                }
                break;
            case 'Tab':
                if (this.state.isMenuOpen) {
                    // Close Dropdown if open
                    this.toggleMenu(true);
                }
                this.handleSelection(this.state.value ? this.state.value : '');
                break;
            default: {
                // do nothing
            }
        }
        this.lastKeyDown = event.key;
    };
    /**
     * Handle ContextMenu focus.
     *
     * @param {React.KeyboardEvent<HTMLInputElement>} event
     * @param {string} key
     */
    focusDropdown = (event: React.KeyboardEvent<HTMLInputElement>, key?: string) => {
        if (this.UITreeDropdownFocusZoneRef) {
            if (key === KEYBOARD_KEYS.Enter) {
                this.focusItemWithValue(this.state.value, this.state.items);
            } else {
                this.UITreeDropdownFocusZoneRef.current?.focus(true);
            }
            // disable scroll which sometimes triggers
            event.preventDefault();
        }
    };
    /**
     * Custom handle the render from subMenu to control the highlight and the .is-selected.
     *
     * @param {IContextualMenuListProps} props
     * @param {IContextualMenuItemRenderFunctions} defaultRenders
     * @returns { React.ReactNode | null}
     */
    handleRenderContent = (
        props: IContextualMenuItemProps,
        defaultRenders: IContextualMenuItemRenderFunctions
    ): React.ReactNode | null => {
        props.item.className = props.item.value === this.props.value ? 'is-selected' : '';
        props.item.text = this.highlightQuery(props.item.label, this.state.query) as unknown as string;
        this.applySubmenuPosition(props.item);

        return defaultRenders ? defaultRenders.renderItemName(props) : null;
    };

    /**
     * Custom handle the render to control the highlight and the .is-selected.
     *
     * @param {IContextualMenuListProps} props
     * @param {IRenderFunction<IContextualMenuListProps>} defaultRender
     * @returns {JSX.Element | null}
     */
    handleRenderMenuList = (
        props?: IContextualMenuListProps,
        defaultRender?: IRenderFunction<IContextualMenuListProps>
    ): JSX.Element | null => {
        let mappedItems: IContextualMenuItem[] = [];

        if (props?.items) {
            mappedItems = props.items.map((item: IContextualMenuItem) => {
                item.className = item.value === this.props.value ? 'is-selected' : '';
                item.text = this.highlightQuery(item.label, this.state.query) as unknown as string;

                this.applySubmenuPosition(item);
                item.subMenuProps?.items.map((subItem: IContextualMenuItem) => {
                    subItem.className = subItem.value === this.props.value ? 'is-selected' : '';
                    return subItem;
                });

                return { ...item };
            });
        }

        return defaultRender ? defaultRender({ ...props, items: mappedItems } as IContextualMenuListProps) : null;
    };

    /**
     * Handle on/off ContextualMenu.
     *
     * @param {boolean} status
     * @param {React.KeyboardEvent<HTMLInputElement>} event
     */
    toggleMenu = (status: boolean, event?: React.KeyboardEvent<HTMLInputElement>): void => {
        this.setState({
            isHidden: status
        });
        const key = event?.key;
        //select first item after contextMenu is opened
        if (event) {
            setTimeout(() => {
                event.persist();
                this.focusDropdown(event, key);
            }, 0);
        }
    };

    /**
     * Highlight the search string.
     *
     * @param {string} text
     * @param {string} query
     * @returns {JSX.Element}
     */
    highlightQuery = (text: string, query: string): JSX.Element => {
        return <UIHighlightMenuOption text={text} query={query} />;
    };

    /**
     * Filter all options that match the query string.
     *
     * @param {string} input
     * @param {IContextualMenuItem} item
     * @returns {boolean}
     */
    filterElement = (input: string, item: IContextualMenuItem): boolean => {
        const regex = new RegExp(input, 'ig');

        if (item?.children?.length) {
            return item.children.filter((item: IContextualMenuItem) => this.filterElement(input, item)).length > 0;
        }

        if (item?.value) {
            return item.value.search(regex) !== -1;
        }

        return false;
    };

    /**
     * Update the query string and the prop value.
     *
     * @param {React.FormEvent<HTMLInputElement | HTMLTextAreaElement>} event
     */
    handleOnChangeValue = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const query = event.target as HTMLInputElement;

        const list = this.state.originalItems.filter((item) => this.filterElement(query.value, item));

        this.setState({
            hasSelected: false,
            value: query.value,
            items: list,
            query: query.value,
            valueChanged: true
        });

        if (!this.state.isMenuOpen) {
            this.toggleMenu(false);
        }
    };

    /**
     * Method resets value of dropdown input to original value, which was stored after open.
     */
    resetValue(): void {
        this.setState({
            value: this.originalValue,
            valueChanged: false
        });
    }

    /**
     * Method reset states.
     *
     * @param {Event | React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent} event
     */
    handleDismiss = (event?: Event | React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent): void => {
        if (event && 'key' in event && event.key === KEYBOARD_KEYS.Escape) {
            this.resetValue();
        } else if (!this.state.hasSelected) {
            this.props.onParameterValueChange('');
        }

        this.setState({
            items: this.state.originalItems,
            query: ''
        });

        this.toggleMenu(true);
        this.originalValue = undefined;
    };

    /**
     * Method applies additional styling for submnu callout.
     * It is used to apply scroll width offset - in result submenu should be displayed on the edge of root menu.
     *
     * @param {IContextualMenuItem} item Context menu item.
     */
    applySubmenuPosition = (item: IContextualMenuItem): void => {
        if (item.subMenuProps?.items) {
            if (!item.subMenuProps.calloutProps) {
                item.subMenuProps.calloutProps = {};
            }
            item.subMenuProps.calloutProps.styles = {
                root: {
                    marginLeft: this.submenuOffset
                }
            };
        }
    };

    getCalloutDomRef = (submenu = false): HTMLDivElement | null => {
        const menuLayerClass = `${SELECTOR_CLASSES.callout}${this.state.uiidInput}`;
        const callout: HTMLDivElement | null = document.querySelector(`.${menuLayerClass}`);
        return submenu && callout ? (callout.nextSibling as HTMLDivElement) : callout;
    };

    /**
     * Method calculates offset size for submenus.
     * Calculated offset should be used to position submenu right to edge of root menu.
     *  - Detects if scrollbar exists.
     *  - Calculates size of scrollbar and stores it as value for offset.
     */
    calculateSubmenuOffset = (): void => {
        const callout = this.getCalloutDomRef();
        if (callout) {
            const scrollContainer: HTMLElement | null = callout.querySelector(`.${SELECTOR_CLASSES.scrollArea}`);
            this.submenuOffset = 0;
            if (scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
                this.submenuOffset = scrollContainer.offsetWidth - scrollContainer.clientWidth;
            }
        }
    };
    /**
     * Method updates state, if focus visible, using arrow keys.
     *
     * @param {HTMLElement|React.FocusEvent<HTMLElement>} ev
     */
    onFocusElementChanged = (ev: any): void => {
        const menuOption = ev.getElementsByClassName('ts-Menu-option');
        const isFocusVisible = document.getElementsByClassName('ms-Fabric--isFocusVisible');
        if (isFocusVisible.length > 0 && menuOption.length > 0) {
            this.setState({
                value: ev.value ? ev.value : menuOption[0].innerText,
                valueChanged: true
            });
        }
    };
    /**
     * Method handles window keydown event.
     * 1. Stores last keyboard pressed event.
     * 2. Disables CircularNavigation for menus.
     *
     * @param {KeyboardEvent | React.KeyboardEvent<HTMLInputElement>} event
     */
    onWindowKeyDown = (event: KeyboardEvent | React.KeyboardEvent<HTMLInputElement>) => {
        this.lastKeyDown = event.key;
        // Avoid circular navigation
        const activeElement = document.activeElement;
        if ([KEYBOARD_KEYS.ArrowDown, KEYBOARD_KEYS.ArrowUp].includes(event.key) && activeElement) {
            // Disable CircularNavigation
            // There is property in focusZoneProps, but it is overwritten by fluent ui and we can not change it from outside
            const positions = this.getEdgePosition(activeElement);
            const fromFirst = positions.includes(EdgePosition.First) && event.key === KEYBOARD_KEYS.ArrowUp;
            const fromLast = positions.includes(EdgePosition.Last) && event.key === KEYBOARD_KEYS.ArrowDown;
            if (fromFirst || fromLast) {
                // Circular navigation case.
                // Check if first item focused in root menu.
                if (fromFirst && activeElement.closest(`.${SELECTOR_CLASSES.callout}${this.state.uiidInput}`)) {
                    // Focus input field if navigation triggered from first item using ArrowUp
                    this.inputRef.current?.focus();
                }
                event.stopPropagation();
                event.preventDefault();
            }
        }
    };
    /**
     * Method handles focus logic if arrow key was pressed.
     *
     * @param {FocusEvent} event
     */
    handleCustomDownKey = (event: FocusEvent) => {
        if (this.lastKeyDown.includes('Arrow')) {
            this.lastKeyDown = '';
            this.onFocusElementChanged(event.target);
        }
    };

    /**
     * Method appends custom keydown and focus event listeners when context menu is opened.
     */
    applyCustomKeyDownHandlingEvents = () => {
        window.addEventListener('keydown', this.onWindowKeyDown, true);
        window.addEventListener('focus', this.handleCustomDownKey, true);
    };
    /**
     * Method removes custom keydown and focus event listeners when context menu is dismissed.
     */
    removeCustomKeyDownHandlingEvents = () => {
        window.removeEventListener('keydown', this.onWindowKeyDown, true);
        window.removeEventListener('focus', this.handleCustomDownKey, true);
    };

    /**
     * Method receives any menu child element and returns edge positions if item is first or last in rendered menu.
     *
     * @param {Element} itemElement Item's DOM to check position.
     * @returns {EdgePosition[]} Returns positions if element is first or last in menu - also can be both.
     */
    getEdgePosition = (itemElement: Element): EdgePosition[] => {
        const container = itemElement.closest('ul');
        const item = itemElement.closest('li');
        const position: EdgePosition[] = [];
        if (container && item) {
            if (container.children[0] === item) {
                position.push(EdgePosition.First);
            }
            if (container.children[container.children.length - 1] === item) {
                position.push(EdgePosition.Last);
            }
        }
        return position;
    };

    /**
     * Recursive method finds menu item info object in tree menu items by passed value/key of item.
     *
     * @param {string} [value] Value/key of item.
     * @param {IContextualMenuItem[]} [items=[]] Menu items.
     * @param {TreeItemInfo} [parent] Item's parent object.
     * @param {number} [level=0] Level of item in tree structure.
     * @returns {TreeItemInfo | undefined} Found menu item.
     */
    findItemByValue = (
        value?: string,
        items: IContextualMenuItem[] = [],
        parent?: TreeItemInfo,
        level = 0
    ): TreeItemInfo | undefined => {
        let selectedItem: TreeItemInfo | undefined;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const selectedItemTemp: TreeItemInfo = {
                item,
                index: i,
                parent,
                level
            };
            if (item.value === value) {
                selectedItem = selectedItemTemp;
            } else if (item.subMenuProps?.items?.length) {
                selectedItem = this.findItemByValue(value, item.subMenuProps.items, selectedItemTemp, level + 1);
            }
            if (selectedItem) {
                break;
            }
        }
        return selectedItem;
    };

    /**
     * Method finds DOM node of menu item based on received item object and container DOM.
     *
     * @param {HTMLElement} container Menu container DOM.
     * @param {TreeItemInfo} item Menu item info object.
     * @returns {HTMLElement | undefined} Found DOM element of item.
     */
    getItemTarget = (container: HTMLElement, item: TreeItemInfo): HTMLElement | undefined => {
        let itemDom: HTMLElement | undefined;
        const listDom = container.querySelector('.ms-ContextualMenu-list');
        if (listDom && listDom.childNodes[item.index]) {
            const listItemDom = listDom.childNodes[item.index] as HTMLElement;
            const itemElement = listItemDom.firstChild as undefined | HTMLElement;
            itemDom = itemElement;
        }
        return itemDom;
    };

    /**
     * Method focuses context menu item based on recieved value/key and menude data(items and hoisted object).
     * Method works with any level menu.
     *
     * @param {string} [value] Value/key of item.
     * @param {IContextualMenuItem[]} [items=[]] Target menu items.
     */
    focusItemWithValue = (value?: string, items: IContextualMenuItem[] = []): void => {
        const selectedItem = this.findItemByValue(value, items);
        const callout = this.getCalloutDomRef(!!this.defaultSubmenuFocus);
        this.defaultSubmenuFocus = undefined;
        if (selectedItem && callout) {
            let itemDom: HTMLElement | undefined;
            if (selectedItem.parent) {
                // Item is in next level of menu - we need open submenu
                const parentItemDom = this.getItemTarget(callout, selectedItem.parent);
                if (parentItemDom) {
                    this.defaultSubmenuFocus = selectedItem;
                    parentItemDom.dispatchEvent(
                        new KeyboardEvent('keydown', { keyCode: 39, which: 39, bubbles: true } as KeyboardEventInit)
                    );
                }
            } else {
                // Item is in first level
                itemDom = this.getItemTarget(callout, selectedItem);
            }
            // Focus target item or focus container while submenu is not opened
            if (itemDom) {
                itemDom.focus();
            } else {
                const menuContainer: HTMLElement | null = callout.querySelector(`.${SELECTOR_CLASSES.scrollArea}`);
                menuContainer?.focus();
            }
        }
    };

    /**
     * Generate unique id for menu component references.
     *
     * @param {string} value Value of item.
     * @param {number} level Level of item in tree structure.
     * @returns {string} Id containing value andf level in format "${value}__${level}".
     */
    getRefId = (value: string, level: number): string => {
        return `${value}__${level}`;
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        let useTargetWidth = true;
        if (this.props.useTargetWidth) {
            useTargetWidth = false;
        }
        return (
            <div
                className={`ui-treeDropdown ui-treeDropDown-${this.state.uiidInput} ${
                    this.props.label ? 'ui-treeDropdown-with-label' : ''
                }`}>
                {this.props.label && (
                    <label
                        className={`${this.props.required ? 'required' : ''} ${
                            this.state.isDisabled ? 'disabled' : ''
                        }`}>
                        {this.props.label}
                    </label>
                )}
                <div
                    className={`ui-treeDropdown-wrapper${this.state.isDisabled ? ' disabled' : ''}
                        ui-treeDropdown-wrapper-menu${
                            this.state.isMenuOpen ? '-open' : '-close'
                        } ui-treeDropdown-wrapper-${this.state.uiidInput}`}>
                    <UITextInput
                        componentRef={this.inputRef}
                        disabled={this.state.isDisabled}
                        autoComplete="off"
                        value={this.state.value}
                        placeholder={this.props.placeholderText}
                        onKeyDown={this.handleKeyPress}
                        onChange={this.handleOnChangeValue}
                        onClick={(): void => {
                            this.toggleMenu(false);
                        }}
                        onFocus={(event) => {
                            // Select the text of the input
                            event.target.select();
                        }}
                        errorMessage={messageInfo.message}
                    />
                    <UIIconButton
                        tabIndex={-1}
                        allowDisabledFocus={true}
                        className="ui-treeDropdown-caret"
                        iconProps={{ iconName: UiIcons.ArrowDown }}
                        onClick={(): void => {
                            if (this.state.isHidden) {
                                // Menu would become visible - focus input
                                this.inputRef.current?.focus();
                            }
                            this.toggleMenu(!this.state.isHidden);
                        }}
                    />
                </div>
                {!this.state.isHidden && (
                    <UIContextualMenu
                        componentRef={this.UITreeDropdownRef}
                        onRenderMenuList={this.handleRenderMenuList}
                        className="ui-treeDropDown-context-menu"
                        target={`.ui-treeDropDown-${this.state.uiidInput}`}
                        onMenuOpened={(): void => {
                            this.originalValue = this.state.value;
                            this.applyCustomKeyDownHandlingEvents();
                            this.setState({
                                isMenuOpen: true
                            });
                        }}
                        onMenuDismissed={(): void => {
                            this.removeCustomKeyDownHandlingEvents();
                            this.setState({ isMenuOpen: false });
                            if (this.state.valueChanged) {
                                this.handleSelection(this.state.value ? this.state.value : '');
                            }
                        }}
                        useTargetWidth={useTargetWidth}
                        useTargetAsMinWidth={true}
                        onRestoreFocus={(params: IPopupRestoreFocusParams) => {
                            params.originalElement?.focus();
                        }}
                        shouldUpdateWhenHidden={true}
                        items={this.state.items}
                        onDismiss={this.handleDismiss}
                        shouldFocusOnContainer={false}
                        focusZoneProps={{
                            componentRef: this.UITreeDropdownFocusZoneRef,
                            handleTabKey: FocusZoneTabbableElements.none,
                            isCircularNavigation: false
                        }}
                        shouldFocusOnMount={false}
                        directionalHint={this.props.directionalHint}
                        calloutProps={{
                            layerProps: {
                                className: `${SELECTOR_CLASSES.callout}${this.state.uiidInput}`
                            },
                            onLayerMounted: () => {
                                this.calculateSubmenuOffset();
                            }
                        }}
                        styles={{
                            container: {
                                maxHeight: 192,
                                overflowY: 'auto'
                            }
                        }}
                        maxWidth={this.props.maxWidth}
                    />
                )}
            </div>
        );
    }
}
