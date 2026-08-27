import type { Position } from '@sap-ux/text-document-utils';
import { parse as cdsAnnotationParser } from './parser/index.js';
import { buildAst } from './transformer/index.js';

export const parse = (text: string, startPosition?: Position) => {
    const { cst, tokens } = cdsAnnotationParser(text);
    return buildAst(cst, tokens, startPosition);
};

export {
    EMPTY_VALUE_TYPE,
    RECORD_PROPERTY_TYPE,
    PATH_TYPE,
    STRING_LITERAL_TYPE,
    ANNOTATION_TYPE,
    RECORD_TYPE,
    ANNOTATION_GROUP_ITEMS_TYPE,
    ANNOTATION_GROUP_TYPE,
    BOOLEAN_TYPE,
    NUMBER_LITERAL_TYPE,
    ENUM_TYPE,
    OPERATOR_TYPE,
    UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    INCORRECT_EXPRESSION_TYPE,
    CORRECT_EXPRESSION_TYPE,
    EXPRESSION_TYPES,
    COLLECTION_TYPE,
    TOKEN_TYPE,
    QUOTED_LITERAL_TYPE,
    QUALIFIER_TYPE,
    MULTI_LINE_STRING_LITERAL_TYPE,
    SEPARATOR_TYPE,
    IDENTIFIER_TYPE,
    operatorMap,
    positionIsInExpressionWhiteSpace,
    containsIncorrectExpressions,
    getEdmOperatorMap,
    nodeRange,
    isContainer
} from './transformer/index.js';

export type {
    Record,
    Node,
    AnnotationValue,
    AnnotationGroup,
    AnnotationNodeType,
    AnnotationGroupItems,
    Collection,
    Enum,
    Expression,
    UnsupportedOperatorExpression,
    IncorrectExpression,
    CorrectExpression,
    StringLiteral,
    Path,
    EmptyValue,
    BooleanLiteral,
    NumberLiteral,
    QuotedLiteralKind,
    Token,
    QuotedLiteral,
    MultiLineStringLiteral,
    Identifier,
    Annotation,
    RecordProperty,
    AnnotationNode,
    Assignment,
    Separator,
    NarrowAnnotationNode
} from './transformer/index.js';

export { arePositionsEqual, copyPosition, copyRange, areRangesEqual } from './transformer/index.js';
export { ReservedProperties, isReservedProperty } from './constants.js';
export { findAnnotationNode, getNode, getAstNodes } from './find-annotation-node.js';
