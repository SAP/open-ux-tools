import React, { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { getUIFirstFocusable, setUIFocusVisibility } from '../../utilities';

import './UIQuickNavigation.scss';
import { isQuickNavigationEnabled, resolveKeyCode } from './keyBindingsResolver';

export const QUICK_NAVIGATION_ATTRIBUTE = 'data-quick-navigation-key';

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
}

const getClassName = (className?: string, enabled?: boolean): string => {
    let result = className || '';
    if (enabled) {
        result += ' quick-navigation';
    }
    return result;
};

export function UIQuickNavigation(props: QuickNavigationProps): ReactElement {
    const { className, children } = props;
    const [enabled, setEnabled] = useState(false);

    const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
            let activated = enabled;
            if (!enabled && isQuickNavigationEnabled(event)) {
                setEnabled(true);
                activated = true;
            }
            const resolvedKey = resolveKeyCode(event.code);

            if (resolvedKey === 'ALTLEFT') {
                // ToDo
                console.log('Alt!!! Down');
                event.stopImmediatePropagation();
                event.stopPropagation();
                event.preventDefault();
            }
            if (activated) {
                const element: HTMLElement | null = document.querySelector(
                    `[${QUICK_NAVIGATION_ATTRIBUTE}="${resolvedKey}"]`
                );
                //console.log(element);
                const currentElement: HTMLElement | null = element ? (element.firstChild as HTMLElement) : null;
                if (element && currentElement) {
                    const firstFocusableElement = getUIFirstFocusable(element, currentElement, true);
                    console.log(firstFocusableElement);
                    if (firstFocusableElement) {
                        element.classList.add('test')
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
            console.log('onKeyUp ' + event.key);
            //console.log('onKeyUp');
            if (enabled && !isQuickNavigationEnabled(event)) {
                setEnabled(false);
            }
        },
        [enabled]
    );

    useEffect(() => {
        //console.log('useEffect');
        document.body.addEventListener('keydown', onKeyDown);
        document.body.addEventListener('keyup', onKeyUp);
        return () => {
            //console.log('destroy');
            document.body.removeEventListener('keydown', onKeyDown);
            document.body.removeEventListener('keyup', onKeyUp);
        };
    }, [onKeyDown, onKeyUp]);

    return <div className={getClassName(className, enabled)}>{children}</div>;
}
