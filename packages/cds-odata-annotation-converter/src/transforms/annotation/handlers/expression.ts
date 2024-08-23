import type {
    AnnotationValue,
    IncorrectExpression,
    CorrectExpression,
    UnsupportedOperatorExpression
} from '@sap-ux/cds-annotation-parser';
import {
    INCORRECT_EXPRESSION_TYPE,
    CORRECT_EXPRESSION_TYPE,
    UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    nodeRange,
    operatorMap,
    containsIncorrectExpressions
} from '@sap-ux/cds-annotation-parser';

import type { Element, Range } from '@sap-ux/odata-annotation-core-types';
import { Edm, createAttributeNode, createElementNode } from '@sap-ux/odata-annotation-core-types';

import type { ConvertResult, NodeHandler, Subtree } from '../handler';
import type { VisitorState } from '../visitor-state';

export const correctExpressionHandler: NodeHandler<CorrectExpression> = {
    type: CORRECT_EXPRESSION_TYPE,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getChildren(state: VisitorState, expression: CorrectExpression): AnnotationValue[] {
        if (containsIncorrectExpressions(expression)) {
            return [];
        }
        return expression.operands;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    convert(state: VisitorState, expression: CorrectExpression): ConvertResult {
        if (containsIncorrectExpressions(expression)) {
            return;
        }
        const noContentRange = { line: 0, character: 0 };
        const startRange = nodeRange(expression.operands[0], true);
        const contentRangeStart = startRange?.start;
        const contentRangeEnd = nodeRange(expression.operands[expression.operands.length - 1], true)?.end;
        const contentRange = { start: contentRangeStart ?? noContentRange, end: contentRangeEnd ?? noContentRange };
        return buildElementForOperator(expression, contentRange);
    }
};
// incorrect expressions appear as empty values in generic annotation file
export const incorrectExpressionHandler: NodeHandler<IncorrectExpression> = {
    type: INCORRECT_EXPRESSION_TYPE,
    convert(): ConvertResult {
        return;
    }
};

// expressions with unknown operators appear as nodes with name of unknown operator only (no other operators, no operands as sub nodes)
export const unknownOperatorExpressionHandler: NodeHandler<UnsupportedOperatorExpression> = {
    type: UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    getChildren(): AnnotationValue[] {
        return [];
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    convert(state: VisitorState, expression: UnsupportedOperatorExpression): ConvertResult {
        const element: Element = createElementNode({
            name: expression.unsupportedOperator.value,
            nameRange: expression.unsupportedOperator.range,
            range: expression.unsupportedOperator.range
        });
        return element;
    }
};

/**
 *
 * @param expression correct expression.
 * @param contentRange element content range.
 * @returns element or subtree containing all the info of range, name. content range..
 */
function buildElementForOperator(expression: CorrectExpression, contentRange: Range): Element | Subtree {
    const operatorDefinition = operatorMap[expression.operatorName];
    const edmName = operatorDefinition.edmName ?? '';
    const elementName = edmName.startsWith('odata.') ? Edm.Apply : edmName;
    const element: Element = createElementNode({
        name: elementName,
        contentRange,
        range: nodeRange(expression, true)
    });
    const operatorRange = expression.operators[0].range;
    if (elementName === Edm.Apply) {
        element.attributes = {
            [Edm.Function]: createAttributeNode(Edm.Function, edmName, undefined, operatorRange)
        };
    } else {
        element.nameRange = operatorRange;
    }
    if (operatorDefinition.edmName && operatorDefinition.edmNot) {
        // wrap valid edm node into 'Not' expression
        const notElement: Element = createElementNode({
            name: Edm.Not,
            nameRange: operatorRange,
            contentRange,
            content: [element]
        });
        return { root: notElement, leaf: element } as Subtree;
    } else {
        element.contentRange = contentRange;
        return element;
    }
}
