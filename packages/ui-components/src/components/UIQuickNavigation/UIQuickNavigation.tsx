import React, { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { getUIFirstFocusable, setUIFocusVisibility } from '../../utilities';

import './UIQuickNavigation.scss';
import { isQuickNavigationEnabled, resolveKeyCode } from './keyBindingsResolver';
import { getDocument } from '@fluentui/react';

export const QUICK_NAVIGATION_ATTRIBUTE = 'data-quick-navigation-key';
export const QUICK_NAVIGATION_EXTERNAL_CLASS = 'quick-navigation-external';
const EXTERNAL_HELPER_OFFSET = 15;

export interface QuickNavigationAttribute {
    [QUICK_NAVIGATION_ATTRIBUTE]: string;
}

export const setQuickNavigationKey = (key: string): QuickNavigationAttribute => {
    return {
        [QUICK_NAVIGATION_ATTRIBUTE]: key.toUpperCase()
    };
};

export interface QuickNavigationProps {
    className?: string;
    children: React.ReactNode;
    inline?: boolean;
    offset?: number;
}

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
            helper.style.top = `${rect.top - offset}px`;
            helper.style.left = `${rect.left - offset}px`;
            container.appendChild(helper);
        }
        holder.appendChild(container);
    }
}

export function UIQuickNavigation(props: QuickNavigationProps): ReactElement {
    const { className, children, inline, offset } = props;
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (inline) {
            return;
        }
        toggleExternalVisibility(enabled);
    }, [enabled]);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            let activated = enabled;
            if (!enabled && isQuickNavigationEnabled(event)) {
                setEnabled(true);
                activated = true;
            }
            const resolvedKey = resolveKeyCode(event.code);
            if (activated) {
                const element: HTMLElement | null = document.querySelector(
                    `[${QUICK_NAVIGATION_ATTRIBUTE}="${resolvedKey}"]`
                );
                const currentElement: HTMLElement | null = element ? (element.firstChild as HTMLElement) : null;
                if (element && currentElement) {
                    const firstFocusableElement = getUIFirstFocusable(element, currentElement, true);
                    if (firstFocusableElement) {
                        element.classList.add('test');
                        setUIFocusVisibility(true, firstFocusableElement);
                        firstFocusableElement?.focus();
                        event.stopImmediatePropagation();
                        event.stopPropagation();
                        event.preventDefault();
                        setEnabled(false);
                    }
                }
            }
        },
        [enabled]
    );

    const onKeyUp = useCallback(
        (event: KeyboardEvent) => {
            if (enabled && !isQuickNavigationEnabled(event)) {
                setEnabled(false);
            }
        },
        [enabled]
    );

    useEffect(() => {
        document.body.addEventListener('keydown', onKeyDown);
        document.body.addEventListener('keyup', onKeyUp);
        return () => {
            document.body.removeEventListener('keydown', onKeyDown);
            document.body.removeEventListener('keyup', onKeyUp);
        };
    }, [onKeyDown, onKeyUp]);

    return <div className={getClassName(className, enabled, inline)}>{children}</div>;
}

UIQuickNavigation.defaultProps = {
    inline: true,
    offset: 15
};
