import type { Position } from '@sap-ux/text-document-utils';

import type { AnnotationNode, AnnotationNodeType } from './transformer/annotation-ast-nodes';
import {
    ANNOTATION_GROUP_TYPE,
    COLLECTION_TYPE,
    RECORD_TYPE,
    ANNOTATION_TYPE,
    ANNOTATION_GROUP_ITEMS_TYPE,
    IDENTIFIER_TYPE,
    ENUM_TYPE,
    BOOLEAN_TYPE,
    STRING_LITERAL_TYPE,
    NUMBER_LITERAL_TYPE,
    PATH_TYPE,
    RECORD_PROPERTY_TYPE,
    nodeRange,
    EMPTY_VALUE_TYPE,
    CORRECT_EXPRESSION_TYPE,
    UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    INCORRECT_EXPRESSION_TYPE,
    OPERATOR_TYPE
} from './transformer';
import { positionContained } from '@sap-ux/odata-annotation-core';

const LEAF_NODE_TYPES = new Set([
    IDENTIFIER_TYPE,
    ENUM_TYPE,
    BOOLEAN_TYPE,
    NUMBER_LITERAL_TYPE,
    STRING_LITERAL_TYPE,
    PATH_TYPE,
    EMPTY_VALUE_TYPE,
    OPERATOR_TYPE
]);

export interface PositionVisitorOptions {
    /**
     * Position by which each node is matched.
     */
    position: Position;
    /**
     * Some nodes has delimiters e.g string with ''.
     * Setting this option to true will make the visitor also consider these delimiters as part of the node
     * and will match the node if the position is inside the delimiter.
     */
    includeDelimiterCharacters: boolean;
}

type VisitorReturnValue = (string | number)[];
type VisitorEntry = keyof PositionVisitor;

/**
 * Visitor which visits all the nodes for which the specified position is in range.
 *
 */
class PositionVisitor {
    constructor() {
        this.createNodeHandler(ANNOTATION_GROUP_TYPE, ['name', 'items'], []);
        this.createNodeHandler(ANNOTATION_GROUP_ITEMS_TYPE, [], ['items']);
        this.createNodeHandler(ANNOTATION_TYPE, ['term', 'value'], []);
        this.createNodeHandler(RECORD_TYPE, [], ['properties', 'annotations']);
        this.createNodeHandler(RECORD_PROPERTY_TYPE, ['name', 'value'], []);
        this.createNodeHandler(COLLECTION_TYPE, [], ['items']);
        this.createNodeHandler(CORRECT_EXPRESSION_TYPE, [], ['operators', 'operands']);
        this.createNodeHandler(INCORRECT_EXPRESSION_TYPE, [], ['operators', 'operands']);
        this.createNodeHandler(UNSUPPORTED_OPERATOR_EXPRESSION_TYPE, [], ['operators', 'operands']);
    }

    /**
     * Visits all nodes (including children) which have the provided position in their ranges.
     *
     * @param node Node to be visited
     * @param options Visitor options
     * @param segment Name of the segment which should be added to path if the position is in the nodes range
     * @returns Visitor result value
     */
    visit(node: AnnotationNode, options: PositionVisitorOptions, segment?: string | number): VisitorReturnValue {
        const { position } = options;
        if (positionContained(nodeRange(node, options.includeDelimiterCharacters), position)) {
            if (LEAF_NODE_TYPES.has(node.type)) {
                return segment !== undefined ? [segment] : [];
            }

            if (this[node.type as VisitorEntry]) {
                return this[node.type as VisitorEntry](node, options, segment);
            } else {
                throw new Error(`No visitor function found for type ${node.type}`);
            }
        }
        return [];
    }

    /**
     *
     * @param nodeType Type of an annotation node
     * @param scalarProperties Array with names of scalar properties of an annotation node
     * @param collectionProperties Array with names of collection valued properties of an annotation node
     */
    private createNodeHandler(
        nodeType: AnnotationNodeType,
        scalarProperties: string[],
        collectionProperties: string[]
    ): void {
        this[nodeType as VisitorEntry] = (
            node: AnnotationNode,
            options: PositionVisitorOptions,
            segment = ''
        ): VisitorReturnValue => {
            for (const propertyName of scalarProperties) {
                const children = this.visit(
                    (node as unknown as { [key: string]: AnnotationNode })[propertyName],
                    options,
                    propertyName
                );
                if (children.length) {
                    return [segment, ...children];
                }
            }
            for (const propertyName of collectionProperties) {
                let i = 0;
                for (const item of (node as unknown as { [key: string]: AnnotationNode[] })[propertyName] || []) {
                    const children = this.visit(item, options, i);
                    if (children.length) {
                        return [segment, propertyName, ...children];
                    }
                    i++;
                }
            }
            return [segment];
        };
    }
}

const visitor = new PositionVisitor();

/**
 * Searches for an AST node in the given AST tree based on provided search options.
 *
 * @param assignment AST root element
 * @param options Search options (element position, flag whether delimiter characters should be considered)
 * @returns Path to the found AST node or empty string
 */
export const findAnnotationNode = (assignment: AnnotationNode | undefined, options: PositionVisitorOptions): string =>
    assignment ? visitor.visit(assignment, options).join('/') : '';

export type ChildNode = AnnotationNode | AnnotationNode[];

/**
 * Traverses the nodes using path and returns last matching node.
 *
 * @param root Node from which to start the traversal.
 * @param path Path used to traverse.
 * @returns Node matching path
 */
export const getNode = (root: AnnotationNode, path: string): ChildNode | undefined => {
    const segments = path.split('/');
    let node: ChildNode | undefined = root;
    for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        node = (node as unknown as { [key: string]: ChildNode })[segment];
        if (!Array.isArray(node) && !node?.type) {
            return undefined;
        }
    }
    return node;
};

/**
 * Converts path to an array of nodes matching each segment of the path.
 *
 * @param root Node from which to start the traversal
 * @param path Path to a node
 * @returns Array containing all the matched nodes
 */
export function getAstNodes(root: AnnotationNode, path: string): ChildNode[] | undefined {
    const segments = path.split('/');
    let node: ChildNode | undefined = root;
    const nodes: ChildNode[] = [];
    for (let i = 1; i < segments.length; i++) {
        const segment = segments[i];
        node = (node as unknown as { [key: string]: ChildNode })[segment];
        if (!Array.isArray(node) && !node?.type) {
            return undefined;
        }
        nodes.push(node);
    }
    return nodes;
}
