import type { XMLDocument, XMLElement, XMLTextContent, XMLAttribute } from '@xml-tools/ast';

import type {
    ElementChild,
    Diagnostic,
    Element,
    TextNode,
    AnnotationFile,
    Target,
    Attributes,
    Reference
} from '@sap-ux/odata-annotation-core-types';
import {
    createTextNode,
    createElementNode,
    createAttributeNode,
    Edm,
    ELEMENT_TYPE
} from '@sap-ux/odata-annotation-core-types';

import { adjustRange, getGapRangeBetween, transformElementRange, transformRange } from './range';
import { getElementsWithName } from './element-getters';
import { getElementAttributeByName } from './attribute-getters';
import { removeEscapeSequences } from './escaping';

interface NamespaceDetails {
    alias: string;
    uri: string;
}

/**
 * Convert AST of an XML document to annotation document.
 *
 * @param uri Uri of the document.
 * @param ast XML document containing annotations.
 * @returns annotation file.
 */
export function convertDocument(uri: string, ast: XMLDocument): AnnotationFile {
    if (ast.rootElement && ast.rootElement.syntax.openBody && ast.rootElement.syntax.closeName) {
        const dataServices = getElementsWithName('DataServices', ast.rootElement);
        const schemas = dataServices.length ? getElementsWithName('Schema', dataServices[0]) : [];
        const targets = schemas.reduce<Target[]>((acc, schema) => [...acc, ...convertSchema(schema)], []);
        const range = transformElementRange(ast.rootElement.position, ast.rootElement);
        const contentRange = getGapRangeBetween(ast.rootElement.syntax.openBody, ast.rootElement.syntax.closeName);
        const references = convertReferences(ast.rootElement);
        if (range && contentRange) {
            return {
                type: 'annotation-file',
                uri,
                range,
                contentRange,
                references,
                targets
            };
        }
    }
    return {
        type: 'annotation-file',
        uri,
        range: undefined,
        contentRange: undefined,
        references: [],
        targets: []
    };
}

/**
 *
 * @param element EDMX XML Element
 * @returns references contained in the XML element
 */
function convertReferences(element: XMLElement): Reference[] {
    const referenceElements = getElementsWithName('Reference', element);
    const references: Reference[] = [];
    for (const referenceElement of referenceElements) {
        const uri = getElementAttributeByName('Uri', referenceElement)?.value ?? undefined;
        for (const namespaceElement of getElementsWithName('Include', referenceElement)) {
            const namespace = getElementAttributeByName('Namespace', namespaceElement)?.value;
            const alias = getElementAttributeByName('Alias', namespaceElement)?.value ?? undefined;
            if (namespace) {
                references.push({
                    type: 'reference',
                    name: namespace,
                    alias,
                    uri
                });
            }
        }
    }
    return references;
}

/**
 *
 * @param schema Schema XML Element
 * @returns targets contained in the XML element
 */
function convertSchema(schema: XMLElement): Target[] {
    const targets: Target[] = [];
    const annotationsElements = getElementsWithName(Edm.Annotations, schema);
    for (const annotations of annotationsElements) {
        const targetAttribute = getElementAttributeByName('Target', annotations);
        if (targetAttribute) {
            const targetName = targetAttribute.value;

            const targetNamePosition = transformRange(targetAttribute.syntax.value);
            if (targetNamePosition) {
                adjustRange(targetNamePosition, 1, -1);
                const terms = getElementsWithName(Edm.Annotation, annotations)
                    .map(convertElement)
                    .filter((node): node is Element => node?.type === ELEMENT_TYPE);

                const termsRange = getGapRangeBetween(annotations.syntax.openBody, annotations.syntax.closeName);
                const range = transformElementRange(annotations.position, annotations);
                if (targetName) {
                    const target: Target = {
                        type: 'target',
                        name: targetName,
                        nameRange: targetNamePosition,
                        terms,
                        range,
                        termsRange
                    };
                    targets.push(target);
                }
            }
        }
    }

    return targets;
}

/**
 *
 * @param element XML element
 * @returns element default namespace if it exists
 */
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

/**
 *
 * @param element XMLElement
 * @returns generic annotation file Element
 */
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

    const attributes = element.attributes.reduce<Attributes>((acc: Attributes, attribute: XMLAttribute) => {
        if (!attribute.key) {
            return acc;
        }
        const value = attribute.value ? removeEscapeSequences(attribute.value) : '';

        const attributeNode = createAttributeNode(
            attribute.key,
            value,
            transformRange(attribute.syntax.key),
            transformRange(attribute.syntax.value)
        );
        if (attributeNode.valueRange) {
            adjustRange(attributeNode.valueRange, 1, -1);
        }
        acc[attribute.key] = attributeNode;
        return acc;
    }, {});

    return createElementNode(
        element.name ?? '',
        range,
        nameRange,
        attributes,
        children.nodes,
        contentRange,
        namespace?.uri,
        namespace?.alias
    );
}

/**
 *
 * @param textNode XML text node
 * @returns annotation file TextNode
 */
function convertTextNode(textNode: XMLTextContent): TextNode {
    const range = transformRange(textNode.position);
    return createTextNode(textNode.text ?? '', range);
}
