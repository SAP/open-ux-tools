import React from 'react';
import type {
    IDropdownProps,
    IDropdownStyles,
    ICalloutContentStyleProps,
    ICalloutContentStyles
} from '@fluentui/react';
import { Dropdown, DropdownMenuItemType, IDropdownOption, ResponsiveMode } from '@fluentui/react';

import { UIIcon } from '../UIIcon';
import type { UIMessagesExtendedProps } from '../../helper/ValidationMessage';
import { getMessageInfo, MESSAGE_TYPES_CLASSNAME_MAP } from '../../helper/ValidationMessage';
import { labelGlobalStyle } from '../UILabel';

import './UIDropdown.scss';

export { IDropdownOption as UIDropdownOption };
export { DropdownMenuItemType as UIDropdownMenuItemType };

export interface UIDropdownProps extends IDropdownProps, UIMessagesExtendedProps {
    onHandleChange?(option: IDropdownOption, index: number): void;
    onHandleOpen?(): void;
    onHandleRenderTitle?(items: IDropdownOption[] | undefined): JSX.Element;
    useDropdownAsMenuMinWidth?: boolean;
}

export interface UIDropdownState {
    options: IDropdownOption[];
    isOpen: boolean;
}

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
        this.setState({ isOpen: !this.state.isOpen }, () => {
            if (this.props.multiSelect && this.props.onHandleOpen) {
                if (this.state.isOpen) {
                    this.setState({ isOpen: !this.state.isOpen });
                    this.props.onHandleOpen();
                }
            }
        });
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
    private readonly onRenderOption = (
        props?: IDropdownOption,
        defaultRender?: (props?: IDropdownOption) => JSX.Element | null
    ): JSX.Element | null => {
        return (
            <>
                {defaultRender?.(props)}
                <div
                    onMouseEnter={this.stopEventPropagation.bind(this)}
                    onMouseLeave={this.stopEventPropagation.bind(this)}
                    onMouseMove={this.stopEventPropagation.bind(this)}
                    className="ts-dropdown-item-blocker"></div>
            </>
        );
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
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const messageInfo = getMessageInfo(this.props);
        const errorSuffix = messageInfo.message ? MESSAGE_TYPES_CLASSNAME_MAP.get(messageInfo.type) : undefined;
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

        const propClassName = this.props.className ? ` ${this.props.className}` : '';
        return (
            <Dropdown
                calloutProps={{
                    calloutMaxHeight: 200,
                    styles: this.props.useDropdownAsMenuMinWidth ? this.getCalloutStylesForUseAsMinWidth : undefined,
                    className: 'ts-Callout ts-Callout-Dropdown'
                }}
                onRenderCaretDown={this.onRenderCaretDown}
                onClick={this.onClick}
                onChange={this.onChange}
                onRenderTitle={this.onRenderTitle}
                onRenderOption={this.onRenderOption.bind(this)}
                onRenderItem={this.onRenderItem.bind(this)}
                // Use default responsiveMode as xxxLarge, which does not enter mobile mode.
                responsiveMode={ResponsiveMode.xxxLarge}
                {...this.props}
                styles={dropdownStyles}
                className={`ts-SelectBox${messageInfo.message ? ' ts-SelectBox--' + errorSuffix : ''}${propClassName}`}
                errorMessage={messageInfo.message}
            />
        );
    }
}
