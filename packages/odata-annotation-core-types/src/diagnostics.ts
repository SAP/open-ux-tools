import type {
    FullyQualifiedName,
    NamespaceString,
    Alias,
    ElementName,
    AttributeName,
    DiagnosticSeverity,
    Range
} from '.';
import type { Facets, Constraints } from './types';
import type { MultilineType } from './annotation-file';

/**
 * hold all type information required for checking a value
 */
export interface ValueType {
    name: FullyQualifiedName; // fully qualified name of type
    asCollection?: boolean;
    facets?: Facets;
    constraints?: Constraints;
}

export interface CaseCheck {
    value: string; // current value which should be checked for case issue
    proposedValue?: string; // proposed value found in dictionary
    lookupPath: string[]; // path to check for correct case, first segment determines cache, i.e. 'vocabularies'
    isNamespacedValue?: boolean; // if value represents name where last segment in lookupPath represents namespace
}

export interface CaseCheckBase {
    currentValue?: string;
    proposedValue?: string;
    caseCheck?: CaseCheck;
    caseIssue?: CaseIssue;
    value?: string;
}

export interface DiagnosticBaseWithOptionalRule<R extends RuleType = string, T = undefined> {
    severity: DiagnosticSeverity;
    message: string;
    quickFixes?: [];
    range: Range;
    rule?: R; // TODO: make it mandatory
    data?: T;
}

export interface DiagnosticBase<R extends RuleType, T = undefined> {
    severity: DiagnosticSeverity;
    message: string;
    quickFixes?: [];
    range: Range;
    rule: R;
    data: T;
}

export const NO_UNUSED_NAMESPACE_TYPE = 'no-unused-namespace';
export const NO_UNDEFINED_NAMESPACE_TYPE = 'no-undefined-namespace';
export const NAME_CASE_ISSUE_PATH_VALUE = 'name-case-issue-path-value';
export const MISSING_I18N_KEY = 'missing-i18n-key';
export const VALUE_REQUIRED = 'value-required';
export const NO_WHITESPACE_IN_PATH_EXPRESSION = 'no-whitespace-in-path-expression';
export const INCOMPLETE_EXPRESSION_CC_FORWARD_SLASH = 'incomplete-expression-cc-forward-slash';
export const INCOMPLETE_EXPRESSION_FORWARD_SLASH = 'incomplete-expression-forward-slash';
export const IGNORE_TARGET_VALIDATION = 'ignore-target-validation';
export const UNKNOWN_TERM = 'unknown-term';
export const UN_SUPPORTED_VOCABULARY = 'un-supported-vocabulary';
export const ATTRIBUTE_NOT_ALLOWED_HERE = 'attribute-not-allowed-here';
export const MISSING_REQUIRED_ATTRIBUTE = 'missing-required-attribute';
export const MISSING_REQUIRED_VALUE_FOR_ATTRIBUTE = 'missing-required-value-for-attribute';
export const TERM_NOT_APPLICABLE = 'term-not-applicable';
export const NOT_IN_APPLICABLE_TERMS_CONSTRAINT = 'not-in-applicable-terms-constraint';
export const RECORD_COLLECTION_PATH_NOT_ALLOWED = 'record-collection-path-not-allowed';
export const ODATA_FUNCTION_WRONG_RETURN_TYPE = 'odata-function-wrong-return-type';
export const IGNORE_DUPLICATE = 'ignore-duplicate';
export const INVALID_PATH_EXPRESSION = 'invlid-path-expression';
export const INVALID_ENUM_MEMBER_TYPE = 'unknown-enum-member';
export const INVALID_TYPE_TYPE = 'invalid-type';
export const NO_VALIDATION_FOR_SUBNODES = 'no-validation-subnodes';
export const INCOMPLETE_PATH_WITH_TYPE = 'incomplete-path-with-type';
export const INCOMPLETE_PATH_WITH_COMPATIBLE_TYPES = 'incomplete-path-with-compatible-types';
export const COMMON_CASE_ISSUE = 'common-case-issue';
export const ODATA_PATH_SEPARATOR_RULE = 'no-odata-path-separator';
export const INVALID_PRIMITIVE_TYPE = 'invalid-primitive-type';
export const DEPRECATED_$VALUE_SYNTAX = 'deprecated-$value-syntax';

export interface ReplacementData {
    value: string;
    proposedValue: string;
}

export interface CaseIssue {
    correct: string;
    wrong: string;
}

export interface NamespaceData {
    namespace: NamespaceString;
    alias?: Alias;
}
export interface NoUndefinedNamespaceData extends NamespaceData {
    referenceUri: string;
}

export interface I18nMissingKey {
    value: string;
    multilineType?: MultilineType;
}

export interface InvalidType {
    alias: string;
    name: string;
}

export type NoUndefinedNamespaceDiagnostic = DiagnosticBase<
    typeof NO_UNDEFINED_NAMESPACE_TYPE,
    NoUndefinedNamespaceData
>;

export type NoUnusedNamespaceDiagnostic = DiagnosticBase<typeof NO_UNUSED_NAMESPACE_TYPE, NamespaceData>;

export type NameCasePathValueDiagnostic = DiagnosticBase<typeof NAME_CASE_ISSUE_PATH_VALUE, CaseIssue>;

export type MissingI18nKeyDiagnostic = DiagnosticBase<typeof MISSING_I18N_KEY, I18nMissingKey>;
export type InvalidTypeDiagnostic = DiagnosticBase<typeof INVALID_TYPE_TYPE, InvalidType>;
export type ValueRequired = DiagnosticBase<typeof VALUE_REQUIRED, { name: string }>;
export type NoWhitespaceInPathExpression = DiagnosticBase<
    typeof NO_WHITESPACE_IN_PATH_EXPRESSION,
    { whitespaceRanges: Range[] }
>;
export type InvalidPrimitiveType = DiagnosticBase<typeof INVALID_PRIMITIVE_TYPE, { name: string }>;
export type NoVaidationForSubNodes = DiagnosticBase<typeof NO_VALIDATION_FOR_SUBNODES, { name: string }>;
export type IncompleteExpressionCCForwardSlash = DiagnosticBase<
    typeof INCOMPLETE_EXPRESSION_CC_FORWARD_SLASH,
    { name: ElementName | AttributeName }
>;
export type IncompleteExpressionForwardSlash = DiagnosticBase<
    typeof INCOMPLETE_EXPRESSION_FORWARD_SLASH,
    { name: ElementName | AttributeName }
>;
export type IgnoreTargetValidation = DiagnosticBase<typeof IGNORE_TARGET_VALIDATION>;
export type UnknowTerm = DiagnosticBase<typeof UNKNOWN_TERM, { name: string }>;
export type UnsupportedVocabulary = DiagnosticBase<typeof UN_SUPPORTED_VOCABULARY, { name: string }>;
export type AttributeNotAllowedHere = DiagnosticBase<typeof ATTRIBUTE_NOT_ALLOWED_HERE, { name: string }>;
export type MissingRequiredAttribute = DiagnosticBase<typeof MISSING_REQUIRED_ATTRIBUTE>;
export type MissingRequiredValueForAttribute = DiagnosticBase<typeof MISSING_REQUIRED_VALUE_FOR_ATTRIBUTE>;
export type TermNotApplicable = DiagnosticBase<
    typeof TERM_NOT_APPLICABLE,
    { name: string; wrong: string; correct: string }
>;
export type RecordCollectionPathNotAllowed = DiagnosticBase<
    typeof RECORD_COLLECTION_PATH_NOT_ALLOWED,
    { name: string; type: ValueType }
>;

export type OdataFunctionWrongReturnType = DiagnosticBase<
    typeof ODATA_FUNCTION_WRONG_RETURN_TYPE,
    { name: string; type: ValueType }
>;

export type IgnoreDuplicate = DiagnosticBase<typeof IGNORE_DUPLICATE>;

export type InvalidPathExpression = DiagnosticBase<
    typeof INVALID_PATH_EXPRESSION,
    {
        name: string;
        value: string;
    }
>;
export type InvalidEnumMember = DiagnosticBase<typeof INVALID_ENUM_MEMBER_TYPE, CaseCheckBase>;
export type IncompletePathWithType = DiagnosticBase<
    typeof INCOMPLETE_PATH_WITH_TYPE,
    {
        pathValue: string;
        abstractName: string;
        expectedType: string;
    }
>;
export type IncompletePathWithCompatibleTypes = DiagnosticBase<
    typeof INCOMPLETE_PATH_WITH_COMPATIBLE_TYPES,
    {
        pathValue: string;
        abstractName: string;
        expectedType: string;
        expressionName: string;
        isCollection: boolean;
    }
>;

export type ODataPathSeparatorDiagnostic = DiagnosticBase<typeof ODATA_PATH_SEPARATOR_RULE, ReplacementData>;

export type CommonCaseIssue = DiagnosticBase<typeof COMMON_CASE_ISSUE, CaseCheckBase>;
export type Deprecated$ValueSyntax = DiagnosticBase<typeof DEPRECATED_$VALUE_SYNTAX, { descriptionLink: string }>;

export type DiagnosticWithRule =
    | NoUndefinedNamespaceDiagnostic
    | NoUnusedNamespaceDiagnostic
    | NameCasePathValueDiagnostic
    | MissingI18nKeyDiagnostic
    | ValueRequired
    | NoWhitespaceInPathExpression
    | IncompleteExpressionCCForwardSlash
    | IncompleteExpressionForwardSlash
    | IgnoreTargetValidation
    | UnknowTerm
    | UnsupportedVocabulary
    | AttributeNotAllowedHere
    | MissingRequiredAttribute
    | MissingRequiredValueForAttribute
    | TermNotApplicable
    | RecordCollectionPathNotAllowed
    | OdataFunctionWrongReturnType
    | IgnoreDuplicate
    | InvalidPathExpression
    | InvalidTypeDiagnostic
    | NoVaidationForSubNodes
    | InvalidEnumMember
    | IncompletePathWithType
    | IncompletePathWithCompatibleTypes
    | CommonCaseIssue
    | ODataPathSeparatorDiagnostic
    | InvalidPrimitiveType
    | Deprecated$ValueSyntax;

export type ExtendedDiagnostic = DiagnosticBaseWithOptionalRule | DiagnosticWithRule;

export type RuleTypes = DiagnosticWithRule['rule'];

export type RuleType = RuleTypes | string;

export interface CompilerMessage {
    hasSyntaxErrors: boolean;
    messages: DiagnosticBaseWithOptionalRule[];
}
