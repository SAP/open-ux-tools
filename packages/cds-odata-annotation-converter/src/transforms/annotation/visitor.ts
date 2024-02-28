import type { AnnotationNode } from '@sap-ux/cds-annotation-parser';
import type { Element } from '@sap-ux/odata-annotation-core-types';
import { nodeHandlerConfig } from './handlers';

import type { ConvertResult, NodeHandler } from './handler';
import { isSubtree } from './handler';

import type { VisitorState } from './visitor-state';

/**
 *
 */
export class Visitor {
    /**
     *
     * @param state - The visitor state.
     * @param node - The annotation node to be visited.
     * @returns The converted element or undefined if no conversion is performed.
     */
    visit(state: VisitorState, node: AnnotationNode): Element | undefined {
        const handler = nodeHandlerConfig[node.type] as unknown as NodeHandler<AnnotationNode>;
        if (!handler) {
            return undefined;
        }
        const contextDepth = state.contextDepth;
        const conversionResult = handler.convert(state, node);
        const children = handler.getChildren ? handler.getChildren(state, node) : [];

        if (!conversionResult && children.length === 0 && state.elementStack.length === 0) {
            return undefined;
        }

        const [root, leaf] = processConversionResult(
            state.elementStack[state.elementStack.length - 1],
            conversionResult
        );

        if (conversionResult) {
            state.elementStack.push(leaf);
        }

        for (const child of children) {
            const childElement = this.visit(state, child);
            if (childElement) {
                leaf.content.push(childElement);
            }
        }

        if (conversionResult) {
            state.elementStack.pop();
        }

        while (state.contextDepth > contextDepth) {
            state.popContext();
        }

        return root;
    }
}

/**
 * Process the conversion result and return a tuple of elements.
 *
 * @param leaf - The leaf element.
 * @param result - The conversion result.
 * @returns A tuple containing the root and leaf elements.
 *            - If the result is undefined, returns [undefined, leaf].
 *            - If the result is a subtree, returns [result.root, result.leaf].
 *            - Otherwise, returns [result, result].
 */
function processConversionResult(leaf: Element, result: ConvertResult): [Element | undefined, Element] {
    if (result === undefined) {
        // Use element from previous call, when current node is not converted
        return [undefined, leaf];
    }
    if (isSubtree(result)) {
        return [result.root, result.leaf];
    }
    return [result, result];
}

export const visitor = new Visitor();
