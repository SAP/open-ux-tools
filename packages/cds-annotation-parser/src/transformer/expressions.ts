import type { Position, Range } from '@sap-ux/text-document-utils';

import { Edm, isBefore, positionContained } from '@sap-ux/odata-annotation-core';
import type {
    AnnotationValue,
    Expression,
    Node,
    NumberLiteral,
    Operator,
    CorrectExpression
} from './annotation-ast-nodes';
import {
    NUMBER_LITERAL_TYPE,
    OPERATOR_TYPE,
    CORRECT_EXPRESSION_TYPE,
    INCORRECT_EXPRESSION_TYPE,
    EXPRESSION_TYPES
} from './annotation-ast-nodes';

export const OPERATOR_NAME_NOT_EQUAL = 'not-equal'; // '!=' or '<>'
export const OPERATOR_NAME_EQUAL = 'equal'; // '=';
export const OPERATOR_NAME_GREATER_THEN = 'greater-then'; // '>';
export const OPERATOR_NAME_GREATER_OR_EQUAL = 'greater-or-equal'; // '>=';
export const OPERATOR_NAME_LESS_THEN = 'less-then'; // '<';
export const OPERATOR_NAME_LESS_OR_EQUAL = 'less-or-equal'; // '<=';
export const OPERATOR_NAME_TERNARY = 'ternary'; // '?' <trueValue> : <falseValue>;
export const OPERATOR_NAME_CONCAT = 'concat'; // '||';
export const OPERATOR_NAME_PLUS = 'plus'; // '+';
export const OPERATOR_NAME_MINUS = 'minus'; // '-';
export const OPERATOR_NAME_MULTIPLY = 'multiply'; // '*';
export const OPERATOR_NAME_DIVIDE = 'divide'; // '/';
export const OPERATOR_NAME_UNARY_MINUS = 'unary-minus'; // '-';

export const OPERATOR_NAME_NOT = 'not'; // 'NOT'
export const OPERATOR_NAME_AND = 'and'; // 'AND';
export const OPERATOR_NAME_OR = 'or'; // 'OR';
export const OPERATOR_NAME_IS_NULL = 'is-null'; // 'IS NULL';
export const OPERATOR_NAME_IS_NOT_NULL = 'is-not-null'; // 'IS NOT NULL';
export const OPERATOR_NAME_LIKE = 'like'; // 'like';
export const OPERATOR_NAME_NOT_LIKE = 'not-like'; // 'not like';
export const OPERATOR_NAME_BETWEEN = 'between'; // 'BETWEEN <lower> AND <higher>';
export const OPERATOR_NAME_NOT_BETWEEN = 'not-between'; // 'NOT BETWEEN <lower> AND <higher>';

export type OPERATOR_NAME =
    | typeof OPERATOR_NAME_NOT_EQUAL
    | typeof OPERATOR_NAME_EQUAL
    | typeof OPERATOR_NAME_GREATER_THEN
    | typeof OPERATOR_NAME_GREATER_OR_EQUAL
    | typeof OPERATOR_NAME_LESS_THEN
    | typeof OPERATOR_NAME_LESS_OR_EQUAL
    | typeof OPERATOR_NAME_TERNARY
    | typeof OPERATOR_NAME_CONCAT
    | typeof OPERATOR_NAME_PLUS
    | typeof OPERATOR_NAME_MINUS
    | typeof OPERATOR_NAME_MULTIPLY
    | typeof OPERATOR_NAME_DIVIDE
    | typeof OPERATOR_NAME_UNARY_MINUS
    | typeof OPERATOR_NAME_NOT
    | typeof OPERATOR_NAME_AND
    | typeof OPERATOR_NAME_OR
    | typeof OPERATOR_NAME_IS_NULL
    | typeof OPERATOR_NAME_IS_NOT_NULL
    | typeof OPERATOR_NAME_LIKE
    | typeof OPERATOR_NAME_NOT_LIKE
    | typeof OPERATOR_NAME_BETWEEN
    | typeof OPERATOR_NAME_NOT_BETWEEN;

// /!=?|==?|<>|>=?|<=?|\?|:|\|\||\+|-|\*|\/|\bIS NULL\b|\bIS NOT NULL\b|\bNOT LIKE\b|\bLIKE\b|\bNOT BETWEEN\b|\bBETWEEN\b|\bNOT\b|\bAND\b|\bOR\b/i
// operator image can stand for multiple operators, e.g. '-' can stand for negation operator or minus, list unary operators first
export const operatorImageMap: { [image: string]: OPERATOR_NAME[] } = {
    '!=': [OPERATOR_NAME_NOT_EQUAL],
    '<>': [OPERATOR_NAME_NOT_EQUAL],
    '=': [OPERATOR_NAME_EQUAL],
    '>': [OPERATOR_NAME_GREATER_THEN],
    '>=': [OPERATOR_NAME_GREATER_OR_EQUAL],
    '<': [OPERATOR_NAME_LESS_THEN],
    '<=': [OPERATOR_NAME_LESS_OR_EQUAL],
    '?': [OPERATOR_NAME_TERNARY],
    ':': [],
    '||': [OPERATOR_NAME_CONCAT],
    '+': [OPERATOR_NAME_PLUS],
    '-': [OPERATOR_NAME_UNARY_MINUS, OPERATOR_NAME_MINUS],
    '*': [OPERATOR_NAME_MULTIPLY],
    '/': [OPERATOR_NAME_DIVIDE],
    NOT: [OPERATOR_NAME_NOT],
    AND: [OPERATOR_NAME_AND],
    OR: [OPERATOR_NAME_OR],
    'IS NULL': [OPERATOR_NAME_IS_NULL],
    'IS NOT NULL': [OPERATOR_NAME_IS_NOT_NULL],
    LIKE: [OPERATOR_NAME_LIKE],
    'NOT LIKE': [OPERATOR_NAME_NOT_LIKE],
    BETWEEN: [OPERATOR_NAME_BETWEEN],
    'NOT BETWEEN': [OPERATOR_NAME_NOT_BETWEEN]
};

const UNARY_OPERATOR_KIND_PREFIX = 'prefix';
const UNARY_OPERATOR_KIND_SUFFIX = 'suffix';

const OPERATOR_TYPE_UNARY = 'unary-operator';
const OPERATOR_TYPE_BINARY = 'binary-operator';
const OPERATOR_TYPE_TERNARY = 'ternary-operator';

type OPERATOR_TYPE = typeof OPERATOR_TYPE_UNARY | typeof OPERATOR_TYPE_BINARY | typeof OPERATOR_TYPE_TERNARY;

interface OperatorDefinition {
    name: OPERATOR_NAME;
    type: OPERATOR_TYPE;
    kind?: typeof UNARY_OPERATOR_KIND_PREFIX | typeof UNARY_OPERATOR_KIND_SUFFIX; // for unary operators only
    secondaryOperatorImage?: string; // for ternary operators only
    precedence: number;
    edmName?: string; // if empty: known/supported operator in CDS but no support in OData, if 'odata.<functionName>': build Function
    edmNot?: boolean; // true: wrap in <Not> tag
}

// Edm names see: http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_ComparisonandLogicalOperators ff
// operator precedence see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence and
//    https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20a380977519101494ceddd944e87527.html

export const operatorMap: { [name: string]: OperatorDefinition } = {
    [OPERATOR_NAME_UNARY_MINUS]: {
        name: OPERATOR_NAME_UNARY_MINUS,
        type: OPERATOR_TYPE_UNARY,
        kind: UNARY_OPERATOR_KIND_PREFIX,
        edmName: Edm.Neg,
        precedence: 14
    },
    [OPERATOR_NAME_MULTIPLY]: {
        name: OPERATOR_NAME_MULTIPLY,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Mul,
        precedence: 12
    },
    [OPERATOR_NAME_DIVIDE]: {
        name: OPERATOR_NAME_DIVIDE,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Div,
        precedence: 12
    },
    [OPERATOR_NAME_PLUS]: { name: OPERATOR_NAME_PLUS, type: OPERATOR_TYPE_BINARY, edmName: Edm.Add, precedence: 11 },
    [OPERATOR_NAME_MINUS]: { name: OPERATOR_NAME_MINUS, type: OPERATOR_TYPE_BINARY, edmName: Edm.Sub, precedence: 11 },
    [OPERATOR_NAME_CONCAT]: {
        name: OPERATOR_NAME_CONCAT,
        type: OPERATOR_TYPE_BINARY,
        edmName: 'odata.concat',
        precedence: 10
    },
    // support via Edm.If and Edm.Null if cds-compilers edmx generation does
    [OPERATOR_NAME_IS_NULL]: {
        name: OPERATOR_NAME_IS_NULL,
        type: OPERATOR_TYPE_UNARY,
        kind: UNARY_OPERATOR_KIND_SUFFIX,
        precedence: 9
    },
    [OPERATOR_NAME_IS_NOT_NULL]: {
        name: OPERATOR_NAME_IS_NOT_NULL,
        type: OPERATOR_TYPE_UNARY,
        kind: UNARY_OPERATOR_KIND_SUFFIX,
        precedence: 9,
        edmNot: true
    },
    [OPERATOR_NAME_LIKE]: {
        name: OPERATOR_NAME_LIKE,
        type: OPERATOR_TYPE_BINARY,
        edmName: 'odata.matchesPattern',
        precedence: 9
    },
    [OPERATOR_NAME_NOT_LIKE]: {
        name: OPERATOR_NAME_NOT_LIKE,
        type: OPERATOR_TYPE_BINARY,
        edmName: 'odata.matchesPattern',
        precedence: 9,
        edmNot: true
    },
    // support via "Edm.Gt" "Edm.And" and "Edm.Lt" if cds-compilers edmx generation supports it
    [OPERATOR_NAME_BETWEEN]: {
        name: OPERATOR_NAME_BETWEEN,
        type: OPERATOR_TYPE_TERNARY,
        secondaryOperatorImage: 'AND',
        precedence: 9
    },
    [OPERATOR_NAME_NOT_BETWEEN]: {
        name: OPERATOR_NAME_NOT_BETWEEN,
        type: OPERATOR_TYPE_TERNARY,
        secondaryOperatorImage: 'AND',
        precedence: 9,
        edmNot: true
    },
    [OPERATOR_NAME_GREATER_THEN]: {
        name: OPERATOR_NAME_GREATER_THEN,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Gt,
        precedence: 9
    },
    [OPERATOR_NAME_GREATER_OR_EQUAL]: {
        name: OPERATOR_NAME_GREATER_OR_EQUAL,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Ge,
        precedence: 9
    },
    [OPERATOR_NAME_LESS_THEN]: {
        name: OPERATOR_NAME_LESS_THEN,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Lt,
        precedence: 9
    },
    [OPERATOR_NAME_LESS_OR_EQUAL]: {
        name: OPERATOR_NAME_LESS_OR_EQUAL,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Le,
        precedence: 9
    },
    [OPERATOR_NAME_NOT_EQUAL]: {
        name: OPERATOR_NAME_NOT_EQUAL,
        type: OPERATOR_TYPE_BINARY,
        edmName: Edm.Ne,
        precedence: 8
    },
    [OPERATOR_NAME_EQUAL]: { name: OPERATOR_NAME_EQUAL, type: OPERATOR_TYPE_BINARY, edmName: Edm.Eq, precedence: 8 },
    [OPERATOR_NAME_NOT]: {
        name: OPERATOR_NAME_NOT,
        type: OPERATOR_TYPE_UNARY,
        kind: UNARY_OPERATOR_KIND_PREFIX,
        edmName: Edm.Not,
        precedence: 6 // from hana operator precedences; in javascript '!' operator has much higher precedence
    },
    [OPERATOR_NAME_AND]: { name: OPERATOR_NAME_AND, type: OPERATOR_TYPE_BINARY, edmName: Edm.And, precedence: 4 },
    [OPERATOR_NAME_OR]: { name: OPERATOR_NAME_OR, type: OPERATOR_TYPE_BINARY, edmName: Edm.Or, precedence: 3 },
    [OPERATOR_NAME_TERNARY]: {
        name: OPERATOR_NAME_TERNARY,
        type: OPERATOR_TYPE_TERNARY,
        secondaryOperatorImage: ':',
        edmName: Edm.If,
        precedence: 2
    }
};

/**
 * @returns Edm operators map
 */
export function getEdmOperatorMap(): Map<string, string[]> {
    // find cds expression operator name for edm operator name/ odata function name
    const operatorImageLookup: Map<string, string[]> = new Map();
    for (const image of Object.keys(operatorImageMap)) {
        const names = operatorImageMap[image];
        for (const name of names) {
            if (!operatorImageLookup.has(name)) {
                operatorImageLookup.set(name, []);
            }
            operatorImageLookup.get(name)?.push(image);
        }
    }
    const result: Map<string, string[]> = new Map();
    for (const name of Object.keys(operatorMap)) {
        const edmName = operatorMap[name].edmName;
        if (edmName) {
            if (!result.has(edmName)) {
                result.set(edmName, []);
            }
            result.get(edmName)?.push(...(operatorImageLookup.get(name) ?? []));
        }
    }
    return result;
}

type ProtoExpression = {
    operators: Operator[];
    operands: AnnotationValue[];
    range: Range;
};

/**
 *  Builds expression.
 *
 * @param protoExpression Expression prototype
 * @returns Correct expression ast node
 */
export function buildExpression(protoExpression: ProtoExpression): CorrectExpression {
    const { operators, name } = getRootOperator(protoExpression);
    const operands = getOperands(name, operators, protoExpression);
    const CorrectExpression: CorrectExpression = {
        type: CORRECT_EXPRESSION_TYPE,
        operatorName: name,
        operators,
        operands,
        range: protoExpression.range
    };
    return CorrectExpression;
}

/**
 *  Checks if nodes are correctly sorted based on their ranges.
 *
 * @param nodes Array with nodes to check
 * @returns True if nodes ranges are correctly ordered
 */
function assertSequence(nodes: Node[]): boolean {
    if (nodes.length < 2) {
        return true;
    }
    let result = true;
    let previousNode = nodes[0];
    for (let index = 1; index < nodes.length && result; index++) {
        const currentNode = nodes[index];
        if (!previousNode?.range || !currentNode?.range || isBefore(currentNode.range.start, previousNode.range.end)) {
            result = false;
            break;
        }
        previousNode = currentNode;
    }
    return result;
}

/**
 * Searches for root operator in given expression prototype. Throws exceptions on errors.
 *
 * @param protoExpression Expression to process
 * @returns Found operators data
 */
function getRootOperator(protoExpression: ProtoExpression): { name: string; operators: Operator[] } {
    // operator with lowest precedence is root operator (remaining operators are used in sub expressions as operands)
    let rootOperatorName = '';
    let rootOperator: Operator | undefined;
    const rootOperators: Operator[] = [];
    let lowestPrecedence = 1000;
    for (const operator of protoExpression.operators) {
        if (rootOperatorName && operatorMap[rootOperatorName].secondaryOperatorImage === operator.value.toUpperCase()) {
            continue; // don't consider secondary operator name as root operator (e.g. 'and' in 'between a and b')
        }
        const operatorName = getOperatorName(operator, protoExpression);
        const precedence = operatorMap[operatorName]?.precedence || 1000;
        if (!rootOperator || precedence < lowestPrecedence) {
            rootOperator = operator;
            rootOperatorName = operatorName;
            lowestPrecedence = precedence;
        }
    }
    if (!rootOperator) {
        throw new Error('no root operator found');
    } else {
        rootOperators.push(rootOperator);
    }
    const operatorDef = operatorMap[rootOperatorName]; // ternary operators have unique name
    if (operatorDef.secondaryOperatorImage) {
        const secondaryOperator = protoExpression.operators.find(
            (operator) => operator.value.toUpperCase() === operatorDef.secondaryOperatorImage
        );
        if (secondaryOperator) {
            rootOperators.push(secondaryOperator);
        } else {
            throw new Error(`for operator '${rootOperatorName}', missing '${operatorDef.secondaryOperatorImage}'`);
        }
    }
    if (!assertSequence(rootOperators)) {
        throw new Error(`for operator '${rootOperatorName}', misplaced '${operatorDef.secondaryOperatorImage}'`);
    }
    return { name: rootOperatorName, operators: rootOperators };
}

/**
 * Searches operator name for the given operator based on expression data.
 *
 * @param operator Opertor AST node
 * @param protoExpression Expression AST node
 * @returns Operator name string
 */
function getOperatorName(operator: Operator, protoExpression: ProtoExpression): string {
    const operatorNames = operatorImageMap[operator.value.toUpperCase()];
    const { range, operators, operands } = protoExpression;
    let operatorName = '';
    for (const name of operatorNames) {
        // for multiple operator names: unary operator name is listed first
        // ignore unary operator if operators/operands in wrong positions exist
        // e.g. ('-' can stand for unary or binary operator)
        const operatorDef = operatorMap[name];
        if (operatorDef.type === OPERATOR_TYPE_UNARY) {
            const emptyRange =
                operatorDef.kind === UNARY_OPERATOR_KIND_PREFIX
                    ? { start: range.start, end: operator.range.start }
                    : { start: operator.range.end, end: range.end };
            if (filterNodes([...operators, ...operands], emptyRange).length) {
                continue;
            }
        }
        operatorName = name;
        break;
    }
    return operatorName;
}

/**
 * Extract operands from given expression.
 *
 * @param rootOperatorName Name of the root operator
 * @param rootOperators List with root operators (the first one is used only)
 * @param protoExpression Expression object
 * @returns Array with annotation values
 */
function getOperands(
    rootOperatorName: string,
    rootOperators: Operator[],
    protoExpression: ProtoExpression
): AnnotationValue[] {
    const rootOperator = rootOperators[0];
    const operatorDef = operatorMap[rootOperatorName];
    let operands: (AnnotationValue | undefined)[] = [];
    switch (operatorDef.type) {
        case OPERATOR_TYPE_UNARY: {
            const operandRange =
                operatorDef.kind === UNARY_OPERATOR_KIND_PREFIX
                    ? { start: rootOperator.range.end, end: protoExpression.range.end }
                    : { start: protoExpression.range.start, end: rootOperator.range.start };
            const emptyRange =
                operatorDef.kind === UNARY_OPERATOR_KIND_PREFIX
                    ? { start: protoExpression.range.start, end: rootOperator.range.start }
                    : { start: rootOperator.range.end, end: protoExpression.range.end };
            if (filterNodes([...protoExpression.operators, ...protoExpression.operands], emptyRange).length) {
                throw new Error(`unary operator '${rootOperatorName}': unsupported position of operand(s)`);
            }
            operands = [buildOperand(protoExpression, operandRange)];
            break;
        }
        case OPERATOR_TYPE_BINARY: {
            const leftRange = { start: protoExpression.range.start, end: rootOperator.range.start };
            const rightRange = { start: rootOperator.range.end, end: protoExpression.range.end };
            operands = [buildOperand(protoExpression, leftRange), buildOperand(protoExpression, rightRange)];
            break;
        }
        case OPERATOR_TYPE_TERNARY: {
            const secondaryOperator = protoExpression.operators.find(
                (operator) => operator.value.toUpperCase() === operatorDef.secondaryOperatorImage
            );
            if (!secondaryOperator) {
                throw new Error(
                    `ternary operator '${rootOperatorName}': secondary operator '${operatorDef.secondaryOperatorImage}' missing`
                );
            }
            const firstRange = { start: protoExpression.range.start, end: rootOperator.range.start };
            const secondRange = { start: rootOperator.range.end, end: secondaryOperator.range.start };
            const thirdRange = { start: secondaryOperator.range.end, end: protoExpression.range.end };
            operands = [
                buildOperand(protoExpression, firstRange),
                buildOperand(protoExpression, secondRange),
                buildOperand(protoExpression, thirdRange)
            ];
            break;
        }
        default:
            break;
    }
    if (operands.some((operand) => !operand)) {
        throw new Error(`missing operand for ${operatorDef.type} '${rootOperatorName}'`);
    }
    return operands as AnnotationValue[];
}

/**
 * Builds expression operand.
 *
 * @param protoExpression Expression node
 * @param range Range for searching existing operand in the given expression
 * @returns Found operand in the expression or new nested expression or undefined if no content in the given range
 */
function buildOperand(protoExpression: ProtoExpression, range: Range): AnnotationValue | CorrectExpression | undefined {
    const operators = filterNodes(protoExpression.operators, range) as Operator[];
    const operands = filterNodes(protoExpression.operands, range) as AnnotationValue[];
    if (operators.length === 0 && operands.length === 1) {
        return operands[0];
    }
    const subRange = nodesRange([...operators, ...operands]);
    if (!subRange) {
        return undefined; // no content in range
    }
    // try to build operand as nested expression (without ())
    return buildExpression({ operators, operands, range: subRange });
}

/**
 * Filter given nodes based on their ranges and returns only those which are within the given range.
 *
 * @param nodes Node to filter
 * @param range Range to check nodes inclusion
 * @returns Filtered nodes array
 */
function filterNodes(nodes: Node[], range: Range): Node[] {
    return (nodes || []).filter(
        (node) =>
            node.range && isBefore(range.start, node.range.start, true) && isBefore(node.range.end, range.end, true)
    );
}

/**
 * Creates a range covering all given nodes.
 *
 * @param nodes Nodes to be included in the result range
 * @returns Range or undefined if nodes array is empty
 */
function nodesRange(nodes: Node[]): Range | undefined {
    let start: Position | undefined;
    let end: Position | undefined;
    for (const node of nodes) {
        if (node.range) {
            if (!start || isBefore(node.range.start, start)) {
                start = node.range.start;
            }
            if (!end || isBefore(end, node.range.end)) {
                end = node.range.end;
            }
        }
    }
    if (!start || !end) {
        return undefined;
    } else {
        return { start, end };
    }
}

/**
 * Rebuilds number signes in the given exprssion.
 *
 * @param protoExpression Expression to process
 * @returns Updated expression
 */
export function rebuildNumberSigns(protoExpression: ProtoExpression): ProtoExpression {
    const { operators, operands, range } = { ...protoExpression };
    // revert '-' operators to number signs if they are followed by an unsigned number and not preceded by an operand
    if (!(operators || []).some((operator) => operator.value === '-')) {
        return { operators, operands, range };
    }
    const sortedNodes = getSortedNodes(protoExpression);

    for (let i = sortedNodes.length - 1; i >= 0; i--) {
        const currentNode = sortedNodes[i];
        const nextNode = sortedNodes[i + 1];
        const previousNode = sortedNodes[i - 1];
        if (!nextNode || !doRebuildNumberSign(currentNode, nextNode, previousNode)) {
            continue;
        }
        const numberNode = nextNode as NumberLiteral;
        const numberValue = numberNode.value;
        // add sign to number node
        numberNode.value = typeof numberValue === 'string' ? `-${numberValue}` : -numberValue;
        if (numberNode.range?.start && currentNode.range?.start) {
            numberNode.range.start.character = currentNode.range?.start.character;
        }
        // remove '-' operator represented by current node
        const index = operators.findIndex((operator) => operator.range === currentNode.range);
        if (index >= 0) {
            operators.splice(index, 1);
        }
    }
    return { operators, operands, range };
}

/**
 * Sorts expression operators and operands based on their ranges.
 *
 * @param protoExpression Expression node
 * @returns Sorted expression operators and operands
 */
function getSortedNodes(protoExpression: ProtoExpression): (Operator | AnnotationValue)[] {
    return [...protoExpression.operators, ...protoExpression.operands]
        .filter((node) => !!node.range)
        .sort((node1, node2) =>
            node1.range && node2.range && isBefore(node1.range.start, node2.range.start) ? -1 : +1
        );
}

/**
 * Checks if rebuild of number sign is needed.
 *
 * @param currentNode Current operator or operand
 * @param nextNode Next operator or operand
 * @param previousNode Previous operator or operand
 * @returns Boolean result
 */
function doRebuildNumberSign(
    currentNode: Operator | AnnotationValue,
    nextNode: Operator | AnnotationValue,
    previousNode: Operator | AnnotationValue
): boolean {
    if (currentNode.type !== OPERATOR_TYPE || currentNode.value !== '-') {
        return false; // no '-' operator
    }
    if (nextNode?.type !== NUMBER_LITERAL_TYPE || !nextNode.value) {
        return false; // no next node or next node is no number or initial number
    }
    if (
        currentNode.range?.end.line !== nextNode.range?.start.line ||
        currentNode.range?.end.character !== nextNode.range?.start.character
    ) {
        return false; // '-' operator is not directly followed by number (at least single space in between)
    }
    const numberValue = nextNode.value;
    if (
        (typeof numberValue === 'string' && numberValue.startsWith('-')) ||
        (typeof numberValue === 'number' && numberValue < 0)
    ) {
        return false; // number has already '-' sign
    }
    // make sure if previous node exists, it is operator
    return !previousNode || previousNode.type === OPERATOR_TYPE;
}

/**
 * Checks if the given position is in the given expression white space.
 *
 * @param expression Expression node
 * @param position Position to check
 * @returns True if position is not occupied by some operand or operator, i.e. is in white space
 */
export function positionIsInExpressionWhiteSpace(expression: Expression, position: Position): boolean {
    if (!positionContained(expression.range, position)) {
        return false;
    }
    const subNodes = [...expression.operators, ...expression.operands];
    return !subNodes.some((entry) => positionContained(entry.range, position));
}

/**
 * Recursively checks if expression contains some incorrect nested expressions.
 *
 * @param expression Expression node to check
 * @returns True if incorrect expression found
 */
export function containsIncorrectExpressions(expression: Expression): boolean {
    if (expression.type === INCORRECT_EXPRESSION_TYPE) {
        return true;
    }
    if (expression.operands.some((operand) => operand.type === INCORRECT_EXPRESSION_TYPE)) {
        return true;
    }
    for (const operand of expression.operands) {
        if (EXPRESSION_TYPES.includes(operand.type) && containsIncorrectExpressions(operand as Expression)) {
            return true;
        }
    }
    return false;
}
