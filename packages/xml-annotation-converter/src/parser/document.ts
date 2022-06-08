import type { XMLDocument, XMLElement, XMLTextContent } from '@xml-tools/ast';

import type { ElementChild, Diagnostic, Element, TextNode } from '@sap-ux/odata-annotation-core';
import { createTextNode, createElementNode } from '@sap-ux/odata-annotation-core';

import { getGapRangeBetween, transformElementRange, transformRange } from './range';

interface NamespaceDetails {
    alias: string;
    uri: string;
}

/**
 * Convert AST of an XML document to annotation document.
 *
 * @param ast AST of an XML document
 * @returns annotation document root Element
 */
export function convertDocument(ast: XMLDocument): Element | undefined {
    if (ast.rootElement) {
        return convertElement(ast.rootElement);
    }
}

function getNamespace(element: XMLElement): NamespaceDetails | undefined {
    if (element.ns) {
        const namespace = element.namespaces[element.ns];
        if (namespace) {
            return {
                alias: element.ns,
                uri: namespace
            };
        }
    }
    return undefined;
}

function convertElement(element: XMLElement): Element {
    const range = transformElementRange(element.position, element);
    const nameRange = element.syntax.openName ? transformRange(element.syntax.openName) : undefined;
    const contentRange =
        element.syntax.openBody && element.syntax.closeName
            ? getGapRangeBetween(element.syntax.openBody, element.syntax.closeName)
            : undefined;
    const namespace = getNamespace(element);

    const textNodes = element.textContents ?? [];
    const elementNodes = element.subElements ?? [];

    const sortedContentNodes = [...textNodes, ...elementNodes].sort(
        (a, b) => a.position.startOffset - b.position.endOffset
    );

    // merge adjacent text fragments into solid text node
    const children = sortedContentNodes.reduce(
        (acc, child, index, array) => {
            if (child.type === 'XMLTextContent') {
                if (index + 1 < array.length && array[index + 1].type === 'XMLTextContent') {
                    acc.textNodes.push(child);
                } else {
                    const [first, ...textNodes] = [...acc.textNodes, child];

                    const concatenatedTextNode = textNodes.reduce((accTextNode, textNode): XMLTextContent => {
                        return {
                            ...accTextNode,
                            text: (accTextNode.text ?? '') + (textNode.text ?? ''),
                            position: {
                                ...accTextNode.position,
                                endColumn: textNode.position.endColumn,
                                endLine: textNode.position.endLine,
                                endOffset: textNode.position.endOffset
                            }
                        };
                    }, first);

                    if (concatenatedTextNode.text?.trim() !== '') {
                        acc.nodes.push(convertTextNode(concatenatedTextNode));
                    }
                    acc.textNodes = [];
                }
            } else if (child.type === 'XMLElement') {
                acc.nodes.push(convertElement(child));
            }
            return acc;
        },
        {
            textNodes: [],
            nodes: [],
            diagnostics: []
        } as {
            textNodes: XMLTextContent[];
            nodes: ElementChild[];
            diagnostics: Diagnostic[];
        }
    );
    return createElementNode(
        element.name ?? '',
        range,
        nameRange,
        {},
        children.nodes,
        contentRange,
        namespace?.uri,
        namespace?.alias
    );
}

function convertTextNode(textNode: XMLTextContent): TextNode {
    const range = transformRange(textNode.position);
    return createTextNode(textNode.text ?? '', range);
}
