import { Range } from '@sap-ux/text-document-utils';
import { copyRange } from './range';

export type QualifiedName = string;
export type SimpleIdentifier = string;
export enum Delimiter {
    none = 'none',
    quoted = 'quoted',
    exclamationSquareBrackets = 'exclamation-square-brackets'
}
export interface Node {
    type: string;
    range?: Range;
}

export const TOKEN_TYPE = 'token';
export interface Token extends Node {
    type: typeof TOKEN_TYPE;
    value: string;
}

export const NUMBER_LITERAL_TYPE = 'number';
export interface NumberLiteral extends Node {
    type: typeof NUMBER_LITERAL_TYPE;
    value: number | string;
}

export const ENUM_TYPE = 'enum';
export interface Enum extends Node {
    type: typeof ENUM_TYPE;
    path: Path;
}

export type QuotedLiteralKind = 'date' | 'time' | 'timestamp' | 'binary';

export const QUOTED_LITERAL_TYPE = 'quoted-literal';
export interface QuotedLiteral extends Node {
    type: typeof QUOTED_LITERAL_TYPE;
    value: string;
    kind: QuotedLiteralKind;
}

export const EMPTY_VALUE_TYPE = 'empty-value';
export interface EmptyValue extends Node {
    type: typeof EMPTY_VALUE_TYPE;
}

export const BOOLEAN_TYPE = 'boolean';
export interface BooleanLiteral extends Node {
    type: typeof BOOLEAN_TYPE;
    value: boolean;
}

export const STRING_LITERAL_TYPE = 'string';
export interface StringLiteral extends Node {
    type: typeof STRING_LITERAL_TYPE;
    value: string;
    openToken?: Token;
    closeToken?: Token;
}
export const MULTI_LINE_STRING_LITERAL_TYPE = 'multi-line-string';
export interface MultiLineStringLiteral extends Node {
    type: typeof MULTI_LINE_STRING_LITERAL_TYPE;
    stripIndentation: boolean;
    value: string;
    openToken?: Token;
    closeToken?: Token;
}

export const PATH_TYPE = 'path';
export interface Path extends Node {
    type: typeof PATH_TYPE;
    value: string;
    segments: Identifier[];
    separators: Separator[];
}

export const SEPARATOR_TYPE = 'separator';
export interface Separator extends Node {
    type: typeof SEPARATOR_TYPE;
    value: string;
    escaped: boolean;
}

export const IDENTIFIER_TYPE = 'identifier';
export interface Identifier extends Node {
    type: typeof IDENTIFIER_TYPE;
    value: string;
    quoted?: boolean;
}

export const OPERATOR_TYPE = 'operator';
export interface Operator extends Node {
    type: typeof OPERATOR_TYPE;
    value: string; // image of token representing operator (e.g. '-')
    range: Range;
}

export type EXPRESSION_TYPE =
    | typeof INCORRECT_EXPRESSION_TYPE
    | typeof UNSUPPORTED_OPERATOR_EXPRESSION_TYPE
    | typeof CORRECT_EXPRESSION_TYPE;

export interface ExpressionBase extends Node {
    type: EXPRESSION_TYPE;
    operators: Operator[];
    operands: AnnotationValue[];
    openToken?: Token;
    closeToken?: Token;
}
export const UNSUPPORTED_OPERATOR_EXPRESSION_TYPE = 'unsupported-operator-expression';
export interface UnsupportedOperatorExpression extends ExpressionBase {
    type: typeof UNSUPPORTED_OPERATOR_EXPRESSION_TYPE;
    unsupportedOperator: Operator; // unsupported operator
}
export const INCORRECT_EXPRESSION_TYPE = 'incorrect-expression';
export interface IncorrectExpression extends ExpressionBase {
    type: typeof INCORRECT_EXPRESSION_TYPE;
    /**
     * message indicating why the expression is incorrect
     * (for supportability only! i.e. for debugging and ensuring parsing stability by including it in snapshots).
     *
     * Remark: Syntactically incorrect CDS expressions are diagnosed by the cds-compiler
     */
    message?: string;
}

export const CORRECT_EXPRESSION_TYPE = 'correct-expression';
export interface CorrectExpression extends ExpressionBase {
    type: typeof CORRECT_EXPRESSION_TYPE;
    operatorName: string; // operators (and operands) contain main operator/operands (implicit nesting resolved based on precedence)
}
export const EXPRESSION_TYPES = [
    UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    INCORRECT_EXPRESSION_TYPE,
    CORRECT_EXPRESSION_TYPE
];

export const RECORD_PROPERTY_TYPE = 'record-property';
export interface RecordProperty extends Node {
    type: typeof RECORD_PROPERTY_TYPE;
    name: Path;
    value?: AnnotationValue;
    colon?: Token;
}

export const RECORD_TYPE = 'record';
export interface Record extends Node {
    type: typeof RECORD_TYPE;
    properties: RecordProperty[];
    annotations?: Annotation[];
    openToken?: Token;
    closeToken?: Token;
    commas: Token[];
}

export const COLLECTION_TYPE = 'collection';
export interface Collection extends Node {
    type: typeof COLLECTION_TYPE;
    items: AnnotationValue[];
    openToken?: Token;
    closeToken?: Token;
    commas: Token[];
}

export const QUALIFIER_TYPE = 'qualifier';
export interface Qualifier extends Node {
    type: typeof QUALIFIER_TYPE;
    value: string;
}

export type AnnotationValue =
    | Enum
    | BooleanLiteral
    | Record
    | Collection
    | Path
    | NumberLiteral
    | StringLiteral
    | MultiLineStringLiteral
    | QuotedLiteral
    | Token
    | EmptyValue
    | Expression;
export type AnnotationValueType =
    | typeof ENUM_TYPE
    | typeof BOOLEAN_TYPE
    | typeof RECORD_TYPE
    | typeof COLLECTION_TYPE
    | typeof PATH_TYPE
    | typeof NUMBER_LITERAL_TYPE
    | typeof STRING_LITERAL_TYPE
    | typeof MULTI_LINE_STRING_LITERAL_TYPE
    | typeof TOKEN_TYPE
    | typeof QUOTED_LITERAL_TYPE
    | typeof EMPTY_VALUE_TYPE
    | EXPRESSION_TYPE;
export const ANNOTATION_TYPE = 'annotation';
export interface Annotation extends Node {
    type: typeof ANNOTATION_TYPE;
    term: Path;
    qualifier?: Qualifier;
    value?: AnnotationValue;
    colon?: Token;
}

export const ANNOTATION_GROUP_TYPE = 'annotation-group';
export interface AnnotationGroup extends Node {
    type: typeof ANNOTATION_GROUP_TYPE;
    name: Identifier;
    items: AnnotationGroupItems;
    colon?: Token;
}

export type AstResult = Annotation | AnnotationGroup | undefined;

export const ANNOTATION_GROUP_ITEMS_TYPE = 'annotation-group-items';
export interface AnnotationGroupItems extends Node {
    type: typeof ANNOTATION_GROUP_ITEMS_TYPE;
    items: Annotation[];
    openToken?: Token;
    closeToken?: Token;
    commas: Token[];
}

const CONTAINER_TYPES = new Set([ANNOTATION_GROUP_ITEMS_TYPE, RECORD_TYPE, COLLECTION_TYPE]);

export const isContainer = (node: AnnotationNode): node is AnnotationGroupItems | Record | Collection =>
    CONTAINER_TYPES.has(node.type);

export type Assignment = Annotation | AnnotationGroup;

export type Expression = CorrectExpression | IncorrectExpression | UnsupportedOperatorExpression;
export type AnnotationNode =
    | Annotation
    | AnnotationGroup
    | AnnotationGroupItems
    | AnnotationValue
    | RecordProperty
    | Qualifier
    | Identifier
    | Separator
    | Token
    | EmptyValue
    | Expression;

export type NarrowAnnotationNode<T, N = AnnotationNode> = N extends { type: T } ? N : never;
export type AnnotationNodeType =
    | typeof ANNOTATION_TYPE
    | typeof ANNOTATION_GROUP_TYPE
    | typeof ANNOTATION_GROUP_ITEMS_TYPE
    | typeof RECORD_PROPERTY_TYPE
    | typeof QUALIFIER_TYPE
    | typeof IDENTIFIER_TYPE
    | typeof TOKEN_TYPE
    | AnnotationValueType;

export const nodeRange = (node: AnnotationNode, includeDelimiters: boolean): Range | undefined => {
    if (!node.range) {
        return undefined;
    }

    if (includeDelimiters) {
        return copyRange(node.range);
    }

    switch (node.type) {
        case ANNOTATION_GROUP_ITEMS_TYPE:
        case RECORD_TYPE:
        case COLLECTION_TYPE:
        case STRING_LITERAL_TYPE:
        case INCORRECT_EXPRESSION_TYPE:
        case UNSUPPORTED_OPERATOR_EXPRESSION_TYPE:
        case CORRECT_EXPRESSION_TYPE: {
            // if delimiter tokens exist adjust range accordingly
            const start = node.openToken?.range ? copyRange(node.openToken.range).end : copyRange(node.range).start;
            const end = node.closeToken?.range ? copyRange(node.closeToken.range).start : copyRange(node.range).end;
            return Range.create(start, end);
        }
        default:
            break;
    }
    return copyRange(node.range);
};
