import type { Range } from '@sap-ux/odata-annotation-core-types';
import { createAttributeNode, Edm } from '@sap-ux/odata-annotation-core-types';

/**
 * Factory function that creates an attribute node with the specified attribute name, value, and value range.
 *
 * @param attributeName - The name of the attribute to be created.
 * @returns A function that creates an AttributeNode.
 */
function createAttributeFactory(attributeName: string) {
    return (value: string, valueRange: Range | undefined) =>
        createAttributeNode(attributeName, value, undefined, valueRange);
}

export const createTermAttribute = createAttributeFactory(Edm.Term);
export const createQualifierAttribute = createAttributeFactory(Edm.Qualifier);
export const createPropertyAttribute = createAttributeFactory(Edm.Property);
