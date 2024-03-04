import type { XMLElement, XMLAttribute } from '@xml-tools/ast';

/**
 * Get attribute by its name.
 *
 * @param attributeName Name of the attribute
 * @param element Element containing attributes
 * @returns Attribute node if attribute with given name exists
 */
export function getElementAttributeByName(attributeName: string, element: XMLElement): XMLAttribute | undefined {
    return element.attributes.find((attribute: XMLAttribute) => attribute.key === attributeName);
}

/**
 * Get attribute value by its name.
 *
 * @param attributeName Name of the attribute
 * @param element Element containing attributes
 * @returns Value of the attribute
 */
export function getAttributeValue(attributeName: string, element: XMLElement): string {
    const attribute = getElementAttributeByName(attributeName, element);
    return attribute?.value ?? '';
}
