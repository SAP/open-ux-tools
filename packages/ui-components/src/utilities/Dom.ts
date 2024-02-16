/**
 * Method checks if passed Element is HTML Element.
 *
 * @param element Element.
 * @returns True if passed Element is HTML Element.
 */
export function isHTMLElement(element: Element | ParentNode): element is HTMLElement {
    return 'title' in element;
}

/**
 * Method checks if passed Element is HTML Input Element.
 *
 * @param element Element.
 * @returns True if passed Element is HTML Input Element.
 */
export function isHTMLInputElement(element: Element | EventTarget): element is HTMLInputElement {
    return 'value' in element && 'tagName' in element && element.tagName === 'INPUT';
}
