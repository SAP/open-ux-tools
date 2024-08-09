import React from 'react';
import type {
    IContextualMenuStyles,
    IContextualMenuItemStyles,
    ICalloutContentStyles,
    IRawStyle,
    IStyleFunctionOrObject,
    ICalloutContentStyleProps
} from '@fluentui/react';
import { ContextualMenu, ContextualMenuItemType, IContextualMenuProps, IContextualMenuItem } from '@fluentui/react';
export { IContextualMenuItem } from '@fluentui/react';

export { IContextualMenuItem as UIContextualMenuItem };
export { IContextualMenuProps as UIContextualMenuProps };
export { ContextualMenuItemType as UIContextualMenuItemType };

import { UiIcons } from '../Icons';

import './UIContextualMenu.scss';
import '../../styles/_shadows.scss';
const CALLOUT_STYLES = {
    background: 'var(--vscode-editorWidget-background)',
    boxShadow: 'var(--ui-box-shadow-small)',
    text: 'var(--vscode-editorSuggestWidget-foreground)',
    font: 'var(--vscode-font-family)',
    borderRadius: 4
};
/* Method receives callout style and extracts into raw styles object.
 *
 * @param {IStyleFunctionOrObject<ICalloutContentStyleProps, ICalloutContentStyles> | undefined} styles Callout styles.
 * @param {keyof ICalloutContentStyles} name Callout style type.
 * @returns {IRawStyle} Raw style object.
 */
const extractRawStyles = (
    styles: IStyleFunctionOrObject<ICalloutContentStyleProps, ICalloutContentStyles> | undefined,
    name: keyof ICalloutContentStyles
): IRawStyle => {
    if (typeof styles === 'object' && typeof styles[name] === 'object') {
        return styles[name] as IRawStyle;
    }
    return {};
};

const submenuIconProps = { iconName: UiIcons.ArrowDown };

/**
 * ContextualMenu styles prop generator.
 *
 * @returns - consumable styles property for ContextualMenu
 */
export function getUIcontextualMenuStyles(): Partial<IContextualMenuStyles> {
    return {
        root: {
            minWidth: 190,
            background: 'var(--vscode-input-background)',
            border: 0
        },
        container: {
            paddingTop: 2,
            paddingBottom: 2
        }
    };
}

/**
 * ContextualMenu subcomponent styles prop generator.
 *
 * @returns - consumable styles property for ContextualMenuItem
 */
export function getUIContextualMenuItemStyles(
    props: UIIContextualMenuProps,
    currentItemHasSubmenu: boolean,
    itemsHaveSubMenu: boolean
): Partial<IContextualMenuItemStyles> {
    const { iconToLeft } = props;
    let padding: number | undefined = undefined;
    if (iconToLeft && itemsHaveSubMenu) {
        padding = currentItemHasSubmenu ? 10 : 25;
    }
    return {
        checkmarkIcon: {
            color: 'var(--vscode-foreground)',
            maxHeight: 18,
            fontSize: 16,
            lineHeight: 18,
            margin: 0
        },
        icon: {
            marginLeft: 0,
            marginRight: 6
        },
        label: {
            fontFamily: 'var(--vscode-font-family)',
            lineHeight: 18,
            height: 18,
            paddingLeft: padding
        },
        linkContent: {
            fontSize: 13,
            height: 'auto'
        },
        subMenuIcon: {
            height: 16,
            width: 16,
            transform: iconToLeft ? 'rotate(90deg)' : 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            lineHeight: 0
        }
    };
}

/**
 * ContextualMenu sub-component styles prop generator.
 *
 * @param {number} maxWidth
 * @returns consumable styles property for Callout
 */
export function getUIcontextualMenuCalloutStyles(
    props: IContextualMenuProps,
    maxWidth?: number
): Partial<ICalloutContentStyles> {
    return {
        root: {
            maxWidth: maxWidth,
            boxShadow: CALLOUT_STYLES.boxShadow,
            backgroundColor: 'transparent',
            borderRadius: CALLOUT_STYLES.borderRadius,
            ...extractRawStyles(props.styles, 'root')
        },
        beak: {
            backgroundColor: CALLOUT_STYLES.background,
            boxShadow: CALLOUT_STYLES.boxShadow,
            ...extractRawStyles(props.styles, 'beak')
        },
        beakCurtain: {
            backgroundColor: CALLOUT_STYLES.background,
            borderRadius: CALLOUT_STYLES.borderRadius,
            ...extractRawStyles(props.styles, 'beakCurtain')
        }
    };
}

/**
 * Recursively applies corresponding styles generator to each,
 * IContextualMenuItem, ICallourProps and IContxualMenuProps item in props tree.
 *
 * @param items - IContextualMenu list
 * @returns - mutated IContextualMenuItem prop with styles props generators applied to each menu tree node
 */
function injectContextualMenuItemsStyle(props: UIIContextualMenuProps): IContextualMenuItem[] {
    const { items, iconToLeft } = props;
    const renderMenuWithIcons = items.some((item) => item.iconProps);
    const itemsHaveSubMenu = items.some((item) => item.subMenuProps);
    return items.map((item: IContextualMenuItem) => {
        if (!item.itemProps) {
            item.itemProps = {};
        }
        const submenu = !!item.subMenuProps;
        if (item.itemProps.styles) {
            item.itemProps.styles = {
                ...getUIContextualMenuItemStyles(props, submenu, itemsHaveSubMenu),
                ...item.itemProps.styles
            };
        } else {
            item.itemProps.styles = getUIContextualMenuItemStyles(props, submenu, itemsHaveSubMenu);
        }

        if (!item.submenuIconProps) {
            item.submenuIconProps = submenuIconProps;
        }

        if (item.iconProps || renderMenuWithIcons) {
            item.onRenderContent = (props, renderers): React.ReactNode => {
                return (
                    <>
                        {renderers.renderItemName(props)}
                        {item.iconProps && renderers.renderItemIcon(props)}
                    </>
                );
            };
        } else if (iconToLeft) {
            item.onRenderContent = (props, defaultRenders): React.ReactNode => {
                return (
                    <>
                        {defaultRenders.renderSubMenuIcon(props)}
                        {defaultRenders.renderCheckMarkIcon(props)}
                        {defaultRenders.renderItemIcon(props)}
                        {defaultRenders.renderItemName(props)}
                        {defaultRenders.renderSecondaryText(props)}
                    </>
                );
            };
        }

        return item;
    });
}

export interface UIIContextualMenuProps extends IContextualMenuProps {
    maxWidth?: number; // max width for the ComboBox
    iconToLeft?: boolean;
}

export const UIContextualMenu: React.FC<UIIContextualMenuProps> = (props) => {
    const className = props.className ? ` ${props.className}` : '';
    return (
        <ContextualMenu
            isBeakVisible={false}
            {...props}
            className={`ts-ContextualMenu${className}`}
            items={injectContextualMenuItemsStyle(props)}
            calloutProps={{
                className: 'ts-ContextualMenu-callout',
                styles: getUIcontextualMenuCalloutStyles(props, props.maxWidth),
                ...props.calloutProps
            }}
            styles={{ ...getUIcontextualMenuStyles(), ...props.styles }}
            onRenderSubMenu={getSubMenu.bind(this, props)}
        />
    );
};

/**
 * Method returns element for submenu of contextual menu.
 *
 * @param props Contextual menu properties.
 * @returns Element for submenu of contextual menu.
 */
function getSubMenu(rootMenuProps: UIIContextualMenuProps, subMenuProps?: IContextualMenuProps): JSX.Element | null {
    if (!subMenuProps) {
        return null;
    }
    const { iconToLeft } = rootMenuProps;
    return <UIContextualMenu iconToLeft {...subMenuProps} />;
}
