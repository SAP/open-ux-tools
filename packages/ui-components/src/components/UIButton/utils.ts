import type { IButton } from '@fluentui/react';
import type React from 'react';

/**
 * Returns a ref that populates both the internal mutable ref and an optional external ref.
 * Handles both callback refs and RefObject externals.
 *
 * @param internalRef - Component-owned mutable ref used for internal logic (e.g. opening a menu).
 * @param externalRef - Caller-supplied ref, if any.
 * @returns A merged React.Ref that satisfies both.
 */
export function mergeButtonRef<T>(
    internalRef: React.MutableRefObject<T | null>,
    externalRef: React.Ref<T> | undefined
): React.Ref<T> {
    if (!externalRef) {
        return internalRef;
    }
    return (instance: T | null) => {
        internalRef.current = instance;
        if (typeof externalRef === 'function') {
            externalRef(instance);
        } else {
            (externalRef as React.MutableRefObject<T | null>).current = instance;
        }
    };
}

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
 *
 * @param ev
 * @param buttonRef
 * @param onKeyDown
 */
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
