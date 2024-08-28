import React from 'react';
import type {
    IContextualMenuStyles,
    IContextualMenuItemStyles,
    ICalloutContentStyles,
    IRawStyle,
    IStyleFunctionOrObject,
    IContextualMenuStyleProps
} from '@fluentui/react';
import { ContextualMenu, ContextualMenuItemType, IContextualMenuProps, IContextualMenuItem } from '@fluentui/react';
export { IContextualMenuItem } from '@fluentui/react';

export { IContextualMenuItem as UIContextualMenuItem };
export { IContextualMenuProps as UIContextualMenuProps };
export { ContextualMenuItemType as UIContextualMenuItemType };

import { UiIcons } from '../Icons';

export enum UIContextualMenuLayoutType {
    DropdownMenu = 'DropdownMenu',
    ContextualMenu = 'ContextualMenu'
}

import './UIContextualMenu.scss';

const DEFAULT_ZINDEX = 1000000;

/* Method receives callout style and extracts into raw styles object.
 *
 * @param {IStyleFunctionOrObject<ICalloutContentStyleProps, ICalloutContentStyles> | undefined} styles Callout styles.
 * @param {keyof ICalloutContentStyles} name Callout style type.
 * @returns {IRawStyle} Raw style object.
 */
const extractRawStyles = (
    styles: IStyleFunctionOrObject<IContextualMenuStyleProps, IContextualMenuStyles> | undefined,
    name: keyof IContextualMenuStyles
): IRawStyle => {
    if (typeof styles === 'object' && typeof styles[name] === 'object') {
        return styles[name] as IContextualMenuStyles;
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
            maxWidth: 300,
            background: 'var(--vscode-input-background)',
            border: 0
        }
    };
}

/**
 * ContextualMenu subcomponent styles prop generator.
 *
 * @param props Contextual menu properties.
 * @param currentItemHasSubmenu Item has submenu.
 * @param itemsHaveSubMenu At least one of sibling item has submenu.
 * @returns - consumable styles property for ContextualMenuItem
 */
export function getUIContextualMenuItemStyles(
    props: UIIContextualMenuProps,
    currentItemHasSubmenu?: boolean,
    itemsHaveSubMenu?: boolean
): Partial<IContextualMenuItemStyles> {
    const { iconToLeft } = props;
    const padding: { label?: number; root?: string; rootRight?: string } = {};
    if (iconToLeft && itemsHaveSubMenu) {
        padding.label = currentItemHasSubmenu ? 10 : 19;
        padding.root = '0 3px !important';
    } else if (!iconToLeft && currentItemHasSubmenu) {
        padding.rootRight = '3px !important';
    }
    return {
        root: {
            padding: padding.root,
            paddingRight: padding.rootRight
        },
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
            paddingLeft: padding.label
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
 * @param props Contextual menu properties.
 * @param maxWidth Maximal width of callout
 * @returns consumable styles property for Callout
 */
export function getUIcontextualMenuCalloutStyles(
    props: IContextualMenuProps,
    maxWidth?: number
): Partial<ICalloutContentStyles> {
    return {
        root: {
            maxWidth: maxWidth,
            ...extractRawStyles(props.styles, 'root')
        }
    };
}

/**
 * Recursively applies corresponding styles generator to each,
 * IContextualMenuItem, ICallourProps and IContxualMenuProps item in props tree.
 *
 * @param props Contextual menu properties.
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
    layoutType?: UIContextualMenuLayoutType;
    showSubmenuBeneath?: boolean;
}

/**
 * Method returns class names string depending on props and component state.
 *
 * @param props Contextual menu properties.
 * @returns Class names of root element.
 */
function getClassNames(props: UIIContextualMenuProps): string {
    const classNames = ['ts-ContextualMenu'];
    const { layoutType = UIContextualMenuLayoutType.DropdownMenu, iconToLeft } = props;
    const layoutClassName =
        layoutType === UIContextualMenuLayoutType.DropdownMenu
            ? 'ts-ContextualMenu--dropdown'
            : 'ts-ContextualMenu--contextual';
    classNames.push(layoutClassName);
    if (props.className) {
        classNames.push(props.className);
    }
    if (iconToLeft) {
        classNames.push('ts-ContextualMenu--reverse');
    }
    return classNames.join(' ');
}

/**
 * Method returns class names string for callout element depending on props and component state.
 *
 * @param props Contextual menu properties.
 * @param isSubmenu Is submenu.
 * @returns Class names of callout element.
 */
function getCalloutClassName(props: UIIContextualMenuProps, isSubmenu?: boolean): string {
    const classNames = ['ts-ContextualMenu-callout'];
    const { layoutType = UIContextualMenuLayoutType.DropdownMenu } = props;
    const layoutClassName =
        layoutType === UIContextualMenuLayoutType.DropdownMenu
            ? 'ts-ContextualMenu-callout--dropdown'
            : 'ts-ContextualMenu-callout--contextual';
    classNames.push(layoutClassName);
    if (isSubmenu && props.showSubmenuBeneath) {
        classNames.push('ts-ContextualMenu-callout--submenu-beneath');
    }
    if (props.calloutProps?.className) {
        classNames.push(props.calloutProps.className);
    }
    return classNames.join(' ');
}

export const UIContextualMenu: React.FC<UIIContextualMenuProps> = (props) => {
    const { showSubmenuBeneath } = props;
    const zIndex = showSubmenuBeneath ? DEFAULT_ZINDEX - 1 : undefined;
    return (
        <ContextualMenu
            isBeakVisible={false}
            beakWidth={8}
            onRenderSubMenu={getSubMenu.bind(undefined, props, zIndex)}
            {...props}
            className={getClassNames(props)}
            items={injectContextualMenuItemsStyle(props)}
            calloutProps={{
                styles: getUIcontextualMenuCalloutStyles(props, props.maxWidth),
                ...props.calloutProps,
                className: getCalloutClassName(props)
            }}
            styles={{ ...getUIcontextualMenuStyles(), ...props.styles }}
        />
    );
};

/**
 * Method returns element for submenu of contextual menu.
 *
 * @param rootMenuProps Root contextual menu props.
 * @param zIndex z-index to apply for layer of submenu.
 * @param subMenuProps Submenu properties.
 * @returns Element for submenu of contextual menu.
 */
function getSubMenu(
    rootMenuProps: UIIContextualMenuProps,
    zIndex?: number,
    subMenuProps?: IContextualMenuProps
): JSX.Element | null {
    if (!subMenuProps) {
        return null;
    }
    const { iconToLeft } = rootMenuProps;
    const zIndexOfSubmenu = zIndex !== undefined ? zIndex - 1 : undefined;
    return (
        <UIContextualMenu
            iconToLeft={iconToLeft}
            {...subMenuProps}
            calloutProps={{
                gapSpace: 10,
                layerProps: {
                    styles: { root: { zIndex } }
                },
                ...subMenuProps.calloutProps,
                className: getCalloutClassName(rootMenuProps, true)
            }}
            onRenderSubMenu={getSubMenu.bind(undefined, rootMenuProps, zIndexOfSubmenu)}
        />
    );
}
