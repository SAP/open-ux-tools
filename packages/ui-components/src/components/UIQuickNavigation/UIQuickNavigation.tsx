import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getUIFirstFocusable, isHTMLElement, setUIFocusVisibility } from '../../utilities';

import './UIQuickNavigation.scss';

export const QUICK_NAVIGATION_ATTRIBUTE = 'data-quick-navigation-key';
export const QUICK_NAVIGATION_ATTRIBUTE_OFFSET_Y = 'data-quick-navigation-offset-y';
export const QUICK_NAVIGATION_ATTRIBUTE_OFFSET_X = 'data-quick-navigation-offset-x';
const QUICK_NAVIGATION_CLASSES = {
    inline: 'quick-navigation--inline',
    external: 'quick-navigation--external'
};
const EXTERNAL_HELPER_OFFSET: UIQuickNavigationOffset = {
    x: 15,
    y: 15
};

export interface UIQuickNavigationAttribute {
    [QUICK_NAVIGATION_ATTRIBUTE]: string;
    [QUICK_NAVIGATION_ATTRIBUTE_OFFSET_Y]?: string;
    [QUICK_NAVIGATION_ATTRIBUTE_OFFSET_X]?: string;
}

export const setQuickNavigationKey = (key: string, offset?: UIQuickNavigationOffset): UIQuickNavigationAttribute => {
    const attributes: UIQuickNavigationAttribute = {
        [QUICK_NAVIGATION_ATTRIBUTE]: key.toUpperCase()
    };
    if (offset) {
        attributes[QUICK_NAVIGATION_ATTRIBUTE_OFFSET_Y] = offset.y.toString();
        attributes[QUICK_NAVIGATION_ATTRIBUTE_OFFSET_X] = offset.x.toString();
    }
    return attributes;
};

export interface UIQuickNavigationOffset {
    x: number;
    y: number;
}

export interface UIQuickNavigationProps {
    className?: string;
    children: React.ReactNode;
    inline?: boolean;
    offset?: UIQuickNavigationOffset;
}

/**
 * Method returns CSS classnames based on current quick navigation state.
 *
 * @param className External classname(s).
 * @param enabled Is quick navigation enabled/activated.
 * @param inline Is quick navigation should be rendered with inline approach.
 * @returns CSS classnames based on current quick navigation state.
 */
function getClassName(className?: string, enabled?: boolean, inline?: boolean): string {
    const result = [className];
    if (enabled && inline) {
        result.push(QUICK_NAVIGATION_CLASSES.inline);
    }
    return result.join(' ');
}

/**
 * Method returns scroll offset position for external rendering approach.
 * External rendering happens in 'document.body' and body scroll position should be considered.
 *
 * @returns Scroll position of body and html.
 */
function getScrollOffset(): UIQuickNavigationOffset {
    let container: HTMLElement | undefined = document.body;
    const scrollOffset = {
        y: 0,
        x: 0
    };
    do {
        scrollOffset.y += container.scrollTop || 0;
        scrollOffset.x += container.scrollLeft || 0;
        container = container.parentNode && isHTMLElement(container.parentNode) ? container.parentNode : undefined;
    } while (container);
    return scrollOffset;
}

/**
 * Method returns offset for passed DOM element.
 *
 * @param target Target element to detect offset.
 * @returns Scroll position of body and html.
 */
function getOffsetFromElement(target: Element): UIQuickNavigationOffset | undefined {
    const yAttr = target.getAttribute(QUICK_NAVIGATION_ATTRIBUTE_OFFSET_Y);
    const xAttr = target.getAttribute(QUICK_NAVIGATION_ATTRIBUTE_OFFSET_X);
    if (!yAttr || !xAttr) {
        return undefined;
    }
    const y = parseFloat(yAttr);
    const x = parseFloat(xAttr);
    return !isNaN(y) && !isNaN(x) ? { y, x } : undefined;
}

/**
 * Method toggles visibility of external quick navigation helpers UI.
 *
 * @param enabled Is quick navigation enabled/activated.
 * @param offset Offset values for helper position.
 */
function toggleExternalVisibility(enabled: boolean, offset = EXTERNAL_HELPER_OFFSET): void {
    const holder = document.body;
    // Cleanup container
    const existingContainer = document.querySelector(`.${QUICK_NAVIGATION_CLASSES.external}`);
    if (existingContainer) {
        holder.removeChild(existingContainer);
    }
    // Show helpers if quick navigation is active
    if (enabled) {
        // Create external container
        const externalContainer = document.createElement('div');
        externalContainer.classList.add(QUICK_NAVIGATION_CLASSES.external);
        const navigationTargets = document.querySelectorAll(`[${QUICK_NAVIGATION_ATTRIBUTE}]`);
        // Create external DOM element to each navigation target
        const scrollOffset = getScrollOffset();
        navigationTargets.forEach((target) => {
            const rect = target.getBoundingClientRect();
            const helper = document.createElement('div');
            helper.textContent = target.getAttribute(QUICK_NAVIGATION_ATTRIBUTE);
            const elementOffset = getOffsetFromElement(target) ?? offset;
            const position = {
                top: rect.top + scrollOffset.y - elementOffset.y,
                left: rect.left + scrollOffset.x - elementOffset.x
            };
            position.top = Math.max(position.top, 0);
            position.left = Math.max(position.left, 0);
            helper.style.top = `${position.top}px`;
            helper.style.left = `${position.left}px`;
            externalContainer.appendChild(helper);
        });
        holder.appendChild(externalContainer);
    }
}

/**
 * Method checks if quick navigation should be enabled for passed keyboard event.
 * Quick navigation is enabled when user hold 'ctrl + alt' or 'meta + alt'.
 *
 * @param event Keyboard event.
 * @returns True if quick navigation should be enabled for passed keyboard event.
 */
export const isQuickNavigationEnabled = (event: KeyboardEvent): boolean => {
    return (event.ctrlKey || event.metaKey) && event.altKey;
};

/**
 * Method resolves passed keyboard code by removing 'Digit' and 'Key' keywords.
 *
 * @param code Code from keyboard event.
 * @returns Resolved char or digit.
 */
function resolveKeyCode(code: string): string | undefined {
    return code.replace('Digit', '').replace('Key', '').toUpperCase();
}

/**
 * Method to stop event bubbling.
 *
 * @param event Keyboard event.
 */
function stopEventBubling(event: KeyboardEvent | FocusEvent): void {
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const UIQuickNavigation: React.FC<UIQuickNavigationProps> = (props: UIQuickNavigationProps) => {
    const { className, children, inline, offset } = props;
    const [enabled, setEnabled] = useState(false);
    const navigated = useRef<boolean>(false);

    // Handle visibility for 'external' rendering approach(helpers rendered outside of target navigation containers)
    useEffect(() => {
        if (inline) {
            return;
        }
        toggleExternalVisibility(enabled, offset);
    }, [enabled]);

    /**
     * Method handles key down event.
     *
     * @param event Key down event.
     */
    const onKeyDown = useCallback(
        (event: KeyboardEvent): void => {
            let activated = enabled;
            if (!enabled && isQuickNavigationEnabled(event)) {
                setEnabled(true);
                activated = true;
            }
            if (!activated) {
                return;
            }
            // Quick navigation is active - handle final key press
            const resolvedKey = resolveKeyCode(event.code);
            const navigationElement: HTMLElement | null = document.querySelector(
                `[${QUICK_NAVIGATION_ATTRIBUTE}="${resolvedKey}"]`
            );
            const startElement: Element | null | undefined = navigationElement?.firstElementChild;
            if (navigationElement && startElement && isHTMLElement(startElement)) {
                const firstFocusableElement = getUIFirstFocusable(navigationElement, startElement, true);
                if (firstFocusableElement) {
                    // Set focus visiblity in UI(fluent-ui feature)
                    setUIFocusVisibility(true, firstFocusableElement);
                    // Apply focus to element
                    firstFocusableElement?.focus();
                    // Prevent event bubbling
                    stopEventBubling(event);
                    navigated.current = true;
                }
                // Disable/deactivate UI with quick navigation
                setEnabled(false);
            }
        },
        [enabled]
    );

    /**
     * Method handles key up and window blur events to detect if quick navigation should be deactivated.
     *
     * @param event Key up or blur event.
     */
    const onRelease = useCallback(
        (event: KeyboardEvent | FocusEvent) => {
            if (enabled && (!('keyCode' in event) || !isQuickNavigationEnabled(event))) {
                setEnabled(false);
            }
            if (navigated.current) {
                navigated.current = false;
                stopEventBubling(event);
            }
        },
        [enabled]
    );

    /**
     * Attach events to listen keydown/keyup within window and blur from window.
     */
    useEffect(() => {
        document.body.addEventListener('keydown', onKeyDown);
        document.body.addEventListener('keyup', onRelease);
        window.addEventListener('blur', onRelease);
        return () => {
            toggleExternalVisibility(false);
            document.body.removeEventListener('keydown', onKeyDown);
            document.body.removeEventListener('keyup', onRelease);
            window.removeEventListener('blur', onRelease);
        };
    }, [onKeyDown, onRelease]);

    return <div className={getClassName(className, enabled, inline)}>{children}</div>;
};

UIQuickNavigation.defaultProps = {
    inline: false,
    offset: EXTERNAL_HELPER_OFFSET
};
