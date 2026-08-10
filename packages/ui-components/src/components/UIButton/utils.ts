import type { IButton } from '@fluentui/react';
import type React from 'react';

export interface UIBaseButtonProps {
    /**
     * When true, the component handles Alt+Down internally to open the contextual menu,
     * preventing the host application's menubar from stealing focus on menu dismiss.
     *
     * @default true
     */
    propagateMenuOpenKeyDown?: boolean;
}

/**
 * Shared keydown handler for buttons with a contextual menu.
 * Intercepts Alt+Down before Fluent's _onMenuKeyDown runs: calling preventDefault()
 * sets ev.defaultPrevented=true, which causes Fluent to skip its own stopPropagation().
 * The Down keydown then bubbles up, preventing the host application's menubar from
 * stealing focus after the menu is dismissed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleMenuKeyDown(
    ev: React.KeyboardEvent<any>,
    buttonRef: React.RefObject<IButton>,
    onKeyDown?: (ev: React.KeyboardEvent<any>) => void
): void {
    if (ev.altKey && ev.key === 'ArrowDown') {
        ev.preventDefault();
        buttonRef.current?.openMenu(false, true);
    }
    onKeyDown?.(ev);
}
