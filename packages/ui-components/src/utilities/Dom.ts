/**
 * Method checks if passed Element is HTML Element.
 *
 * @param element Element.
 * @returns True if passed Element is HTML Element.
 */
export function isHTMLElement(element: Element | ParentNode): element is HTMLElement {
    return 'title' in element;
}
