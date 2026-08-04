import type { AnnotationNode, FlattenedExpression } from '@sap-ux/cds-annotation-parser';
import { FLATTENED_EXPRESSION_TYPE, ReservedProperties } from '@sap-ux/cds-annotation-parser';

import { convertFlattenedPath } from '../flattened.js';

import type { ConvertResult, NodeHandler, Subtree } from '../handler.js';
import type { VisitorState } from '../visitor-state.js';

export const flattenedExpressionHandler: NodeHandler<FlattenedExpression> = {
    type: FLATTENED_EXPRESSION_TYPE,
    convert,
    getChildren(state: VisitorState, expression: FlattenedExpression): AnnotationNode[] {
        if (!expression.path.value.includes(ReservedProperties.Type) && expression.value) {
            return [expression.value];
        } else {
            return [];
        }
    }
};

/**
 * Converts an Annotation node into an Element node and handles flattened structures.
 *
 * @param state - The visitor state.
 * @param expression - The Annotation node to convert.
 * @returns Returns an Element or Subtree representing the converted structure.
 */
function convert(state: VisitorState, expression: FlattenedExpression): ConvertResult {
    const flattenedSubtree = handleFlattenedStructure(state, expression);

    if (flattenedSubtree) {
        return flattenedSubtree;
    }

    return undefined;
}

/**
 * Handles a flattened structure in the CDS syntax and builds nested structures.
 *
 * @param state - The visitor state.
 * @param expression - The annotation containing the flattened structure.
 * @returns Returns a Subtree representing the nested structures, or undefined if not applicable.
 */
function handleFlattenedStructure(state: VisitorState, expression: FlattenedExpression): Subtree | undefined {
    // Build nested structures for CDS flattened syntax
    // e.g UI.Chart.AxisScaling.ScaleBehavior : #AutoScale, @Common.Text.@UI.TextArrangement : #TextFirst
    const subtree = convertFlattenedPath(state, expression, expression.value);
    return subtree;
}
