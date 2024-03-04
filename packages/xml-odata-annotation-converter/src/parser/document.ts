import type { XMLDocument, XMLElement, XMLTextContent, XMLAttribute } from '@xml-tools/ast';

import type {
    ElementChild,
    Diagnostic,
    Element,
    TextNode,
    AnnotationFile,
    Target,
    Attributes,
    Reference,
    Namespace,
    Range
} from '@sap-ux/odata-annotation-core';
import {
    Position,
    createTextNode,
    createElementNode,
    createAttributeNode,
    Edm,
    ELEMENT_TYPE
} from '@sap-ux/odata-annotation-core';

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
    if (ast.rootElement) {
        const dataServices = getElementsWithName('DataServices', ast.rootElement);
        const schemas = dataServices.length ? getElementsWithName('Schema', dataServices[0]) : [];
        const targets = schemas.reduce<Target[]>((acc, schema) => [...acc, ...convertSchema(schema)], []);
        const range = transformElementRange(ast.rootElement.position, ast.rootElement);
        const contentRange = getGapRangeBetween(ast.rootElement.syntax.openBody, ast.rootElement.syntax.closeName);
        const references = convertReferences(ast.rootElement);

        if (range) {
            const namespace = createNamespace(schemas[0]);
            const file: AnnotationFile = {
                type: 'annotation-file',
                uri,
                range,
                references,
                targets
            };
            if (contentRange) {
                file.contentRange = contentRange;
            }
            if (namespace) {
                file.namespace = namespace;
            }
            return file;
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
 * Creates namespace object.
 *
 * @param schema schema XML element
 * @returns Namespace object
 */
function createNamespace(schema: XMLElement | undefined): Namespace | undefined {
    if (!schema) {
        return;
    }
    const namespace = getElementAttributeByName('Namespace', schema);
    const alias = getElementAttributeByName('Alias', schema);
    if (!namespace?.value) {
        return;
    }
    const currentNamespace: Namespace = {
        type: 'namespace',
        name: namespace.value,
        range: transformElementRange(schema.position, schema),
        nameRange: transformRange(namespace.syntax.value)
    };
    const contentRange =
        schema.syntax.openBody && schema.syntax.closeName
            ? getGapRangeBetween(schema.syntax.openBody, schema.syntax.closeName)
            : undefined;

    if (contentRange) {
        currentNamespace.contentRange = contentRange;
    }

    if (currentNamespace.nameRange) {
        adjustRange(currentNamespace.nameRange, 1, -1);
    }

    if (alias) {
        currentNamespace.alias = alias.value ?? '';
        currentNamespace.aliasRange = transformRange(alias.syntax.value);
        if (currentNamespace.aliasRange) {
            adjustRange(currentNamespace.aliasRange, 1, -1);
        }
    }
    return currentNamespace;
}

/**
 * Creates reference object from XML element.
 *
 * @param element EDMX XML Element
 * @returns references contained in the XML element
 */
function convertReferences(element: XMLElement): Reference[] {
    const referenceElements = getElementsWithName('Reference', element);
    const references: Reference[] = [];

    for (const referenceElement of referenceElements) {
        const uri = getElementAttributeByName('Uri', referenceElement)?.value ?? undefined;
        const refRange = transformRange(referenceElement.position);
        for (const namespaceElement of getElementsWithName('Include', referenceElement)) {
            const reference = createReference(namespaceElement, refRange, uri);
            if (reference) {
                references.push(reference);
            }
        }
    }
    return references;
}

/**
 * Creates referece.
 *
 * @param namespaceElement namespace XML element
 * @param range reference element range
 * @param uri reference uri
 * @returns reference object or undefined if namespace is not provided in the corresponding attribute
 */
function createReference(
    namespaceElement: XMLElement,
    range: Range | undefined,
    uri: string | undefined
): Reference | undefined {
    const namespace = getElementAttributeByName('Namespace', namespaceElement);
    const alias = getElementAttributeByName('Alias', namespaceElement);
    if (!namespace?.value) {
        return;
    }
    const reference: Reference = {
        type: 'reference',
        name: namespace.value,
        nameRange: transformRange(namespace.syntax.value),
        range,
        uri
    };
    if (reference.nameRange) {
        adjustRange(reference.nameRange, 1, -1);
    }
    if (alias) {
        reference.alias = alias.value ?? '';
        reference.aliasRange = transformRange(alias.syntax.value);
        if (reference.aliasRange) {
            adjustRange(reference.aliasRange, 1, -1);
        }
    }
    return reference;
}

/**
 * Converts schema.
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
            const targetName = targetAttribute.value ?? '';

            const targetNamePosition = transformRange(targetAttribute.syntax.value);
            if (targetNamePosition) {
                adjustRange(targetNamePosition, 1, -1);
                const terms = getElementsWithName(Edm.Annotation, annotations)
                    .map(convertElement)
                    .filter((node): node is Element => node?.type === ELEMENT_TYPE);

                const termsRange = annotations.syntax.closeName
                    ? getGapRangeBetween(annotations.syntax.openBody, annotations.syntax.closeName)
                    : undefined;
                const range = transformElementRange(annotations.position, annotations);

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

    return targets;
}

/**
 * Returns namespace details.
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
 * Converts element.
 *
 * @param element XMLElement
 * @returns generic annotation file Element
 */
function convertElement(element: XMLElement): Element {
    const range = transformElementRange(element.position, element);
    const nameRange = getElementNameRange(element);
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
    const children = mergeContentNodes(sortedContentNodes);

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

    return createElementNode({
        name: element.name ?? '',
        range,
        nameRange,
        attributes,
        content: children.nodes,
        contentRange,
        namespace: namespace?.uri,
        namespaceAlias: namespace?.alias
    });
}

/**
 * Returns element name range.
 *
 * @param element XML element
 * @returns range
 */
function getElementNameRange(element: XMLElement): Range | undefined {
    if (element.syntax.openName) {
        return transformRange(element.syntax.openName);
    }
    if (element.name === null) {
        if (element.syntax.openBody) {
            // element name is missing: "< ></>"
            const range = transformRange(element.syntax.openBody);
            if (!range) {
                return undefined;
            }
            // element name starts 1 character after "<"
            range.start.character += 1;
            // element name range should cover only the single character after "<"
            range.end = Position.create(range.start.line, range.start.character);
            return range;
        } else {
            // closing bracket is missing: "<"
            const range = transformRange(element.position);
            if (!range) {
                return undefined;
            }
            // name range should start after <, so we need to increment elements start range by 1
            range.start.character++;
            return range;
        }
    }
    return undefined;
}

/**
 * Converts text node.
 *
 * @param textNode XML text node
 * @returns annotation file TextNode
 */
function convertTextNode(textNode: XMLTextContent): TextNode {
    const range = transformRange(textNode.position);
    return createTextNode(textNode.text ?? '', range);
}

/**
 * Merges content nodes.
 *
 * @param sortedContentNodes
 * @returns merged nodes data
 */
function mergeContentNodes(sortedContentNodes: (XMLTextContent | XMLElement)[]): {
    textNodes: XMLTextContent[];
    nodes: ElementChild[];
    diagnostics: Diagnostic[];
} {
    return sortedContentNodes.reduce(
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

                    acc.nodes.push(convertTextNode(concatenatedTextNode));

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
}
