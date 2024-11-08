import type {
    AndExpression,
    AnnotationPathExpression,
    ApplyExpression,
    BoolExpression,
    Collection,
    DateExpression,
    DecimalExpression,
    EnumMemberExpression,
    EqExpression,
    FloatExpression,
    GeExpression,
    GtExpression,
    IfExpression,
    IntExpression,
    LeExpression,
    LtExpression,
    NavigationPropertyPathExpression,
    NeExpression,
    NotExpression,
    NullExpression,
    OrExpression,
    PathExpression,
    PropertyPathExpression,
    StringExpression
} from '@sap-ux/vocabularies-types';

/**
 * all attribute or node names that can provide a value representing an Expression (according to typescript definition)
 *  - each entry has the corresponding primitive JS type as string value
 */
export const expressionNames: Record<string, string> = {
    String: 'string',
    Bool: 'boolean',
    Decimal: 'number',
    Date: 'string',
    Float: 'number',
    Int: 'number',
    Path: 'string',
    PropertyPath: 'string',
    AnnotationPath: 'string',
    NavigationPropertyPath: 'string',
    EnumMember: 'string',
    Collection: 'array',
    Record: 'object',
    Apply: 'object',
    If: 'object',
    And: 'object',
    Or: 'object',
    Le: 'object',
    Lt: 'object',
    Ge: 'object',
    Gt: 'object',
    Eq: 'object',
    Ne: 'object',
    Not: 'object',
    Null: 'null'
};

/**
 *
 * @param value - Node.
 * @returns True if node is an expression.
 */
export function isExpression(
    value: Collection[number]
): value is
    | StringExpression
    | PropertyPathExpression
    | PathExpression
    | NavigationPropertyPathExpression
    | AnnotationPathExpression
    | EnumMemberExpression
    | BoolExpression
    | DecimalExpression
    | DateExpression
    | IntExpression
    | FloatExpression
    | ApplyExpression
    | NullExpression
    | IfExpression
    | AndExpression
    | OrExpression
    | EqExpression
    | NotExpression
    | NeExpression
    | GtExpression
    | GeExpression
    | LtExpression
    | LeExpression {
    return typeof value === 'object' && value.type !== undefined && expressionNames[value.type] !== undefined;
}
