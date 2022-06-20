import type { XMLElement } from '@xml-tools/ast';

/**
 * Returns a subset of elements children based on their name.
 *
 * @param name Name of the element
 * @param element Element which sub-elements will be checked
 * @returns An array with matching elements
 */
export function getElementsWithName(name: string, element: XMLElement): XMLElement[] {
    return element.subElements ? element.subElements.filter((element: XMLElement) => element.name === name) : [];
}
