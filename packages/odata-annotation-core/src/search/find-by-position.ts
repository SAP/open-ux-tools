import type {
    TextNode,
    Attribute,
    Element,
    AnnotationFile,
    AnyNode,
    Reference,
    Namespace,
    Target
} from '@sap-ux/odata-annotation-core-types';
import {
    createAttributeNode,
    createTextNode,
    TARGET_TYPE,
    NAMESPACE_TYPE,
    TEXT_TYPE,
    ELEMENT_TYPE,
    ATTRIBUTE_TYPE,
    REFERENCE_TYPE,
    ANNOTATION_FILE_TYPE,
    Range,
    Position
} from '@sap-ux/odata-annotation-core-types';

import { positionContained, isBefore } from '@sap-ux/text-document-utils';

type Segment = string | number;

export interface VisitorReturnValue {
    path: Segment[];
    range?: Range;
    startString?: string;
    remainingString?: string;
}

type Visitor<T extends { type: string }> = {
    [K in T['type']]: NodeHandler<T, K>;
};

type NodeHandler<T extends { type: string }, K> = (
    node: Extract<T, { type: K }>,
    position: Position,
    segments: Segment[]
) => VisitorReturnValue | undefined;

/**
 * Visitor which traverses the tree and builds a path to the node,
 * which has the most specific range matching to the given position.
 *
 */
class PositionVisitor implements Visitor<AnyNode> {
    forCompletion = false;
    /**
     *
     * @param node
     * @param position
     * @param segments
     * @returns visitor result or undefined
     */
    visit(node: AnyNode, position: Position, segments: Segment[]): VisitorReturnValue | undefined {
        const handler = this[node.type] as unknown as NodeHandler<AnyNode, typeof node.type>;
        if (node.range && !positionContained(node.range, position)) {
            return undefined;
        }
        if (handler) {
            return handler(node, position, segments);
        } else {
            return undefined;
        }
    }

    [ANNOTATION_FILE_TYPE] = (
        node: AnnotationFile,
        position: Position,
        segments: Segment[]
    ): VisitorReturnValue | undefined => {
        return (
            this.visitChildren('references', node.references, node.range, position, segments) ??
            this.visitChildren('targets', node.targets, node.range, position, segments) ??
            this.visitChild(node.namespace, position, [...segments, 'namespace'])
        );
    };

    [TARGET_TYPE] = (node: Target, position: Position, segments: Segment[]): VisitorReturnValue | undefined => {
        const fallbackSegment = positionContained(node.termsRange, position) ? 'terms' : '';
        return (
            this.visitTextProperty('name', node.name, node.nameRange, position, segments) ??
            this.visitChildren('terms', node.terms, node.termsRange, position, segments) ?? {
                path: [...segments, fallbackSegment],
                range: node.termsRange
            }
        );
    };

    [NAMESPACE_TYPE] = (node: Namespace, position: Position, segments: Segment[]): VisitorReturnValue | undefined => {
        return (
            this.visitTextProperty('name', node.name, node.nameRange, position, segments) ??
            this.visitTextProperty('alias', node.alias, node.aliasRange, position, segments) ?? {
                path: [...segments, 'targets'],
                range: node.range
            }
        );
    };

    [REFERENCE_TYPE] = (node: Reference, position: Position, segments: Segment[]): VisitorReturnValue | undefined => {
        return (
            this.visitTextProperty('name', node.name, node.nameRange, position, segments) ??
            this.visitTextProperty('alias', node.alias, node.aliasRange, position, segments)
        );
    };

    [TEXT_TYPE] = (node: TextNode, position: Position, segments: Segment[]): VisitorReturnValue | undefined => {
        return this.visitTextProperty('text', node.text, node.range, position, segments);
    };

    [ATTRIBUTE_TYPE] = (
        attribute: Attribute,
        position: Position,
        segments: Segment[]
    ): VisitorReturnValue | undefined => {
        return (
            this.visitTextProperty('name', attribute.name, attribute.nameRange, position, segments) ??
            this.visitTextProperty('value', attribute.value, attribute.valueRange, position, segments)
        );
    };

    [ELEMENT_TYPE] = (element: Element, position: Position, segments: Segment[]): VisitorReturnValue | undefined => {
        if (!element.range) {
            return;
        }
        // first cursor position of annotation range belongs to both annotation and empty region between annotations
        // and in completion context considered as belonging to empty region
        const offset = this.forCompletion ? 1 : 0;
        const startCharacter = element.range.start.character + offset;
        const adjustedRange = Range.create(
            Position.create(element.range.start.line, startCharacter),
            element.range.end
        );
        if (!positionContained(adjustedRange, position)) {
            return undefined;
        }
        const attributeNames = Object.keys(element.attributes);
        if (positionContained(element.nameRange, position)) {
            return this.visitTextProperty('name', element.name, element.nameRange, position, segments);
        }
        for (const attributeName of attributeNames) {
            const attribute = element.attributes[attributeName];
            const children = this.visit(attribute, position, [...segments, 'attributes', attributeName]);
            if (children) {
                return children;
            }
        }

        if (!positionContained(element.contentRange, position)) {
            // TODO: remove mutation
            element.attributes[''] = createAttributeNode('', '');
            return {
                path: [...segments, 'attributes', '', 'name'],
                range: element.range
            };
        }

        return this.visitContent(element, position, segments);
    };
    /**
     *
     * @param element
     * @param position
     * @param segments
     * @returns visitor result or undefined
     */
    private visitContent(element: Element, position: Position, segments: Segment[]): VisitorReturnValue | undefined {
        return (
            this.visitChildren('content', element.content, element.contentRange, position, segments) ??
            this.findRelativePosition(element, position, segments)
        );
    }

    /**
     *
     * @param element
     * @param position
     * @param segments
     * @returns visitor result
     */
    private findRelativePosition(element: Element, position: Position, segments: Segment[]): VisitorReturnValue {
        // position is not in any child node, find relative position to a child node
        const index = element.content.findIndex((item) => item.range && isBefore(position, item.range.start, true));

        if (index === -1) {
            // TODO: remove mutation
            element.content.push(createTextNode('', element.contentRange));
            return {
                path: [...segments, 'content', 0, 'text'],
                range: element.contentRange
            };
        }
        return {
            path: [...segments, `$${index === -1 ? element.content.length : index}`],
            range: element.contentRange
        };
    }

    /**
     *
     * @param name
     * @param nodes
     * @param range
     * @param position
     * @param segments
     * @returns visitor result or undefined
     */
    private visitChildren(
        name: string,
        nodes: AnyNode[],
        range: Range | undefined,
        position: Position,
        segments: Segment[]
    ): VisitorReturnValue | undefined {
        if (positionContained(range, position)) {
            for (let index = 0; index < nodes.length; index++) {
                const child = nodes[index];
                const result = this.visitChild(child, position, [...segments, name, index]);
                if (result) {
                    return result;
                }
            }
        }
        return undefined;
    }

    /**
     *
     * @param child
     * @param position
     * @param segments
     * @returns visitor result or undefined
     */
    private visitChild(
        child: AnyNode | undefined,
        position: Position,
        segments: Segment[]
    ): VisitorReturnValue | undefined {
        if (child === undefined) {
            return undefined;
        }
        const children = this.visit(child, position, segments);
        if (children) {
            return children;
        }
        return undefined;
    }
    /**
     *
     * @param name
     * @param value
     * @param range
     * @param position
     * @param segments
     * @returns visitor result or undefined
     */
    private visitTextProperty(
        name: string,
        value: string | undefined,
        range: Range | undefined,
        position: Position,
        segments: Segment[]
    ): VisitorReturnValue | undefined {
        if (value !== undefined && positionContained(range, position)) {
            const textFragments = getTextFragmentsUntilPosition(value, range, position);

            const offset = position.character - range.start.character;
            return {
                path: [...segments, name, `$${offset}`],
                range,
                ...textFragments
            };
        }
        return undefined;
    }
}

const visitor = new PositionVisitor();

export interface FindPathResult extends StartAndRemainingString {
    found: boolean;
    /**
     * JSON path
     */
    path: string;
}
export interface StartAndRemainingString {
    startString: string;
    remainingString: string;
}

/**
 * Finds a path to a node by the given position.
 *
 * @param annotationFile File in which to search the node. This can be mutated and empty nodes
 * added in case position is in a whitespace.
 * @param position Position used to match nodes.
 * @param forCompletion Position needs to be interpreted differently for completion cases.
 * Cursor position at the edges of the nodes can require a different behavior.
 * @returns path to node and its range (if defined)
 */
export function findPathToPosition(
    annotationFile: AnnotationFile,
    position: Position,
    forCompletion = false
): { path: string; range?: Range } | undefined {
    visitor.forCompletion = forCompletion;
    const result = visitor.visit(annotationFile, position, []);
    if (result) {
        return {
            path: result.path.join('/'),
            range: result.range
        };
    }
    return undefined;
}

/**
 * Returns start and reamining strings from given text by text range and position.
 *
 * @param content
 * @param rangeContent
 * @param position
 * @returns start string and remaining string
 */
function getTextFragmentsUntilPosition(
    content: string,
    rangeContent: Range,
    position: Position
): StartAndRemainingString {
    // only works for primitive string values located in single line in XML
    const length = position.character - rangeContent.start.character;
    return {
        startString: content.slice(0, length),
        remainingString: content.slice(length, rangeContent.end.character)
    };
}

/**
 * Verifies that position pointer points to a node in the given file and converts the pointer to
 * JSON path.
 *
 * @param annotationFile File in which the target node is located.
 * @param positionPointer Pointer in the form /\<propertyName\>/\<arrayIndex\>/.. to specify position inside object tree.
 * Node: last segment can have special meanings:
 *
 * - when last segment starts with $ followed by an integer value to be applied on a string: integer value specifies character index in that string
 * @returns
 */
export function getPositionData(annotationFile: AnnotationFile, positionPointer: string): FindPathResult {
    const segments = positionPointer.split('/');
    if (segments[0] === '') {
        segments.shift();
    } // remove empty first segment (if pointer starts with /)
    let found = true;
    let path = '$';
    let startString = '';
    let remainingString = '';
    let currentContext: AnyNode | undefined | string = annotationFile;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        if (segment.startsWith('$')) {
            if (typeof currentContext === 'string') {
                // special segment indicating exact position inside a string
                const offset = parseInt(segment.substring(1), 10);

                startString = currentContext.substring(0, offset);
                remainingString = currentContext.substring(offset);
            } else if (typeof currentContext === 'object') {
                // special segment indicating "white space" position inside element
                path += convertSegment(segment, true);
            }
            if (i < segments.length - 1) {
                return { found: false, path, startString, remainingString };
            }
        } else if (segment === parseInt(segment, 10).toString() && Array.isArray(currentContext)) {
            path += convertSegment(segment, false);
            const index = parseInt(segment, 10);
            currentContext = currentContext[index];
        } else if (typeof currentContext === 'object') {
            path += convertSegment(segment);
            currentContext = (currentContext as unknown as { [key: string]: AnyNode })[segment];
        } else {
            found = false;
        }
    }

    return { found, path, startString, remainingString };
}

/**
 * Converts segment text to escaped (quoted) text.
 *
 * @param segment segment text
 * @param escape flag enabling conversion (true by default)
 * @returns escaped segment text
 */
function convertSegment(segment: string, escape = true): string {
    const escapedSegment = escape ? `'${segment}'` : segment;
    return `[${escapedSegment}]`;
}
