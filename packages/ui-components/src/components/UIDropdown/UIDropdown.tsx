import React from 'react';
import type {
    IDropdownProps,
    IDropdownStyles,
    ICalloutContentStyleProps,
    ICalloutContentStyles
} from '@fluentui/react';
import { Dropdown, DropdownMenuItemType, IDropdownOption, ResponsiveMode } from '@fluentui/react';

import { UIIcon } from '../UIIcon';
import type { UIMessagesExtendedProps, InputValidationMessageInfo } from '../../helper/ValidationMessage';
import { getMessageInfo, MESSAGE_TYPES_CLASSNAME_MAP } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';
import { isDropdownEmpty, getCalloutCollisionTransformationPropsForDropdown } from './utils';
import { CalloutCollisionTransform } from '../UICallout';

import './UIDropdown.scss';

export { IDropdownOption as UIDropdownOption };
export { DropdownMenuItemType as UIDropdownMenuItemType };

export interface UIDropdownProps extends IDropdownProps, UIMessagesExtendedProps {
    /**
     * An optional callback function to handle change.
     *
     * @param option - The selected option.
     * @param index - The index of the selected option.
     */
    onHandleChange?(option: IDropdownOption, index: number): void;
    /**
     * An optional callback function to handle open event.
     */
    onHandleOpen?(): void;
    /**
     * An optional callback function to render the title of the dropdown.
     *
     * @param items - The options of the dropdown.
     * @returns The JSX element representing the title.
     */
    onHandleRenderTitle?(items: IDropdownOption[] | undefined): JSX.Element;
    useDropdownAsMenuMinWidth?: boolean;
    readOnly?: boolean;
    calloutCollisionTransformation?: boolean;
}

export interface UIDropdownState {
    options: IDropdownOption[];
    isOpen: boolean;
}

type AccessibilityProps = Partial<IDropdownProps & { ['data-is-focusable']?: boolean }>;

const ERROR_BORDER_COLOR = 'var(--vscode-inputValidation-errorBorder)';

/**
 * UIDropdown component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/dropdown
 *
 * @exports
 * @class UIDropdown
 * @extends {React.Component<UIDropdownProps, UIDropdownState>}
 */
export class UIDropdown extends React.Component<UIDropdownProps, UIDropdownState> {
    private dropdownDomRef = React.createRef<HTMLDivElement>();
    private menuDomRef = React.createRef<HTMLDivElement>();
    private calloutCollisionTransform = new CalloutCollisionTransform(this.dropdownDomRef, this.menuDomRef);

    /**
     * Initializes component properties.
     *
     * @param {UIDropdownProps} props
     */
    public constructor(props: UIDropdownProps) {
        super(props);

        this.state = {
            options: [],
            isOpen: false
        };
    }

    onRenderCaretDown = (): JSX.Element => {
        return <UIIcon iconName="ArrowDown" style={{ height: '100%' }} />;
    };

    onRenderTitle = (items: IDropdownOption[] | undefined): JSX.Element => {
        if (this.props.multiSelect && this.props.onHandleRenderTitle) {
            return this.props.onHandleRenderTitle(items);
        } else {
            const { multiSelectDelimiter = ', ' } = this.props;
            if (items) {
                const title = items.map((i) => i.text).join(multiSelectDelimiter);
                return <React.Fragment>{title}</React.Fragment>;
            } else {
                return <React.Fragment>{this.props.title}</React.Fragment>;
            }
        }
    };

    onClick = (/* event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption, index?: number */): void => {
        this.setState(
            (prevState) => ({ isOpen: !prevState.isOpen }),
            () => {
                if (this.props.multiSelect && this.props.onHandleOpen) {
                    if (this.state.isOpen) {
                        this.setState((prevState) => ({ isOpen: !prevState.isOpen }));
                        this.props.onHandleOpen();
                    }
                }
            }
        );
    };

    onChange = (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption, index?: number): void => {
        if (this.props.multiSelect && this.props.onHandleChange) {
            if (option && index) {
                this.props.onHandleChange(option, index);
            }
        }
    };

    /**
     * Method stops event propagation.
     *
     * @param {React.MouseEvent<HTMLDivElement>} event Mouse event.
     */
    stopEventPropagation = (event: React.MouseEvent<HTMLDivElement>): void => {
        event.stopPropagation();
    };

    /**
     * Method used as workaround to separate focus and hover.
     * Default behaviour of fluent ui is that focus follows hover, but we need separe them.
     *
     * @param {IDropdownOption} [props] Dropdown props.
     * @param {(props?: IDropdownOption) => JSX.Element | null} [defaultRender] Default option renderer.
     * @returns {JSX.Element | null} Returns dropdown option element.
     */
    private readonly _onRenderOption = (
        props?: IDropdownOption,
        defaultRender?: (props?: IDropdownOption) => JSX.Element | null
    ): JSX.Element | null => {
        return (
            <>
                {defaultRender?.(props)}
                {props?.itemType !== DropdownMenuItemType.Header && (
                    <div
                        onMouseEnter={this.stopEventPropagation.bind(this)}
                        onMouseLeave={this.stopEventPropagation.bind(this)}
                        onMouseMove={this.stopEventPropagation.bind(this)}
                        className="ts-dropdown-item-blocker"></div>
                )}
            </>
        );
    };

    /**
     * Render dropdown menu option.
     *
     * @param {IDropdownOption} [props] Dropdown props.
     * @param {(props?: IDropdownOption) => JSX.Element | null} [defaultRender] Default option renderer.
     * @returns {JSX.Element | null} Returns dropdown option element.
     */
    private readonly onRenderOption = (
        props?: IDropdownOption,
        defaultRender?: (props?: IDropdownOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (this.props.onRenderOption) {
            return this.props.onRenderOption(props, this._onRenderOption.bind(this, props, defaultRender));
        }
        return this._onRenderOption(props, defaultRender);
    };

    /**
     * Method called on combobox item render.
     * We should pass query to it and avoid rendering if it is hidden.
     *
     * @param {IComboBoxOption} props Combobox item props.
     * @param {Function} defaultRender Combobox item default renderer.
     * @returns {JSX.Element | null} Element to render.
     */
    private readonly _onRenderItem = (
        props?: IDropdownOption,
        defaultRender?: (props?: IDropdownOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (defaultRender && props) {
            if (props.title === undefined) {
                // Apply title by default if property not provided
                // In older fluent-ui versions it was applied by default, but behavior changed in version '8.66.2'
                props.title = props.text;
            }
            return defaultRender(props);
        }
        return null;
    };

    /**
     * Render dropdown menu item.
     *
     * @param {IComboBoxOption} props Combobox item props.
     * @param {Function} defaultRender Combobox item default renderer.
     * @returns {JSX.Element | null} Element to render.
     */
    private onRenderItem = (
        props?: IDropdownOption,
        defaultRender?: (props?: IDropdownOption) => JSX.Element | null
    ): JSX.Element | null => {
        if (this.props.onRenderItem) {
            return this.props.onRenderItem(props, this._onRenderItem.bind(this, props, defaultRender));
        }
        return this._onRenderItem(props, defaultRender);
    };

    /**
     * Method returns styles for callout to support property 'useDropdownAsMenuMinWidth'.
     * States:
     * 1. Min width of callout is equals to width of droipdown input box;
     * 2. Max width equals to windows size minus 10px;
     * 3. Width is auto - it allows to make callout wider if menu option size exceeds size of dropdown input(min-width).
     *
     * @param {ICalloutContentStyleProps} calloutStyleProps Current callout styles.
     * @returns {Partial<ICalloutContentStyles>} Styles for callout.
     */
    getCalloutStylesForUseAsMinWidth(calloutStyleProps: ICalloutContentStyleProps): Partial<ICalloutContentStyles> {
        return {
            root: {
                minWidth: calloutStyleProps.calloutWidth,
                width: 'auto',
                maxWidth: 'calc(100% - 10px)'
            }
        };
    }

    /**
     * Method returns class names string depending on props and component state.
     *
     * @param {InputValidationMessageInfo} messageInfo Error/warning message if applied
     * @returns {string} Class names of root dropdown element.
     */
    private getClassNames(messageInfo: InputValidationMessageInfo): string {
        const { className, readOnly, disabled } = this.props;
        const errorSuffix = messageInfo.message ? MESSAGE_TYPES_CLASSNAME_MAP.get(messageInfo.type) : undefined;
        let classNames = `ts-SelectBox${messageInfo.message ? ' ts-SelectBox--' + errorSuffix : ''}`;
        // Readonly
        if (readOnly && !disabled) {
            classNames += ' ts-SelectBox--readonly';
        }
        // Disabled
        if (disabled) {
            classNames += ' ts-SelectBox--disabled';
        }
        // Custom external classes
        if (className) {
            classNames += ` ${className}`;
        }
        // Empty value
        if (isDropdownEmpty(this.props)) {
            classNames += ' ts-SelectBox--empty';
        }
        return classNames;
    }

    /**
     * Method returns additional component properties for accessibility.
     *
     * @returns {AccessibilityProps} Additional properties.
     */
    private getAccessibilityProps(): AccessibilityProps {
        const { readOnly, disabled } = this.props;
        const additionalProps: AccessibilityProps = {};
        if (readOnly && !disabled) {
            // Make dropdown focusable
            additionalProps.tabIndex = 0;
            additionalProps['data-is-focusable'] = true;
            // Adjust aria attributes for readonly
            additionalProps['aria-disabled'] = undefined;
            additionalProps['aria-readonly'] = true;
        } else if (disabled) {
            additionalProps.tabIndex = 0;
            additionalProps['data-is-focusable'] = true;
        }
        return additionalProps;
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        const additionalProps = this.getAccessibilityProps();
        const dropdownStyles = (): Partial<IDropdownStyles> => ({
            ...{
                label: {
                    ...labelGlobalStyle,
                    ...(this.props.disabled && {
                        opacity: '0.4'
                    }),
                    ...(this.props.required && {
                        selectors: {
                            '::after': {
                                content: `' *'`,
                                color: ERROR_BORDER_COLOR,
                                paddingRight: 12
                            }
                        }
                    })
                },

                errorMessage: [messageInfo.style]
            }
        });

        return (
            <Dropdown
                ref={this.dropdownDomRef}
                onRenderCaretDown={this.onRenderCaretDown}
                onClick={this.onClick}
                onChange={this.onChange}
                onRenderTitle={this.onRenderTitle}
                // Use default responsiveMode as xxxLarge, which does not enter mobile mode.
                responsiveMode={ResponsiveMode.xxxLarge}
                disabled={this.props.readOnly}
                {...additionalProps}
                {...this.props}
                calloutProps={{
                    calloutMaxHeight: 200,
                    styles: this.props.useDropdownAsMenuMinWidth ? this.getCalloutStylesForUseAsMinWidth : undefined,
                    className: 'ts-Callout ts-Callout-Dropdown',
                    popupProps: {
                        ref: this.menuDomRef
                    },
                    ...this.props.calloutProps,
                    ...getCalloutCollisionTransformationPropsForDropdown(this, this.calloutCollisionTransform)
                }}
                onRenderOption={this.onRenderOption.bind(this)}
                onRenderItem={this.onRenderItem.bind(this)}
                styles={dropdownStyles}
                className={this.getClassNames(messageInfo)}
                errorMessage={messageInfo.message}
            />
        );
    }
}
