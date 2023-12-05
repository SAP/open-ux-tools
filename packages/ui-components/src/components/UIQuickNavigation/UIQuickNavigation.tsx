import React, { useCallback, useEffect, useState } from 'react';
import { getUIFirstFocusable, isHTMLElement, setUIFocusVisibility } from '../../utilities';

import './UIQuickNavigation.scss';
import { isQuickNavigationEnabled, resolveKeyCode } from './keyBindingsResolver';
import { getDocument } from '@fluentui/react';

export const QUICK_NAVIGATION_ATTRIBUTE = 'data-quick-navigation-key';
export const QUICK_NAVIGATION_EXTERNAL_CLASS = 'quick-navigation-external';
const EXTERNAL_HELPER_OFFSET: QuickNavigationOffset = {
    x: 15,
    y: 15
};

export interface QuickNavigationAttribute {
    [QUICK_NAVIGATION_ATTRIBUTE]: string;
}

export const setQuickNavigationKey = (key: string): QuickNavigationAttribute => {
    return {
        [QUICK_NAVIGATION_ATTRIBUTE]: key.toUpperCase()
    };
};

interface QuickNavigationOffset {
    x: number;
    y: number;
}

export interface QuickNavigationProps {
    className?: string;
    children: React.ReactNode;
    inline?: boolean;
    offset?: QuickNavigationOffset;
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
    let result = className ?? '';
    if (enabled) {
        // ToDo -remove???
        result += ' quick-navigation';
    }
    if (enabled && inline) {
        result += ' quick-navigation--inline';
    }
    return result;
}

/**
 * Method toggles visibility of external quick navigation helpers UI.
 *
 * @param enabled Is quick navigation enabled/activated.
 * @param offset Offset values for helper position.
 */
function toggleExternalVisibility(enabled: boolean, offset = EXTERNAL_HELPER_OFFSET): void {
    const doc = getDocument();
    if (!doc) {
        return;
    }
    const holder = doc.body;
    // Cleanup container
    const existingContainer = doc.querySelector(`.${QUICK_NAVIGATION_EXTERNAL_CLASS}`);
    if (existingContainer) {
        holder.removeChild(existingContainer);
    }
    // Show helpers if quick navigation is active
    if (enabled) {
        const container = doc.createElement('div');
        container.classList.add(QUICK_NAVIGATION_EXTERNAL_CLASS);
        const navigationContainers = doc.querySelectorAll(`[${QUICK_NAVIGATION_ATTRIBUTE}]`);
        for (let i = 0; i < navigationContainers.length; i++) {
            const source = navigationContainers[i];
            const rect = source.getBoundingClientRect();
            const helper = doc.createElement('div');
            helper.innerText = source.getAttribute(QUICK_NAVIGATION_ATTRIBUTE) ?? '';
            helper.style.top = `${rect.top - offset.y}px`;
            helper.style.left = `${rect.left - offset.x}px`;
            container.appendChild(helper);
        }
        holder.appendChild(container);
    }
}

export const UIQuickNavigation: React.FC<QuickNavigationProps> = (props: QuickNavigationProps) => {
    const { className, children, inline, offset } = props;
    const [enabled, setEnabled] = useState(false);

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
                    event.stopImmediatePropagation();
                    event.stopPropagation();
                    event.preventDefault();
                    // Disable/deactivate UI with quick navigation
                    setEnabled(false);
                }
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
            document.body.removeEventListener('keydown', onKeyDown);
            document.body.removeEventListener('keyup', onRelease);
            window.removeEventListener('blur', onRelease);
        };
    }, [onKeyDown, onRelease]);

    return <div className={getClassName(className, enabled, inline)}>{children}</div>;
};

UIQuickNavigation.defaultProps = {
    inline: true,
    offset: EXTERNAL_HELPER_OFFSET
};
