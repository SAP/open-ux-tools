import type { CstNode, IToken, CstNodeLocation } from 'chevrotain';
import { Range, Position } from '@sap-ux/text-document-utils';

import type {
    Annotation,
    AnnotationGroup,
    AnnotationValue,
    Enum,
    Record,
    RecordProperty,
    Collection,
    StringLiteral,
    Assignment,
    Path,
    Identifier,
    Qualifier,
    AnnotationNode,
    Token,
    Separator,
    MultiLineStringLiteral,
    AstResult,
    Expression,
    Operator,
    UnsupportedOperatorExpression,
    IncorrectExpression
} from './annotation-ast-nodes';
import {
    ANNOTATION_TYPE,
    ANNOTATION_GROUP_TYPE,
    ANNOTATION_GROUP_ITEMS_TYPE,
    ENUM_TYPE,
    RECORD_TYPE,
    RECORD_PROPERTY_TYPE,
    COLLECTION_TYPE,
    BOOLEAN_TYPE,
    PATH_TYPE,
    STRING_LITERAL_TYPE,
    IDENTIFIER_TYPE,
    QUALIFIER_TYPE,
    EMPTY_VALUE_TYPE,
    NUMBER_LITERAL_TYPE,
    TOKEN_TYPE,
    QUOTED_LITERAL_TYPE,
    SEPARATOR_TYPE,
    MULTI_LINE_STRING_LITERAL_TYPE,
    OPERATOR_TYPE,
    Delimiter,
    UNSUPPORTED_OPERATOR_EXPRESSION_TYPE,
    INCORRECT_EXPRESSION_TYPE
} from './annotation-ast-nodes';
import { Visitor } from '../parser/factory';
import { buildExpression, operatorImageMap, operatorMap, rebuildNumberSigns } from './expressions';
import type {
    DeclarationChildren,
    AssignmentChildren,
    ValueChildren,
    EnumChildren,
    StructChildren,
    CollectionChildren,
    StringChildren,
    PathChildren,
    AssignmentCstNode,
    PathSegmentCstNode,
    CollectionValueChildren,
    MultiLineStringChildren,
    MultiLineStringStripIndentChildren,
    ExpressionChildren
} from '../parser/parser';
import { VocabularyService } from '@sap-ux/odata-vocabularies';
import { tokenMap } from '../parser/tokens';
import { copyPosition, copyRange } from './range';
import { hasItems, isDefined, hasNaNOrUndefined } from '../utils';

/**
 * Extracts qualifier part from term and adapt range and value for term.
 *
 * @param term Term node
 * @returns Qualifier node
 */
const createQualifier = (term: Path): Qualifier => {
    const segment = term.segments.find((item) => item.value.includes('#'));
    let qRange: Range | undefined;
    let qualifierValue = '';
    if (isDefined(segment)) {
        const tokens = segment.value.split('#');
        segment.value = tokens.shift() ?? '';
        qualifierValue = tokens.pop() ?? '';

        const len = qualifierValue.length;
        if (segment.range) {
            qRange = {
                start: { ...segment.range.end, character: segment.range.end.character - len },
                end: { ...segment.range.end }
            };
            segment.range.end.character = segment.range.end.character - len - 1;
        }
    }
    return {
        type: QUALIFIER_TYPE,
        value: qualifierValue,
        range: qRange
    };
};
const compareTokensByPosition = (a: IToken, b: IToken): number => {
    return a.startOffset - b.startOffset;
};
const adjustPosition = (position: Position, offset: Position): Position =>
    Position.create(
        position.line + offset.line,
        position.line === 0 ? position.character + offset.character : position.character
    );
export const locationToRange = (location?: CstNodeLocation): Range | undefined => {
    return location
        ? Range.create(
              location.startLine - 1,
              (location.startColumn ?? 0) - 1,
              (location.endLine ?? 0) - 1,
              location.endColumn ?? 0
          )
        : undefined;
};
const existsAndNotRecovered = (nodes: IToken[] | undefined): nodes is IToken[] =>
    hasItems(nodes) && !nodes[0]?.isInsertedInRecovery;
const vocabularyService = new VocabularyService(true, true);
const vocabularyAliases = [...vocabularyService.getVocabularies().values()].map(
    (vocabulary) => vocabulary.defaultAlias
);
const supportedVocabularyAliases = new Set([...vocabularyAliases, ...vocabularyService.cdsVocabulary.groupNames]);

const findNextToken = (tokens: IToken[], previousTokenEndOffset?: number): IToken | undefined => {
    const prevTokenIdx = tokens.findIndex((token) => token.endOffset === previousTokenEndOffset);
    return tokens[prevTokenIdx + 1];
};

/**
 *
 */
class CstToAstVisitor extends Visitor {
    tokenVector: IToken[] = [];
    startPosition?: Position;

    /**
     * Main visitor entry.
     *
     * @param cstNode CST node
     * @returns Result of the visitor call for the given cstNode
     */
    visit(cstNode: CstNode): AnnotationNode {
        return super.visit(cstNode, cstNode.location);
    }

    /**
     * Converts cst node location to range object.
     *
     * @param location CST node location
     * @returns Range object
     */
    locationToRange(location?: CstNodeLocation): Range | undefined {
        const range = locationToRange(location);
        if (this.startPosition && range) {
            return Range.create(
                adjustPosition(range.start, this.startPosition),
                adjustPosition(range.end, this.startPosition)
            );
        }
        return range;
    }

    /**
     * Converts given token to range object.
     *
     * @param token Token to convert
     * @returns Range object
     */
    tokenToRange(token: IToken): Range {
        const start = Position.create((token.startLine ?? 0) - 1, (token.startColumn ?? 0) - 1);
        const line = hasNaNOrUndefined(token.endLine) ? (token.startLine ?? 0) - 1 : (token.endLine ?? 0) - 1;
        const char = hasNaNOrUndefined(token.endColumn)
            ? (token.startColumn ?? 0) - 1 + token.image.length
            : token.endColumn ?? 0;
        const end = Position.create(line, char);
        if (this.startPosition) {
            return Range.create(adjustPosition(start, this.startPosition), adjustPosition(end, this.startPosition));
        }
        return Range.create(start, end);
    }

    /**
     * Converts CST token to AST token.
     *
     * @param token CST token
     * @returns AST token
     */
    createToken(token: IToken): Token {
        return {
            type: TOKEN_TYPE,
            value: token.image,
            range: this.tokenToRange(token)
        };
    }

    /**
     * Extracts qouted literal from the given cst token.
     *
     * @param context CST token
     * @returns String literal (without quotes)
     */
    getQuotedLiteralValue(context: IToken): string {
        return context.image.split("'")[1];
    }

    /**
     * Converts the given CST token to a path.
     *
     * @param identifier CST token
     * @returns Path object
     */
    pathFromIdentifier(identifier: IToken): Path {
        return {
            type: PATH_TYPE,
            value: identifier.image,
            segments: [
                {
                    type: IDENTIFIER_TYPE,
                    value: identifier.image,
                    range: this.tokenToRange(identifier)
                }
            ],
            separators: [],
            range: this.tokenToRange(identifier)
        };
    }

    /**
     * Converts given CST tokens to ast tokens. Used to convert comma tokens.
     *
     * @param parma Array of CST tokens
     * @returns Array of AST tokens
     */
    private getCommaToken(parma: IToken[] = []): Token[] {
        return parma.map((item) => ({
            type: TOKEN_TYPE,
            value: item.image,
            range: this.tokenToRange(item)
        }));
    }

    /**
     * Extracts qualifier from the given annotation assignment.
     *
     * @param assignment Annotation assignment
     * @returns Qualifier node or undefined if not found
     */
    private getQualifier(assignment: AssignmentChildren): Qualifier | undefined {
        if (!hasItems(assignment.NumberSign)) {
            return undefined;
        }
        const range = hasItems(assignment.NumberSign) ? this.tokenToRange(assignment.NumberSign[0]) : undefined;
        if (range) {
            // We need position after # symbol
            range.start.character++;
            range.end.character++;
        }
        const qualifier: Qualifier = {
            type: QUALIFIER_TYPE,
            value: '',
            range: range
        };
        if (hasItems(assignment.Identifier)) {
            if (qualifier.range) {
                qualifier.range.end = this.tokenToRange(assignment.Identifier[0]).end;
            }
            qualifier.value = assignment.Identifier[0].image;
        }
        return qualifier;
    }

    /**
     * Converts given assignment to top level annotation group ast node.
     *
     * @param path First segment of the path is used as group name
     * @param assignment Annotation assignment
     * @param location cst location
     * @returns Annotation group object
     */
    private toTopLevelAnnotationPathGroup(
        path: Path,
        assignment: AssignmentCstNode,
        location: CstNodeLocation
    ): AnnotationGroup {
        const items = (assignment.children.value?.[0].children.struct?.[0].children.assignment ?? []).map(
            (childAssignment, index, childAssignments) => {
                const annotation = this.visit(childAssignment) as Annotation;
                // check for specific situation where current child has no value and separating comma to next child is missing
                // then: current child value is represented by a path and next child path is empty
                const nextChildAssignment = index < childAssignments.length - 1 ? childAssignments[index + 1] : null;
                if (
                    nextChildAssignment &&
                    !nextChildAssignment.children.path &&
                    nextChildAssignment.children.Colon &&
                    nextChildAssignment.children.value &&
                    childAssignment.children.value[0].children.path
                ) {
                    // current child has no value (separating comma to next child is missing)
                    const start = this.tokenToRange(childAssignment.children.Colon[0]).end;
                    const end = this.locationToRange(childAssignment.children.value?.[0]?.location)?.start ?? start;
                    annotation.value = {
                        type: EMPTY_VALUE_TYPE,
                        range: Range.create(start, end)
                    };
                }
                return annotation;
            }
        );
        const commas: Token[] = this.getCommaToken(assignment.children.value?.[0].children?.struct?.[0].children.Comma);
        const ast: AnnotationGroup = {
            type: ANNOTATION_GROUP_TYPE,
            name: path.segments[0],
            items: {
                type: ANNOTATION_GROUP_ITEMS_TYPE,
                items,
                range: this.locationToRange(assignment.children.value?.[0]?.location),
                commas
            },
            range: this.locationToRange(location)
        };
        if (assignment.children.Colon?.length) {
            ast.colon = {
                type: TOKEN_TYPE,
                value: assignment.children.Colon[0].image,
                range: this.tokenToRange(assignment.children.Colon[0])
            };
        }
        if (assignment.children.value?.[0]?.children.struct) {
            const struct = assignment.children.value[0].children.struct[0];
            if (existsAndNotRecovered(struct.children.LCurly)) {
                ast.items.openToken = this.createToken(struct.children.LCurly[0]);
            }
            if (existsAndNotRecovered(struct.children.RCurly)) {
                ast.items.closeToken = this.createToken(struct.children.RCurly[0]);
            }
        }
        return ast;
    }

    /**
     * Creates colon token from the given assignment.
     *
     * @param assignment Assignment CST node
     * @returns Colon ast token or undefined if not found
     */
    private getColon(assignment: AssignmentCstNode): Token | undefined {
        if (assignment.children.Colon?.length) {
            return {
                type: TOKEN_TYPE,
                range: this.tokenToRange(assignment.children.Colon[0]),
                value: assignment.children.Colon[0].image
            };
        }
        return undefined;
    }

    /**
     * Converts given assignment to top level annotation path or annotation group path node.
     *
     * @param assignment Assignment to convert
     * @param location CST location
     * @returns Annotation or annotation group path node
     */
    private toTopLevelAnnotationPath(assignment: AssignmentCstNode, location: CstNodeLocation): AstResult {
        const path = this.visit(assignment.children.path[0]) as Path;
        if (path.segments.length !== 1 || (path.segments.length === 1 && !supportedVocabularyAliases.has(path.value))) {
            const ast: Annotation = {
                type: ANNOTATION_TYPE,
                term: path,
                range: this.locationToRange(location)
            };
            ast.colon = this.getColon(assignment);
            const qualifier = this.getQualifier(assignment.children);
            if (qualifier) {
                ast.qualifier = qualifier;
            }

            // Flattened qualifier syntax handling
            const qSegment = Math.min(
                supportedVocabularyAliases.has(path.segments[0].value) ? ast.term.segments.length - 1 : 0,
                1
            );
            if (!ast.qualifier && qSegment >= 0 && ast.term.segments[qSegment].value.includes('#')) {
                ast.qualifier = createQualifier(ast.term);
            }

            if (hasItems(assignment.children.value)) {
                ast.value = this.visit(assignment.children.value[0]) as AnnotationValue;
            }
            return ast;
        } else if (path.segments.length === 1 && supportedVocabularyAliases.has(path.value)) {
            return this.toTopLevelAnnotationPathGroup(path, assignment, location);
        }

        return undefined;
    }

    /**
     * Converts given assignment to top level annotation node.
     *
     * @param assignment Assignment to convert
     * @param location CST location
     * @returns Annotation ast node
     */
    private toTopLevelAnnotation(assignment: AssignmentCstNode, location: CstNodeLocation): AstResult {
        if (
            isDefined(assignment.location) &&
            isNaN(assignment.location.startOffset) &&
            assignment.recoveredNode === true
        ) {
            return undefined;
        }
        if (assignment.children.path) {
            return this.toTopLevelAnnotationPath(assignment, location);
        }
        if (assignment.children.value && assignment.children.Colon && !assignment.children.path) {
            const end = this.tokenToRange(assignment.children.Colon[0]).start;
            const start = isDefined(this.startPosition)
                ? { line: this.startPosition.line, character: this.startPosition.character }
                : end;
            const range = {
                start,
                end
            };
            const ast: Annotation = {
                type: ANNOTATION_TYPE,
                term: {
                    segments: [],
                    separators: [],
                    type: 'path',
                    value: '',
                    range
                },
                range: copyRange(range)
            };
            if (assignment.children.Colon?.length) {
                ast.colon = {
                    type: TOKEN_TYPE,
                    range: this.tokenToRange(assignment.children.Colon[0]),
                    value: assignment.children.Colon[0].image
                };
            }
            ast.qualifier = this.getQualifier(assignment.children);
            if (hasItems(assignment.children.value)) {
                ast.value = this.visit(assignment.children.value[0]) as AnnotationValue;
            }
            return ast;
        }
        return undefined;
    }

    /**
     * Creates declaration node.
     *
     * @param context CST declaration children
     * @param location CST location of the given context
     * @returns Declaration ast node or undefined if no items found in the context
     */
    declaration(context: DeclarationChildren, location: CstNodeLocation): Assignment | undefined {
        if (hasItems(context.assignment)) {
            return this.toTopLevelAnnotation(context.assignment[0], location);
        }
        return undefined;
    }

    /**
     * Converts number string image to number value.
     *
     * @param image String image of the number
     * @returns Converted number value or the given image itself if conversion couldn't be done
     */
    private numberValue(image: string): number | string {
        const num = Number.parseFloat(image || '0'); // not Number.parseInt() !
        if (Number.isSafeInteger(num) || (!Number.isNaN(num) && Number.isFinite(num))) {
            return num;
        }
        return image;
    }

    /**
     * Converts collection value node.
     *
     * @param context CST collection children
     * @param location CST location
     * @returns Collection annotation value node
     */
    collectionValue(context: CollectionValueChildren, location: CstNodeLocation): AnnotationValue | undefined {
        if (context.extendCollectionValue) {
            return undefined;
        }
        return this.value(context, location);
    }

    /**
     * Converts string value node.
     *
     * @param context CST value children
     * @returns String or multiline string literal or undefined if no item found
     */
    stringValue(context: ValueChildren): StringLiteral | MultiLineStringLiteral | undefined {
        if (hasItems(context.string)) {
            return this.visit(context.string[0]) as StringLiteral;
        }
        if (hasItems(context.multiLineStringStripIndent)) {
            return this.visit(context.multiLineStringStripIndent[0]) as MultiLineStringLiteral;
        }
        if (hasItems(context.multiLineString)) {
            return this.visit(context.multiLineString[0]) as MultiLineStringLiteral;
        }

        return undefined;
    }

    /**
     * Value converter subfunction which calls corresponding visitor for child element (if context permits).
     *
     * @param context Value children CST nodes
     * @returns Object with visitor call result and flag indicating that the visitor call took place
     */
    private valueNestedVisitor(context: ValueChildren): { result?: AnnotationValue; done: boolean } {
        if (hasItems(context.enum)) {
            return { done: true, result: this.visit(context.enum[0]) as Enum };
        }
        if (hasItems(context.struct)) {
            return { done: true, result: this.visit(context.struct[0]) as Record };
        }
        if (hasItems(context.collection)) {
            return { done: true, result: this.visit(context.collection[0]) as Collection };
        }
        if (hasItems(context.path)) {
            return { done: true, result: this.visit(context.path[0]) as Path };
        }
        if (hasItems(context.expression)) {
            return { done: true, result: this.visit(context.expression[0]) as Expression };
        }
        return { done: false };
    }

    /**
     * Value converter subfunction which converts primitive value (if context permits).
     *
     * @param context Value children CST nodes
     * @param location CST node location
     * @returns Object with result of the conversion and a flag indicating that the conversion took place
     */
    private primitiveValueConverter(
        context: ValueChildren,
        location: CstNodeLocation
    ): { result?: AnnotationValue; done: boolean } {
        if (
            hasItems(context.string) ||
            hasItems(context.multiLineStringStripIndent) ||
            hasItems(context.multiLineString)
        ) {
            return { done: true, result: this.stringValue(context) };
        }

        if (hasItems(context.Number)) {
            return {
                done: true,
                result: {
                    type: NUMBER_LITERAL_TYPE,
                    value: this.numberValue(context.Number[0].image),
                    range: this.locationToRange(location)
                }
            };
        }

        if (hasItems(context.False)) {
            return {
                done: true,
                result: {
                    type: BOOLEAN_TYPE,
                    value: false,
                    range: this.locationToRange(location)
                }
            };
        }

        if (hasItems(context.True)) {
            return {
                done: true,
                result: {
                    type: BOOLEAN_TYPE,
                    value: true,
                    range: this.locationToRange(location)
                }
            };
        }

        if (hasItems(context.Null)) {
            return {
                done: true,
                result: {
                    type: TOKEN_TYPE,
                    value: context.Null[0].image.toLowerCase(),
                    range: this.locationToRange(location)
                }
            };
        }

        if (hasItems(context.Binary)) {
            return {
                done: true,
                result: {
                    type: QUOTED_LITERAL_TYPE,
                    value: this.getQuotedLiteralValue(context.Binary[0]),
                    range: this.locationToRange(location),
                    kind: 'binary'
                }
            };
        }

        if (hasItems(context.Date)) {
            return {
                done: true,
                result: {
                    type: QUOTED_LITERAL_TYPE,
                    value: this.getQuotedLiteralValue(context.Date[0]),
                    range: this.locationToRange(location),
                    kind: 'date'
                }
            };
        }

        if (hasItems(context.Time)) {
            return {
                done: true,
                result: {
                    type: QUOTED_LITERAL_TYPE,
                    value: this.getQuotedLiteralValue(context.Time[0]),
                    range: this.locationToRange(location),
                    kind: 'time'
                }
            };
        }

        if (hasItems(context.Timestamp)) {
            return {
                done: true,
                result: {
                    type: QUOTED_LITERAL_TYPE,
                    value: this.getQuotedLiteralValue(context.Timestamp[0]),
                    range: this.locationToRange(location),
                    kind: 'timestamp'
                }
            };
        }

        return { done: false };
    }

    /**
     * Converts value children to value ast node.
     *
     * @param context CST value children
     * @param location CST location
     * @returns annotation value ast node or undefined if no items found
     */
    value(context: ValueChildren, location: CstNodeLocation): AnnotationValue | undefined {
        const nested = this.valueNestedVisitor(context);
        if (nested.done) {
            return nested.result;
        }

        const primitive = this.primitiveValueConverter(context, location);
        if (primitive.done) {
            return primitive.result;
        }

        if (!hasNaNOrUndefined(location.endOffset)) {
            // create empty value
            return {
                type: EMPTY_VALUE_TYPE,
                range: this.locationToRange(location)
            };
        }

        return undefined;
    }

    /**
     * Converts expression children to expression ast node.
     *
     * @param context CST expression children
     * @param location CST location
     * @returns Expression value ast node
     */
    expression(context: ExpressionChildren, location: CstNodeLocation): Expression {
        /**
         * Builds operator.
         *
         * @param operatorToken Operator CST token
         * @param range Token range
         * @returns Operator node
         */
        function buildOperator(operatorToken: IToken, range: Range): Operator {
            const operator: Operator = { type: OPERATOR_TYPE, value: operatorToken.image, range };
            return operator;
        }
        const openToken = existsAndNotRecovered(context.LParen) ? this.createToken(context.LParen[0]) : undefined;
        const closeToken = existsAndNotRecovered(context.RParen) ? this.createToken(context.RParen[0]) : undefined;
        const range = this.locationToRange(location);
        const operators = (context.Operator ?? []).map((token) => buildOperator(token, this.tokenToRange(token)));
        const operands = (context.value ?? []).map((token) => this.visit(token) as AnnotationValue);
        const expression = { operators, operands, openToken, closeToken, range };
        const unsupportedOperator = operators.find((operator) => {
            const operatorNames = operatorImageMap[operator.value.toUpperCase()];
            return operatorNames.length && !operatorNames.some((operatorName) => operatorMap[operatorName].edmName);
        });
        if (unsupportedOperator || !range) {
            const type = UNSUPPORTED_OPERATOR_EXPRESSION_TYPE;
            return { ...expression, type, unsupportedOperator } as UnsupportedOperatorExpression;
        }
        try {
            const protoExpression = rebuildNumberSigns({ operators, operands, range });
            const expression = buildExpression(protoExpression);
            if (range) {
                expression.range = range;
            }
            if (openToken) {
                expression.openToken = openToken;
            }
            if (closeToken) {
                expression.closeToken = closeToken;
            }
            return expression;
        } catch (e) {
            // expression did not follow grammar rules - return expression with empty operatorName
            return { ...expression, type: INCORRECT_EXPRESSION_TYPE, message: e.toString() } as IncorrectExpression;
        }
    }

    /**
     * Converts enum children to enum ast node.
     *
     * @param context CST enum children
     * @param location CST location
     * @returns Enum value ast node
     */
    enum(context: EnumChildren, location: CstNodeLocation): Enum {
        const range = this.locationToRange(location);
        if (range) {
            range.start.character++;
        }
        const path: Path =
            context.path?.length === 1
                ? (this.visit(context.path[0]) as Path)
                : {
                      type: PATH_TYPE,
                      value: '',
                      segments: [],
                      separators: [],
                      range
                  };
        return {
            type: ENUM_TYPE,
            path,
            range: this.locationToRange(location)
        };
    }

    /**
     * Converts string children to string ast node.
     *
     * @param context CST string children
     * @param location CST location
     * @returns String literal ast node
     */
    string(context: StringChildren, location: CstNodeLocation): StringLiteral {
        const range = this.locationToRange(location);
        const value = context.String?.length === 1 ? context.String[0].image : '';
        const ast: StringLiteral = {
            type: STRING_LITERAL_TYPE,
            value,
            range
        };
        if (existsAndNotRecovered(context.SingleQuote)) {
            ast.openToken = this.createToken(context.SingleQuote[0]);
        }
        if (existsAndNotRecovered(context.StringExit)) {
            ast.closeToken = this.createToken(context.StringExit[0]);
        }
        return ast;
    }

    /**
     * Converts multi line string children to ast node.
     *
     * @param context CST multi line string children
     * @param location CST location
     * @returns Multi line string literal ast node
     */
    multiLineString(context: MultiLineStringChildren, location: CstNodeLocation): MultiLineStringLiteral {
        const range = this.locationToRange(location);
        const value = context.MultiLineString?.length === 1 ? context.MultiLineString[0].image : '';
        const ast: MultiLineStringLiteral = {
            type: MULTI_LINE_STRING_LITERAL_TYPE,
            stripIndentation: false,
            value,
            range
        };
        if (existsAndNotRecovered(context.Backtick)) {
            ast.openToken = this.createToken(context.Backtick[0]);
        }
        if (existsAndNotRecovered(context.MultiLineStringExit)) {
            ast.closeToken = this.createToken(context.MultiLineStringExit[0]);
        }
        return ast;
    }

    /**
     * Converts multi line strip indent children to ast node.
     *
     * @param context CST multi line strip indent children
     * @param location CST location
     * @returns Multi line string literal ast node
     */
    multiLineStringStripIndent(
        context: MultiLineStringStripIndentChildren,
        location: CstNodeLocation
    ): MultiLineStringLiteral {
        const range = this.locationToRange(location);
        const value = context.MultiLineString?.length === 1 ? context.MultiLineString[0].image : '';
        const ast: MultiLineStringLiteral = {
            type: MULTI_LINE_STRING_LITERAL_TYPE,
            stripIndentation: true,
            value,
            range
        };
        if (existsAndNotRecovered(context.TripleBacktick)) {
            ast.openToken = this.createToken(context.TripleBacktick[0]);
        }
        if (existsAndNotRecovered(context.MultiLineStringStripIndentExit)) {
            ast.closeToken = this.createToken(context.MultiLineStringStripIndentExit[0]);
        }
        return ast;
    }

    /**
     * Converts collection children to ast node.
     *
     * @param context CST collection children
     * @param location CST location
     * @returns Collection ast node
     */
    collection(context: CollectionChildren, location: CstNodeLocation): Collection {
        const range = this.locationToRange(location);
        const commas: Token[] = this.getCommaToken(context?.Comma);
        const ast: Collection = {
            type: COLLECTION_TYPE,
            items: hasItems(context.collectionValue)
                ? context.collectionValue
                      .map((value) => this.visit(value) as AnnotationValue)
                      .filter((item) => item !== undefined)
                : [],
            range,
            commas
        };
        if (existsAndNotRecovered(context.LBracket)) {
            ast.openToken = this.createToken(context.LBracket[0]);
        }
        if (existsAndNotRecovered(context.RBracket)) {
            ast.closeToken = this.createToken(context.RBracket[0]);
        }
        return ast;
    }

    /**
     * Converts cst token to identifier ast node.
     *
     * @param token CST token
     * @param delimiter Quotation delimiter (none by default)
     * @returns Identifier ast node
     */
    private tokenToIdentifier(token: IToken, delimiter: Delimiter = Delimiter.none): Identifier {
        return {
            type: IDENTIFIER_TYPE,
            value: token.image,
            range: this.tokenToRange(token),
            quoted: delimiter !== Delimiter.none
        };
    }

    /**
     * Converts CST token to separator ast node.
     *
     * @param token CST token
     * @param delimiter Escaped value delimiter (none by default)
     * @returns Separator ast node
     */
    private tokenToSeparator(token: IToken, delimiter: Delimiter = Delimiter.none): Separator {
        return {
            type: SEPARATOR_TYPE,
            value: token.image,
            range: this.tokenToRange(token),
            escaped: delimiter !== Delimiter.none
        };
    }

    /**
     * Tries to recover identifier from one of given separator tokens (adjusts its range).
     *
     * @param identifier Identifier CST token
     * @param index Index of separator token to recover
     * @param separatorTokens Array with separator tokens
     * @returns Recovered from separator identifier or original identifier
     */
    private recoverIdentifiers(identifier: IToken, index: number, separatorTokens: IToken[] = []): IToken {
        const separator: IToken | undefined = separatorTokens[index - 1];
        const fromErrorRecovery: IToken | undefined =
            identifier.isInsertedInRecovery && separator
                ? // Adjust range so it is the next character after dot
                  this.identifierFromSeparatorToken(separator)
                : undefined;
        if (fromErrorRecovery) {
            return fromErrorRecovery;
        }
        return identifier;
    }

    /**
     * Converts separator CST token to identifier cst token.
     *
     * @param token Separator token
     * @returns Identifier CST token with empty image nd adjusted range
     */
    private identifierFromSeparatorToken(token: IToken): IToken {
        // Adjust range so it is the next character after separator
        return {
            image: '',
            startOffset: token.startOffset + 1,
            startLine: token.startLine,
            startColumn: (token.startColumn ?? 0) + 1,
            endOffset: token.endOffset,
            endLine: token.endLine,
            endColumn: token.endColumn,
            tokenType: tokenMap.Identifier,
            isInsertedInRecovery: true,
            tokenTypeIdx: tokenMap.Identifier.tokenTypeIdx ?? -1
        };
    }

    /**
     * Creates empty identifier st token.
     *
     * @param start Start CST token
     * @param end End CST token
     * @returns Empty identifier CST token
     */
    private createEmptyIdentifier(start: IToken, end: IToken): IToken {
        return {
            image: '',
            startOffset: (start.endOffset ?? 0) + 1,
            startLine: start.endLine,
            startColumn: (start.endColumn ?? 0) + 1,
            endOffset: end.startOffset - 1,
            endLine: end.startLine,
            endColumn: (end.startColumn ?? 0) - 1,
            tokenType: tokenMap.Identifier,
            isInsertedInRecovery: true,
            tokenTypeIdx: tokenMap.Identifier.tokenTypeIdx ?? -1
        };
    }

    /**
     * Extacts identifier tokens and delimiters from the given path segment cst node.
     *
     * @param segment Path segment node
     * @returns Array of objects consisting of identifier token and delimiter
     */
    private getIdentifierToken(segment: PathSegmentCstNode): { token: IToken; delimiter: Delimiter }[] {
        if (hasItems(segment.children.NumberSign)) {
            if (hasItems(segment.children.Identifier)) {
                segment.children.Identifier[0].image += '#';
            }
            if (hasItems(segment.children.Identifier) && segment.children.Identifier.length > 1) {
                segment.children.Identifier[0].image += segment.children.Identifier[1].image;
                segment = this.setNewRangeForIdentifier(segment, 1, 'Identifier');
            } else {
                segment = this.setNewRangeForIdentifier(segment, 0, 'NumberSign');
            }
            if (hasItems(segment.children.Identifier)) {
                return [
                    {
                        token: segment.children.Identifier[0],
                        delimiter: Delimiter.none
                    }
                ];
            }
        } else if (hasItems(segment.children.Identifier, 2)) {
            if (segment.children.Identifier[1].tokenTypeIdx === tokenMap.TermCastIdentifier.tokenTypeIdx) {
                segment.children.Identifier[0].image += segment.children.Identifier[1].image;
                segment = this.setNewRangeForIdentifier(segment, 1, 'Identifier');
            }
            if (hasItems(segment.children.Identifier)) {
                return [
                    {
                        token: segment.children.Identifier[0],
                        delimiter: Delimiter.none
                    }
                ];
            }
        }
        return (segment.children.Identifier ?? []).map((token) => ({
            token,
            delimiter: Delimiter.none
        }));
    }

    /**
     * Sets new range end for the identifier in the given path segment.
     *
     * @param segment Path segment CST node
     * @param index Index of an element within child grop to take range data from
     * @param key Key of the children group
     * @returns Updated path segment node
     */
    private setNewRangeForIdentifier(
        segment: PathSegmentCstNode,
        index: number,
        key: 'Identifier' | 'NumberSign'
    ): PathSegmentCstNode {
        if (hasItems(segment.children.Identifier)) {
            segment.children.Identifier[0].endColumn = segment.children[key]?.[index].endColumn;
            segment.children.Identifier[0].endLine = segment.children[key]?.[index].endLine;
            segment.children.Identifier[0].endOffset = segment.children[key]?.[index].endOffset;
        }
        return segment;
    }

    /**
     * Joins segment identifiers by given separators.
     *
     * @param segments Array with identifier tokens
     * @param separators Array with separator tokens
     * @returns String result
     */
    private joinSegments(segments: Identifier[], separators: Separator[]): string {
        let value = '';
        const remainingSeparators = [...separators];
        for (const segment of segments) {
            value += segment.value;
            const separator = remainingSeparators.shift();
            if (separator) {
                value += separator.value;
            }
        }
        return value;
    }

    /**
     * Converts path children to path ast node.
     *
     * @param context Path node children
     * @param location CST location
     * @returns Path AST node
     */
    path(context: PathChildren, location: CstNodeLocation): Path {
        const segments: Identifier[] = (context.pathSegment ?? [])
            .map((segment, i) => {
                const quotedIdentifiers =
                    segment.children.quotedIdentifier?.reduce(
                        (acc: { token: IToken; delimiter: Delimiter }[], quotedIdentifier) => {
                            return [
                                ...acc,
                                ...(quotedIdentifier.children.QuotedIdentifier || []).map((token, j) => ({
                                    token: this.recoverIdentifiers(
                                        token,
                                        j,
                                        quotedIdentifier.children.PathSegmentSeparator ?? []
                                    ),
                                    delimiter: Delimiter.quoted
                                }))
                            ];
                        },
                        []
                    ) ?? [];
                const delimitedIdentifiers = (
                    segment.children.delimitedIdentifier?.reduce(
                        (acc: { token: IToken; delimiter: Delimiter }[], delimitedIdentifier) => {
                            if (!delimitedIdentifier.children.DelimitedIdentifier) {
                                return [
                                    ...acc,
                                    {
                                        token: this.createEmptyIdentifier(
                                            delimitedIdentifier.children.IdentifierStart[0],
                                            delimitedIdentifier.children.DelimitedIdentifierExit[0]
                                        ),
                                        delimiter: Delimiter.exclamationSquareBrackets
                                    }
                                ];
                            }
                            return [
                                ...acc,
                                ...(delimitedIdentifier.children.DelimitedIdentifier || []).map((token, j) => ({
                                    token: this.recoverIdentifiers(
                                        token,
                                        j,
                                        delimitedIdentifier.children.PathSegmentSeparator ?? []
                                    ),
                                    delimiter: Delimiter.exclamationSquareBrackets
                                }))
                            ];
                        },
                        []
                    ) ?? []
                ).map((identifier) => identifier);
                const separator: IToken | undefined = (context.PathSegmentSeparator ?? [])[i - 1];
                const fromErrorRecovery: { token: IToken; delimiter: Delimiter }[] =
                    segment.recoveredNode && separator
                        ? [{ token: this.identifierFromSeparatorToken(separator), delimiter: Delimiter.none }]
                        : [];
                const identifiers = this.getIdentifierToken(segment);
                return [...identifiers, ...quotedIdentifiers, ...delimitedIdentifiers, ...fromErrorRecovery];
            })
            .reduce((acc, allSegments) => [...acc, ...allSegments], [])
            .sort((a, b) => compareTokensByPosition(a.token, b.token))
            .map(({ token, delimiter }) => this.tokenToIdentifier(token, delimiter));
        const separators: Separator[] = [
            ...(context.pathSegment ?? []).map((segment) => {
                const quotedIdentifiers =
                    segment.children.quotedIdentifier?.reduce(
                        (acc: { token: IToken; delimiter: Delimiter }[], quotedIdentifier) => {
                            const childrenSeparators = quotedIdentifier.children.PathSegmentSeparator ?? [];
                            return [
                                ...acc,
                                ...childrenSeparators.map((token) => ({
                                    token,
                                    delimiter: Delimiter.quoted
                                }))
                            ];
                        },
                        []
                    ) ?? [];
                const delimitedIdentifiers =
                    segment.children.delimitedIdentifier?.reduce(
                        (acc: { token: IToken; delimiter: Delimiter }[], delimitedIdentifier) => {
                            if (!delimitedIdentifier.children.DelimitedIdentifier) {
                                return [
                                    ...acc,
                                    {
                                        token: this.createEmptyIdentifier(
                                            delimitedIdentifier.children.IdentifierStart[0],
                                            delimitedIdentifier.children.DelimitedIdentifierExit[0]
                                        ),
                                        delimiter: Delimiter.exclamationSquareBrackets
                                    }
                                ];
                            }
                            const childrenSeparators = delimitedIdentifier.children.PathSegmentSeparator ?? [];

                            return [
                                ...acc,
                                ...childrenSeparators.map((token) => ({
                                    token,
                                    delimiter: Delimiter.exclamationSquareBrackets
                                }))
                            ];
                        },
                        []
                    ) ?? [];
                return [...quotedIdentifiers, ...delimitedIdentifiers];
            }),
            (context.PathSegmentSeparator ?? []).map((token) => ({
                token,
                delimiter: Delimiter.none
            }))
        ]
            .reduce((acc, allSegments) => [...acc, ...allSegments], [])
            .sort((a, b) => compareTokensByPosition(a.token, b.token))
            .map(({ token, delimiter }) => this.tokenToSeparator(token, delimiter));

        const range = this.locationToRange(location);
        return {
            type: PATH_TYPE,
            value: this.joinSegments(segments, separators),
            segments,
            separators,
            range
        };
    }

    /**
     * Extracts record property or embedded annotation from given record assignment.
     *
     * @param assignment Record assignment
     * @returns Property data
     */
    private getRecordProperty(assignment: AssignmentCstNode): {
        property: RecordProperty | Annotation;
        kind: 'annotation' | 'property';
    } {
        const assignmentRange = this.locationToRange(assignment.location);
        const name = this.getAssignmentKey(assignment.children, assignmentRange);
        let property: RecordProperty | Annotation;
        if (name.value.startsWith('@')) {
            property = {
                type: ANNOTATION_TYPE,
                term: name,
                value: hasItems(assignment.children.value)
                    ? (this.visit(assignment.children.value[0]) as AnnotationValue)
                    : undefined,
                range: assignmentRange
            };
            if (name.segments.length > 1 && name.segments[1].value.includes('#')) {
                property.qualifier = createQualifier(name);
                property.term.value = name.value.split('#')[0];
            } else if (hasItems(assignment.children.NumberSign)) {
                property.qualifier = this.getQualifier(assignment.children);
            }

            return { property, kind: 'annotation' };
        }

        property = {
            type: RECORD_PROPERTY_TYPE,
            name,
            value: hasItems(assignment.children.value)
                ? (this.visit(assignment.children.value[0]) as AnnotationValue)
                : undefined,
            range: assignmentRange
        };
        return { property, kind: 'property' };
    }

    /**
     * Converts structure children to ast record node.
     *
     * @param context CST structure children
     * @param location CST location
     * @returns AST record node
     */
    struct(context: StructChildren, location: CstNodeLocation): Record {
        const range = this.locationToRange(location);
        const { properties: allProperties, annotations: allAnnotations } = (context.assignment ?? [])
            .filter((assignment) => {
                return hasItems(assignment.children.path) || hasItems(assignment.children.value);
            })
            .reduce(
                (
                    { annotations, properties }: { properties: RecordProperty[]; annotations: Annotation[] },
                    assignment,
                    assignmentIndex,
                    assignments
                ): { properties: RecordProperty[]; annotations: Annotation[] } => {
                    const { property, kind } = this.getRecordProperty(assignment);
                    if (kind === 'annotation') {
                        annotations.push(property as Annotation);
                    } else {
                        properties.push(property as RecordProperty);
                    }
                    if (
                        hasItems(assignment.children.Colon) &&
                        (!hasItems(assignment.children.value) ||
                            hasNaNOrUndefined(assignment.children.value[0]?.location?.startOffset))
                    ) {
                        this.recoverFromMissingValue(assignment.children.Colon[0], property);
                    } else if (
                        assignment.children?.value &&
                        assignment.children?.value.length &&
                        assignment.children.value[0]?.children?.path &&
                        assignments[assignmentIndex + 1] &&
                        !assignments[assignmentIndex + 1].children?.path
                    ) {
                        // missing value and comma: path for next property has been wrongly consumed as value for current property
                        const start = this.tokenToRange(assignment.children.Colon[0]).end;
                        const end = this.locationToRange(assignment.children.value[0].location)?.start;
                        property.value = {
                            type: EMPTY_VALUE_TYPE,
                            range: Range.create(start, end ?? start)
                        };
                    }
                    property.colon = this.getColon(assignment);
                    return { properties, annotations };
                },
                { annotations: [], properties: [] }
            );
        const commas: Token[] = this.getCommaToken(context?.Comma);
        const ast: Record = {
            type: RECORD_TYPE,
            properties: allProperties,
            range,
            commas
        };

        if (allAnnotations.length) {
            ast.annotations = allAnnotations;
        }
        if (existsAndNotRecovered(context.LCurly)) {
            ast.openToken = this.createToken(context.LCurly[0]);
        }
        if (existsAndNotRecovered(context.RCurly)) {
            ast.closeToken = this.createToken(context.RCurly[0]);
        }
        return ast;
    }

    /**
     * Converts annotation assignment children to annotation ast node.
     *
     * @param context CST annotation assignment children
     * @param location CST location
     * @returns Annotation AST node
     */
    assignment(context: AssignmentChildren, location: CstNodeLocation): Annotation {
        const range = this.locationToRange(location);
        const ast: Annotation = {
            type: ANNOTATION_TYPE,
            term: this.getAssignmentKey(context, range),
            range
        };

        if (context.Colon?.length) {
            ast.colon = {
                type: TOKEN_TYPE,
                value: context.Colon[0].image,
                range: this.tokenToRange(context.Colon[0])
            };
        }
        if (hasItems(context.NumberSign)) {
            ast.qualifier = this.getQualifier(context);
        }

        // Flattened qualifier syntax handling
        if (!ast.qualifier && ast.term.segments.length && ast.term.segments[0].value.includes('#')) {
            ast.qualifier = createQualifier(ast.term);
        }

        if (hasItems(context.value) && !hasNaNOrUndefined(context.value[0]?.location?.startOffset)) {
            ast.value = this.visit(context.value[0]) as AnnotationValue;
        } else if (hasItems(context.Colon)) {
            this.recoverFromMissingValue(context.Colon[0], ast);
        }
        return ast;
    }

    /**
     * Extracts assignment key.
     *
     * @param context CST assignment children
     * @param range CST range
     * @returns Empty path AST node
     */
    private getAssignmentKey(context: AssignmentChildren, range?: Range): Path {
        if (hasItems(context.path)) {
            return this.visit(context.path[0]) as Path;
        }
        const end = hasItems(context.NumberSign)
            ? this.tokenToRange(context.NumberSign[0]).start
            : this.tokenToRange(context.Colon[0]).start;
        const start = range ? copyPosition(range.start) : end;
        return {
            type: PATH_TYPE,
            segments: [],
            separators: [],
            value: '',
            range: Range.create(start, end)
        };
    }

    /**
     * Recovers annotation or record property node when value is missng - sets up an empty value.
     *
     * @param colonToken Colon cst token
     * @param ast Annotation or property ast node
     */
    private recoverFromMissingValue(colonToken: IToken, ast: Annotation | RecordProperty): void {
        // adjust range
        const nextToken = findNextToken(this.tokenVector, colonToken.endOffset);
        if ((nextToken?.image === ',' || nextToken?.image === '}') && nextToken?.startColumn) {
            if (ast.range) {
                // annotation range should end before comma
                ast.range.end = this.tokenToRange(nextToken).start;
            }
            // Error recovery, insert PATH node
            const colonRange = this.tokenToRange(colonToken);
            const nextTokenRange = this.tokenToRange(nextToken);
            ast.value = {
                type: EMPTY_VALUE_TYPE,
                range: Range.create(colonRange.end, nextTokenRange.start)
            };
        }
    }
}

const AstBuilder = new CstToAstVisitor();

export const buildAst = (cst: CstNode, tokenVector: IToken[], startPosition?: Position): AstResult => {
    AstBuilder.tokenVector = tokenVector;
    AstBuilder.startPosition = startPosition;
    const root = AstBuilder.visit(cst);

    if (root && (root.type === ANNOTATION_TYPE || root.type === ANNOTATION_GROUP_TYPE)) {
        return root;
    }

    return undefined;
};
