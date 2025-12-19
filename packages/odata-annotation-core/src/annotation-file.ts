import type {
    Element,
    Attribute,
    ElementName,
    AttributeName,
    TextNode,
    AnyNode
} from '@sap-ux/odata-annotation-core-types';
import { ELEMENT_TYPE, Edm, TEXT_TYPE } from '@sap-ux/odata-annotation-core-types';

export const elements = (predicate: (child: Element) => boolean | undefined, element: Element): Element[] =>
    (element.content || []).filter(
        (content) => content.type === ELEMENT_TYPE && (!predicate || predicate(content))
    ) as Element[];

export const elementsWithName = (name: ElementName, element: Element): Element[] =>
    elements((content: Element) => content.name === name, element);

export const getElementAttribute = (element: Element, name: AttributeName): Attribute | undefined =>
    element?.attributes?.[name];

export const getElementAttributeValue = (element: Element, name: AttributeName): string => {
    const attributeNode = getElementAttribute(element, name);
    return attributeNode?.value ?? '';
};

/**
 * Determines whether the node is of element type with given name.
 *
 * @param node node to check
 * @param name name to check
 * @returns boolean check result
 */
export function isElementWithName(node: AnyNode | undefined, name: string): node is Element {
    return node?.type === ELEMENT_TYPE && node.name === name;
}

/**
 * Returns true if text doesn't contain any visible charactes (tabs, spaces, line breaks are ignored).
 *
 * @param text
 * @returns boolean check result
 */
function isEmptyText(text: string): boolean {
    return (text || '').replace(/\s/g, '').length === 0;
}

/**
 * Get text node content of an element.
 * Elements content is supposed to only contain 'Annotation' tags or single text node.
 *
 * @param element
 * @returns TextNode
 */
export function getSingleTextNode(element: Element): TextNode | null {
    let isInvalid = false;
    let firstTextNode: TextNode | null = null;
    (element.content || []).forEach((node) => {
        if (!isInvalid) {
            if (node.type === ELEMENT_TYPE && node.name !== Edm.Annotation) {
                isInvalid = true; // child element which is not 'Annotation'
            } else if (node.type === TEXT_TYPE && !isEmptyText(node.text)) {
                if (firstTextNode) {
                    isInvalid = true; // second text node
                } else {
                    firstTextNode = node;
                }
            }
        }
    });
    return isInvalid ? null : firstTextNode;
}
