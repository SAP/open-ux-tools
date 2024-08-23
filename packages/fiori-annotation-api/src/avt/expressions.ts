import type {
    AnnotationPathExpression,
    Collection,
    NavigationPropertyPathExpression,
    PathExpression,
    PropertyPathExpression
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
    Null: 'null'
};

/**
 *
 * @param value - Node.
 * @returns True if node is an expression.
 */
export function isExpression(
    value: Collection[number]
): value is PropertyPathExpression | PathExpression | NavigationPropertyPathExpression | AnnotationPathExpression {
    return typeof value === 'object' && value.type !== undefined && expressionNames[value.type] !== undefined;
}
