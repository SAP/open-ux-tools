import type { AnnotationNode } from '@sap-ux/cds-annotation-parser';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import type { Context, VisitorState } from './visitor-state';

export type ConvertResult = Element | Subtree | undefined;
export interface NodeHandler<N extends AnnotationNode> {
    type: N['type'];
    getChildren?: (state: VisitorState, node: N) => AnnotationNode[];
    convert: (state: VisitorState, node: N) => ConvertResult;
    updateContext?: (state: VisitorState, node: N, element: Element) => Context;
}

/**
 * Used when node is converted in a tree structure with multiple levels
 */
export interface Subtree {
    /**
     * Element that will be added as a content to the parent element
     */
    root: Element;
    /**
     * Element to which child elements will be added
     */
    leaf: Element;
}

/**
 * Checks if the given value is a Subtree.
 *
 * @param value - The value to be checked.
 * @returns Returns true if the value is a Subtree, otherwise false.
 */
export function isSubtree(value: Subtree | Element): value is Subtree {
    return (value as unknown as Element).type === undefined;
}
export type Visitor = (node: AnnotationNode) => void;
