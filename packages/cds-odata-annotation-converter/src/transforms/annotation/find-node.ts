import type {
    Annotation,
    AnnotationNode,
    Assignment,
    EmptyValue,
    NarrowAnnotationNode,
    NumberLiteral,
    Path,
    RecordProperty,
    StringLiteral
} from '@sap-ux/cds-annotation-parser';
import {
    getAstNodes,
    ANNOTATION_TYPE,
    COLLECTION_TYPE,
    NUMBER_LITERAL_TYPE,
    RECORD_PROPERTY_TYPE,
    RECORD_TYPE,
    ReservedProperties,
    EMPTY_VALUE_TYPE,
    ENUM_TYPE,
    nodeRange,
    PATH_TYPE,
    STRING_LITERAL_TYPE,
    findAnnotationNode
} from '@sap-ux/cds-annotation-parser';

import type { Attribute, Element, Position, Range, TextNode } from '@sap-ux/odata-annotation-core';
import {
    isBefore,
    ATTRIBUTE_TYPE,
    Edm,
    ELEMENT_TYPE,
    positionContained,
    TEXT_TYPE
} from '@sap-ux/odata-annotation-core';

export interface MatchedNode {
    pointer: string;
    range?: Range;
}

/**
 * Visitor which traverses the tree and builds a path to the node,
 * which has the most specific range matching to the given position.
 *
 */
class PositionVisitor {
    /**
     * Visits a TermNode or an array of TermNodes and returns a VisitorReturnValue.
     *
     * @param node - The TermNode or array of TermNodes to visit.
     * @param options - The options for the position visitor.
     * @param segments - The segments representing the path to the current node.
     * @returns Returns the VisitorReturnValue or undefined if no match is found.
     */
    visit(
        node: TermNode | TermNode[],
        options: PositionVisitorOptions,
        segments: string[]
    ): VisitorReturnValue | undefined {
        if (Array.isArray(node)) {
            for (let index = 0; index < node.length; index++) {
                const child = node[index];
                const children = this.visit(child, options, [index.toString()]);
                if (children) {
                    return {
                        path: [...segments, ...children.path],
                        range: children.range
                    };
                }
            }
            return undefined;
        }

        switch (node.type) {
            case TEXT_TYPE:
                return this.visitText(node, options, segments);
            case ELEMENT_TYPE:
                return this.visitElement(node, options, segments);
            case ATTRIBUTE_TYPE:
                return this.visitAttribute(node, options, segments);
            default:
                return undefined;
        }
    }

    /**
     * Visits a TextNode and returns information based on the specified options and segments.
     *
     * @param  node - The TextNode to be visited.
     * @param options - The options containing position information.
     * @param segments - The array of segments representing the current path.
     * @returns Returns information about the visited TextNode or undefined.
     * @private
     */
    private visitText(
        node: TextNode,
        options: PositionVisitorOptions,
        segments: string[]
    ): VisitorReturnValue | undefined {
        const { position } = options;
        const nodeRange = node.range ?? undefined;
        if (positionContained(nodeRange, position)) {
            return {
                path: [...segments, 'text'],
                range: nodeRange
            };
        }
        return undefined;
    }

    /**
     * Visits an Attribute and returns information based on the specified options and segments.
     *
     * @param attribute - The Attribute to be visited.
     * @param options - The options containing position information.
     * @param segments - The array of segments representing the current path.
     * @returns Returns information about the visited Attribute or undefined.
     * @private
     */
    private visitAttribute(
        attribute: Attribute,
        options: PositionVisitorOptions,
        segments: string[]
    ): VisitorReturnValue | undefined {
        const { position } = options;
        const nameRange = attribute.nameRange ?? undefined;
        if (positionContained(nameRange, position)) {
            return {
                path: [...segments, 'name'],
                range: nameRange
            };
        }
        const valueRange = attribute.valueRange ?? undefined;
        if (positionContained(valueRange, position)) {
            return {
                path: [...segments, 'value'],
                range: valueRange
            };
        }
        return undefined;
    }

    /**
     * Visits an Element and returns information based on the specified options and segments.
     *
     * @param element - The Element to be visited.
     * @param options - The options containing position information.
     * @param segments - The array of segments representing the current path.
     * @returns Returns information about the visited Element or undefined.
     * @private
     */
    private visitElement(
        element: Element,
        options: PositionVisitorOptions,
        segments: string[]
    ): VisitorReturnValue | undefined {
        const { position } = options;
        const range = element.range;
        if (range && positionContained(range, position)) {
            const attributeNames = Object.keys(element.attributes);
            if (positionContained(element.nameRange, position)) {
                return {
                    path: [...segments, 'name'],
                    range: element.nameRange
                };
            }
            for (const attributeName of attributeNames) {
                const attribute = element.attributes[attributeName];
                const children = this.visit(attribute, options, ['attributes', attributeName]);
                if (children) {
                    return {
                        path: [...segments, ...children.path],
                        range: children.range
                    };
                }
            }

            if (positionContained(element.contentRange, position)) {
                return this.visitContent(element, options, segments);
            }
        }
        return undefined;
    }

    /**
     * Visits the content of an Element and returns information based on the specified options and segments.
     *
     * @param element - The Element whose content is being visited.
     * @param options - The options containing position information.
     * @param segments - The array of segments representing the current path.
     * @returns Returns information about the visited content or undefined.
     * @private
     */
    private visitContent(
        element: Element,
        options: PositionVisitorOptions,
        segments: string[]
    ): VisitorReturnValue | undefined {
        const { position } = options;
        for (let index = 0; index < element.content.length; index++) {
            const child = element.content[index];
            const children = this.visit(child, options, ['content', index.toString()]);
            if (children) {
                return {
                    path: [...segments, ...children.path],
                    range: children.range
                };
            }
        }

        // position is not in any child node, find relative position to a child node
        const index = element.content.findIndex((item) => item.range && isBefore(position, item.range.start, true));

        return {
            path: [...segments, `$${index === -1 ? element.content.length : index}`],
            range: element.contentRange
        };
    }
}

const visitor = new PositionVisitor();

/**
 * Builds a pointer to a node in annotations,
 * which has the most specific range matching to the given position.
 *
 * @param assignment CDS annotation AST assignment node.
 * @param annotations Annotation elements.
 * @param position Position used to match nodes.
 * @returns matching node or undefined.
 */
export function findNode(assignment: Assignment, annotations: Element[], position: Position): MatchedNode | undefined {
    const result = visitor.visit(annotations, { position }, ['']);
    if (result) {
        const path = findAnnotationNode(assignment, { position, includeDelimiterCharacters: false });
        const adjustedResult = adjustReturnValue(path, assignment, annotations, result, position);
        return {
            pointer: adjustedResult.path.join('/'),
            range: adjustedResult.range
        };
    }
    return undefined;
}

/**
 * Retrieves the specified nodes from the array of TermNodes based on the provided path.
 *
 * @param terms - The array of TermNodes to retrieve nodes from.
 * @param path - The path specifying the sequence of indices or property names.
 * @returns Returns the retrieved nodes based on the provided path.
 */
function getTermNodes(terms: TermNode[], path: string[]): TermNode[] {
    // ignore the first empty segment
    const [, indexString, ...segments] = path;
    const index: number = parseInt(indexString, 10); // or use Number(indexString);
    let node: TermNode = terms[index];
    const nodes: TermNode[] = [];
    for (const segment of segments) {
        if (typeof node === 'object' && node !== null) {
            node = (node as any)[segment]; // Use any to handle indexing with a string
        }
        nodes.push(node);
    }
    return nodes;
}

type TermNode = Element | Attribute | TextNode;

export interface PositionVisitorOptions {
    position: Position;
}

type VisitorReturnValue = {
    path: string[];
    range?: Range;
};
type ChildNode = AnnotationNode | AnnotationNode[];

/**
 * Adjusts the VisitorReturnValue based on the provided AST path, assignment, terms, value, and position.
 *
 * @param astPath - The AST path specifying the sequence of indices or property names.
 * @param assignment - The Assignment associated with the value.
 * @param terms - The array of Element terms.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @param position - The position information.
 * @returns Returns the adjusted VisitorReturnValue.
 */
function adjustReturnValue(
    astPath: string,
    assignment: Assignment,
    terms: Element[],
    value: VisitorReturnValue,
    position: Position
): VisitorReturnValue {
    const astNodes = getAstNodes(assignment, astPath);
    const node = astNodes?.[astNodes.length - 1];
    if (!node) {
        return value;
    }
    const nodes = getTermNodes(
        terms,
        value.path.filter((segment) => !segment.startsWith('$'))
    );

    value = edmJsonContent(astNodes, value, position);
    value = enumCollection(astNodes, nodes, value, position);
    if (Array.isArray(node)) {
        return value;
    }
    switch (node.type) {
        case RECORD_PROPERTY_TYPE:
        case ANNOTATION_TYPE:
            return beforeValue(node, value, position);
        case NUMBER_LITERAL_TYPE:
        case STRING_LITERAL_TYPE:
            return stringValue(node, value, position);
        case ENUM_TYPE:
            return enumTextNode(value);
        case EMPTY_VALUE_TYPE:
            return emptyValue(node, value);

        case PATH_TYPE:
            return pathTextNode(node, value, position);
        default:
            return value;
    }
}

/**
 * Adjusts the VisitorReturnValue before processing the value based on the provided node, value, and position.
 *
 * @param node - The Annotation or RecordProperty node associated with the value.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @param position - The position information.
 * @returns Returns the adjusted VisitorReturnValue.
 */
function beforeValue(
    node: Annotation | RecordProperty,
    value: VisitorReturnValue,
    position: Position
): VisitorReturnValue {
    const lastPathSegment = value.path.slice(-1)[0];
    if (node.type === RECORD_PROPERTY_TYPE && node.name.value === ReservedProperties.Value) {
        // for $value pointer should not be adjusted
        return value;
    }
    if (
        lastPathSegment?.startsWith('$') &&
        node.colon?.range?.end &&
        !isBefore(position, node.colon.range.end) &&
        node.value?.range?.start &&
        isBefore(position, node.value.range.start, true)
    ) {
        // $ segment shouldn't be included if the position is between colon and value
        return {
            path: value.path.slice(0, -1)
        };
    }
    return value;
}

/**
 * Adjusts the VisitorReturnValue for StringLiteral or NumberLiteral nodes based on the provided node, value, and position.
 *
 * @param node - The StringLiteral or NumberLiteral node associated with the value.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @param position - The position information.
 * @returns Returns the adjusted VisitorReturnValue.
 */
function stringValue(
    node: StringLiteral | NumberLiteral,
    value: VisitorReturnValue,
    position: Position
): VisitorReturnValue {
    const range = nodeRange(node, false);

    const lastPathSegment = value.path.slice(-1)[0];
    if (lastPathSegment !== 'text') {
        // we need to only update position for text nodes
        return value;
    }
    if (!range) {
        return value;
    }
    const offset = position.character - range.start.character;

    return {
        path: [...value.path, `$${offset}`],
        range: value.range
    };
}

/**
 * Adjusts the VisitorReturnValue for EmptyValue nodes based on the provided node and value.
 *
 * @param node - The EmptyValue node associated with the value.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @returns Returns the adjusted VisitorReturnValue.
 */
function emptyValue(node: EmptyValue, value: VisitorReturnValue): VisitorReturnValue {
    if (node.range) {
        return {
            path: value.path,
            range: node.range
        };
    }
    return value;
}

/**
 * Adjusts the VisitorReturnValue for enum collection based on the provided AST nodes, term nodes, value, and position.
 *
 * @param astNodes - The array of AST nodes associated with the annotation.
 * @param nodes - The array of term nodes associated with the annotation.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @param position - The position information for adjusting the value.
 * @returns Returns the adjusted VisitorReturnValue.
 */
function enumCollection(
    astNodes: ChildNode[],
    nodes: TermNode[],
    value: VisitorReturnValue,
    position: Position
): VisitorReturnValue {
    // The end of nodes array should look like this - [..., element, content, textNode, text ]
    const [parent, , textNode] = nodes.slice(-4);

    if (parent?.type !== ELEMENT_TYPE || parent.name !== Edm.EnumMember) {
        return value;
    }
    const collection = findLastNode(astNodes, COLLECTION_TYPE);
    if (!collection) {
        return value;
    }
    const enumNode = collection.items.find((child) => positionContained(child.range, position));
    if (textNode?.type !== TEXT_TYPE || enumNode?.type !== ENUM_TYPE || enumNode.range === undefined) {
        return value;
    }
    const startOffset = textNode.text.indexOf(enumNode.path.value);

    // Make sure the in segment position is not negative if position is right before #
    const charactersInSegment = Math.max(enumNode.range.start.character - position.character, 0);
    const index = startOffset + charactersInSegment;

    if (enumNode.path.range !== undefined) {
        return {
            path: [...value.path, `$${index}`],
            range: enumNode.path.range
        };
    }

    return value;
}

/**
 * Finds the last node of a specific type in an array of annotation nodes.
 *
 * @template T - The type of the node to find.
 * @param nodes - The array of annotation nodes to search.
 * @param type - The type of the node to find.
 * @returns Returns the last node of the specified type, or undefined if not found.
 */
function findLastNode<T extends AnnotationNode['type']>(
    nodes: ChildNode[],
    type: T
): NarrowAnnotationNode<typeof type> | undefined {
    for (let index = nodes.length - 1; index >= 0; index--) {
        const element = nodes[index];

        if (!Array.isArray(element) && element.type === type) {
            // Type cast needed due to Typescript limitation https://github.com/microsoft/TypeScript/issues/50103
            return element as NarrowAnnotationNode<typeof type>;
        }
    }
    return undefined;
}

/**
 * Adjusts the VisitorReturnValue for EDM JSON content based on the provided AST nodes, value, and position.
 *
 * @param astNodes - The array of AST nodes associated with the annotation.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @param position - The position information for adjusting the value.
 * @returns  Returns the adjusted VisitorReturnValue for EDM JSON content.
 */
function edmJsonContent(astNodes: ChildNode[], value: VisitorReturnValue, position: Position): VisitorReturnValue {
    const edmJsonIndex = astNodes.findIndex(
        (node) =>
            !Array.isArray(node) && node.type === RECORD_PROPERTY_TYPE && node.name.value === ReservedProperties.EdmJson
    );
    if (edmJsonIndex === -1) {
        return value;
    }

    if (value.path[value.path.length - 1].startsWith('$')) {
        // content pointer
        const node = astNodes[astNodes.length - 1];
        if (Array.isArray(node)) {
            return value;
        }
        const range = nodeRange(node, false);

        if (node.type !== RECORD_TYPE || !range) {
            return value;
        }

        const property = node.properties[0];
        if (property === undefined) {
            return value;
        }

        // element name is already declared, so we can either only add annotations or attributes
        if (property.range?.start && isBefore(position, property.range?.start)) {
            // content/0 segments always get generated for positions elements in content range,
            //  but in this case we need to remove it
            return {
                path: [...value.path.slice(0, -3), `$0`],
                range
            };
        } else {
            return {
                path: [...value.path.slice(0, -1), 'attributes'],
                range
            };
        }
    }

    return value;
}

/**
 * Adjusts the VisitorReturnValue for an enum text node based on the provided value.
 *
 * @param value - The original VisitorReturnValue to be adjusted.
 * @returns Returns the adjusted VisitorReturnValue for an enum text node.
 */
function enumTextNode(value: VisitorReturnValue): VisitorReturnValue {
    if (value.path[value.path.length - 1].startsWith('$')) {
        return value;
    }
    const path = value.path.slice(0, -1);
    return {
        path,
        range: value.range
    };
}

/**
 * Adjusts the VisitorReturnValue for a path text node based on the provided value.
 *
 * @param node - The Path node being processed.
 * @param value - The original VisitorReturnValue to be adjusted.
 * @param position - The position within the document.
 * @returns Returns the adjusted VisitorReturnValue for a path text node.
 */
function pathTextNode(node: Path, value: VisitorReturnValue, position: Position): VisitorReturnValue {
    const lastPathSegment = value.path.slice(-1)[0];
    if (lastPathSegment !== 'text') {
        // we need to only update position for text nodes
        return value;
    }
    if (node.value === '') {
        return {
            path: [...value.path, '$0'],
            range: value.range
        };
    }
    for (let i = 0; i < node.segments.length; i++) {
        const segment = node.segments[i];
        if (segment.range && positionContained(segment.range, position)) {
            const prefix = node.segments
                .filter((_, j) => j < i)
                .map((s) => s.value)
                .join('/');
            const delimiterOffset = i === 0 ? 0 : 1; // If it is not the first item we need to add last delimiter
            const localOffset = position.character - segment.range.start.character;

            return {
                path: [...value.path, `$${prefix.length + delimiterOffset + localOffset}`],
                range: segment.range
            };
        }
    }
    return value;
}
