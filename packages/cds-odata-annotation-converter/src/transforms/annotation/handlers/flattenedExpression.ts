import type { AnnotationNode, FlattenedExpression, FlattenedPathSegment } from '@sap-ux/cds-annotation-parser';
import { copyRange, FLATTENED_EXPRESSION_TYPE, nodeRange, ReservedProperties } from '@sap-ux/cds-annotation-parser';

import type { Element } from '@sap-ux/odata-annotation-core-types';
import { createElementNode, Edm } from '@sap-ux/odata-annotation-core-types';
import { convertFlattenedPath } from '../flattened';

import type { ConvertResult, NodeHandler, Subtree } from '../handler';
import type { VisitorState } from '../visitor-state';

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
 * @param element - The element to which the flattened structure will be added.
 * @returns Returns a Subtree representing the nested structures, or undefined if not applicable.
 */
function handleFlattenedStructure(state: VisitorState, expression: FlattenedExpression): Subtree | undefined {
    // Build nested structures for CDS flattened syntax
    // e.g UI.Chart.AxisScaling.ScaleBehavior : #AutoScale, @Common.Text.@UI.TextArrangement : #TextFirst

    // else {
    //     return convertFlattenedPath(state, node.name.segments, node.value);
    // }
    const subtree = convertFlattenedPath(state, expression, expression.value);
    // console.log(JSON.stringify(subtree, undefined, 2));
    return subtree;
    // if (subtree) {
    //     const range = subtree.root.range ? copyRange(subtree.root.range) : undefined;
    //     if (subtree.root.name === Edm.PropertyValue) {
    //         const record = createElementNode({
    //             name: Edm.Record,
    //             range,
    //             contentRange: range
    //         });
    //         record.content.push(subtree.root);
    //         element.content.push(record);
    //     } else {
    //         return subtree;
    //     }

    //     element.contentRange = range ? copyRange(range) : undefined;

    //     return {
    //         root: element,
    //         leaf: subtree.leaf
    //     };
    // }
}
