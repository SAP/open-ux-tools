import {
    getEdmOperatorMap,
    positionIsInExpressionWhiteSpace,
    containsIncorrectExpressions
} from '../../src/transformer/expressions';
import type { CorrectExpression, IncorrectExpression, Path } from '../../src';
import {
    CORRECT_EXPRESSION_TYPE,
    IDENTIFIER_TYPE,
    INCORRECT_EXPRESSION_TYPE,
    OPERATOR_TYPE,
    PATH_TYPE
} from '../../src';
import { Range } from '@sap-ux/odata-annotation-core';

describe('getEdmOperatorMap', () => {
    test('in group identifier', async () => {
        expect(getEdmOperatorMap()).toMatchInlineSnapshot(`
            Map {
              "Neg" => Array [
                "-",
              ],
              "Mul" => Array [
                "*",
              ],
              "Div" => Array [
                "/",
              ],
              "Add" => Array [
                "+",
              ],
              "Sub" => Array [
                "-",
              ],
              "odata.concat" => Array [
                "||",
              ],
              "odata.matchesPattern" => Array [
                "LIKE",
                "NOT LIKE",
              ],
              "Gt" => Array [
                ">",
              ],
              "Ge" => Array [
                ">=",
              ],
              "Lt" => Array [
                "<",
              ],
              "Le" => Array [
                "<=",
              ],
              "Ne" => Array [
                "!=",
                "<>",
              ],
              "Eq" => Array [
                "=",
              ],
              "Not" => Array [
                "NOT",
              ],
              "And" => Array [
                "AND",
              ],
              "Or" => Array [
                "OR",
              ],
              "If" => Array [
                "?",
              ],
            }
        `);
    });
});

describe('positionIsInExpressionWhiteSpace', () => {
    const lastNodeRange: Range = Range.create(0, 0, 0, 20);
    const operandRange1: Range = Range.create(0, 3, 0, 5);
    const operatorRange: Range = Range.create(0, 9, 0, 11);
    const operandRange2: Range = Range.create(0, 13, 0, 15);
    const operand1 = {
        type: PATH_TYPE,
        value: 'p1',
        segments: [{ type: IDENTIFIER_TYPE, value: 'p1', range: operandRange1 }],
        separators: [],
        range: operandRange1
    } as Path;
    const operand2 = {
        type: PATH_TYPE,
        value: 'p2',
        segments: [{ type: IDENTIFIER_TYPE, value: 'p1', range: operandRange2 }],
        separators: [],
        range: operandRange2
    } as Path;

    const correctExpression = {
        type: CORRECT_EXPRESSION_TYPE,
        operatorName: 'notEqual',
        operands: [operand1, operand2],
        operators: [{ type: OPERATOR_TYPE, value: '!=', range: operatorRange }],
        range: lastNodeRange
    } as CorrectExpression;

    test('test expression', async () => {
        expect(positionIsInExpressionWhiteSpace(correctExpression, { line: 0, character: 2 })).toBe(true);
        expect(positionIsInExpressionWhiteSpace(correctExpression, { line: 0, character: 4 })).toBe(false);
        expect(positionIsInExpressionWhiteSpace(correctExpression, { line: 0, character: 10 })).toBe(false);
        expect(positionIsInExpressionWhiteSpace(correctExpression, { line: 0, character: 12 })).toBe(true);
        expect(positionIsInExpressionWhiteSpace(correctExpression, { line: 0, character: 17 })).toBe(true);
        expect(positionIsInExpressionWhiteSpace(correctExpression, { line: 0, character: 22 })).toBe(false);
    });
});

describe('containsIncorrectExpressions', () => {
    const range = Range.create(0, 0, 0, 20);
    const operand1 = {
        type: PATH_TYPE,
        value: 'p1',
        segments: [{ type: IDENTIFIER_TYPE, value: 'p1', range }],
        separators: [],
        range
    } as Path;
    const operand2 = {
        type: PATH_TYPE,
        value: 'p2',
        segments: [{ type: IDENTIFIER_TYPE, value: 'p1', range }],
        separators: [],
        range
    } as Path;

    test('test expression', async () => {
        const correctExpression = {
            type: CORRECT_EXPRESSION_TYPE,
            operatorName: 'notEqual',
            operands: [operand1, operand2],
            operators: [{ type: OPERATOR_TYPE, value: '!=', range }],
            range
        } as CorrectExpression;
        expect(containsIncorrectExpressions(correctExpression)).toBe(false);
        const incorrectExpression = {
            type: INCORRECT_EXPRESSION_TYPE,
            operatorName: 'notEqual',
            operands: [operand1],
            operators: [{ type: OPERATOR_TYPE, value: '!=', range }],
            message: 'missing second operand',
            range
        } as IncorrectExpression;
        expect(containsIncorrectExpressions(incorrectExpression)).toBe(true);
        const incorrectWithinCorrectExpression = {
            type: CORRECT_EXPRESSION_TYPE,
            operatorName: 'notEqual',
            operands: [incorrectExpression, operand2],
            operators: [{ type: OPERATOR_TYPE, value: '!=', range }],
            range
        } as CorrectExpression;
        expect(containsIncorrectExpressions(incorrectWithinCorrectExpression)).toBe(true);
        const correctWithinCorrectExpression = {
            type: CORRECT_EXPRESSION_TYPE,
            operatorName: 'notEqual',
            operands: [correctExpression, operand2],
            operators: [{ type: OPERATOR_TYPE, value: '!=', range }],
            range
        } as CorrectExpression;
        expect(containsIncorrectExpressions(correctWithinCorrectExpression)).toBe(false);
    });
});
