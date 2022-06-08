import type { XMLElement, XMLAttribute } from '@xml-tools/ast';

/**
 * Get attribute by its name.
 *
 * @param element Element containing attributes
 * @param attributeName Name of the attribute
 * @returns Attribute node if attribute with given name exists
 */
export function getElementAttributeByName(element: XMLElement, attributeName: string): XMLAttribute | undefined {
    return element.attributes.find((attribute) => attribute.key === attributeName);
}

/**
 * Get attribute value by its name.
 *
 * @param element Element containing attributes
 * @param attributeName Name of the attribute
 * @returns Value of the attribute
 */
export function getAttributeValue(element: XMLElement, attributeName: string): string {
    const attribute = getElementAttributeByName(element, attributeName);
    return attribute?.value ?? '';
}
