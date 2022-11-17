import React from 'react';
import type { IContextualMenuStyles, IContextualMenuItemStyles, ICalloutContentStyles } from '@fluentui/react';
import { ContextualMenu, ContextualMenuItemType, IContextualMenuProps, IContextualMenuItem } from '@fluentui/react';
export { IContextualMenuItem } from '@fluentui/react';

export { IContextualMenuItem as UIContextualMenuItem };
export { IContextualMenuProps as UIContextualMenuProps };
export { ContextualMenuItemType as UIContextualMenuItemType };

import { UiIcons } from '../Icons';

import './UIContextualMenu.scss';

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
        }
    };
}

/**
 * ContextualMenu subcomponent styles prop generator.
 *
 * @returns - consumable styles property for ContextualMenuItem
 */
export function getUIContextualMenuItemStyles(): Partial<IContextualMenuItemStyles> {
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
            height: 18
        },
        linkContent: {
            fontSize: 13,
            height: 'auto'
        },
        subMenuIcon: {
            height: 16,
            width: 16,
            transform: 'rotate(-90deg)',
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
export function getUIcontextualMenuCalloutStyles(maxWidth?: number): Partial<ICalloutContentStyles> {
    return {
        root: {
            // workaround. resolves callout root element borders being cut or invisible
            // issue appears in webkit based environments with double as devicePixelRatio value
            animationFillMode: 'none',
            transform: 'rotate(0.0001deg)',
            maxWidth: maxWidth
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
function injectContextualMenuItemsStyle(items: IContextualMenuItem[]): IContextualMenuItem[] {
    return items.map((item: IContextualMenuItem) => {
        if (!item.itemProps) {
            item.itemProps = {};
        }

        if (item.itemProps.styles) {
            item.itemProps.styles = {
                ...getUIContextualMenuItemStyles(),
                ...item.itemProps.styles
            };
        } else {
            item.itemProps.styles = getUIContextualMenuItemStyles();
        }

        if (!item.submenuIconProps) {
            item.submenuIconProps = submenuIconProps;
        }

        return item;
    });
}

export interface UIIContextualMenuProps extends IContextualMenuProps {
    maxWidth?: number; // max width for the ComboBox
}

export const UIContextualMenu: React.FC<UIIContextualMenuProps> = (props) => {
    const className = props.className ? ` ${props.className}` : '';
    return (
        <ContextualMenu
            {...props}
            className={`ts-ContextualMenu${className}`}
            items={injectContextualMenuItemsStyle(props.items)}
            isBeakVisible={false}
            calloutProps={{
                className: 'ts-ContextualMenu-callout',
                styles: getUIcontextualMenuCalloutStyles(props.maxWidth),
                ...props.calloutProps
            }}
            styles={{ ...getUIcontextualMenuStyles(), ...props.styles }}
            onRenderSubMenu={(props?: IContextualMenuProps): JSX.Element | null => {
                if (!props) {
                    return null;
                }
                return <UIContextualMenu {...props} />;
            }}
        />
    );
};
