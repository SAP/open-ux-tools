import {
    getFirstFocusable,
    getLastFocusable,
    setFocusVisibility,
    getNextElement,
    getPreviousElement,
    getDocument,
    isElementTabbable
} from '@fluentui/react';

export { getFirstFocusable as getUIFirstFocusable };
export { getLastFocusable as getUILastFocusable };
export { setFocusVisibility as setUIFocusVisibility };
export { getNextElement };
export { getPreviousElement };
export { isElementTabbable };

/**
 * Method redirects focus to next or previous element based on source element in stack/sequence in DOM.
 *
 * @param source Source/current element.
 * @param next `true` if should focus next or `false` if should focus previous.
 * @returns Redirected element.
 */
export function focusToSibling(source: HTMLElement, next: boolean): HTMLElement | null {
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
            return element;
        }
    }
    return null;
}
