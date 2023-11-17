import {
    getFirstFocusable,
    getLastFocusable,
    setFocusVisibility,
    getNextElement,
    getPreviousElement,
    getDocument
} from '@fluentui/react';

export { getFirstFocusable as getUIFirstFocusable };
export { getLastFocusable as getUILastFocusable };
export { setFocusVisibility as setUIFocusVisibility };
export { getNextElement };
export { getPreviousElement };

/**
 * Method redirects focus to next or previous element based on source element in stack/sequence in DOM.
 *
 * @param source Source/current element.
 * @param next `true` if should focus next or `false` if should focus previous.
 * @returns True if element found and focused.
 */
export function redirectFocusToSibling(source: HTMLElement, next: boolean): boolean {
    const document = getDocument();
    if (document) {
        let element: HTMLElement | null = null;
        if (next) {
            element = getNextElement(document.body, source, false, false, true, true);
        } else {
            element = getPreviousElement(document.body, source, false, false, true, true);
        }
        if (element) {
            element.focus();
            return true;
        }
    }
    return false;
}
