import React from 'react';
import { UIContextualMenu, UIContextualMenuItem, UIIContextualMenuProps } from '../../UIContextualMenu';

export interface SubMenuContextMenuProps extends UIIContextualMenuProps {
    /**
     * Callback called when submenu should hide.
     */
    hideSubmenu: () => void;
}

export const SubMenuContextMenu = (props: SubMenuContextMenuProps) => {
    const { target, hideSubmenu, onItemClick, items, directionalHint } = props;
    return (
        <UIContextualMenu
            target={target}
            className="dropdown-submenu"
            calloutProps={{
                onMouseLeave: (event) => {
                    hideSubmenu();
                }
            }}
            onItemClick={(ev, item?: UIContextualMenuItem) => {
                onItemClick?.(ev, item);
                hideSubmenu();
            }}
            directionalHint={directionalHint ?? 11}
            // directionalHintFixed={true}
            shouldFocusOnMount={false}
            items={items}
            delayUpdateFocusOnHover={true}
        />
    );
};
