import type { IOrAlt, CstNode, TokenType, IToken, SubruleMethodOpts, MismatchedTokenException } from 'chevrotain';
import { CstParser, EOF } from 'chevrotain';
import { hasItems, isDefined } from '../utils';
import type {
    PATH_SEGMENT_SEPARATOR_TOKEN_TYPE,
    COLON_TOKEN_TYPE,
    COMMA_TOKEN_TYPE,
    NUMBER_SIGN_TOKEN_TYPE,
    DELIMITED_IDENTIFIER_EXIT_TOKEN_TYPE,
    IDENTIFIER_START_TOKEN_TYPE,
    QUOTED_IDENTIFIER_EXIT_TOKEN_TYPE,
    TRUE_TOKEN_TYPE,
    FALSE_TOKEN_TYPE,
    NUMBER_TOKEN_TYPE,
    SINGLE_QUOTE_TOKEN_TYPE,
    STRING_TOKEN_TYPE,
    STRING_EXIT_TOKEN_TYPE,
    QUOTED_IDENTIFIER_TOKEN_TYPE,
    DELIMITED_IDENTIFIER_TOKEN_TYPE,
    L_CURLY_TOKEN_TYPE,
    L_BRACKET_TOKEN_TYPE,
    R_BRACKET_TOKEN_TYPE,
    R_CURLY_TOKEN_TYPE,
    NULL_TOKEN_TYPE,
    BINARY_TOKEN_TYPE,
    DATE_TOKEN_TYPE,
    TIME_TOKEN_TYPE,
    TIMESTAMP_TOKEN_TYPE,
    SPREAD_OPERATOR,
    UP_TO_KEYWORD,
    BACKTICK_TOKEN_TYPE,
    TRIPLE_BACKTICK_TOKEN_TYPE,
    MULTI_LINE_STRING_TOKEN_TYPE,
    MULTI_LINE_STRING_EXIT_TOKEN_TYPE,
    MULTI_LINE_STRING_STRIP_INDENT_EXIT_TOKEN_TYPE,
    L_PAREN_TOKEN_TYPE,
    R_PAREN_TOKEN_TYPE,
    OPERATOR
} from './tokens';
import { IDENTIFIER_TOKEN_TYPE, tokenMap } from './tokens';

const allTokens = Object.values(tokenMap);

const DECLARATION_TYPE = 'declaration';
const PATH_TYPE = 'path';
const PATH_SEGMENT_TYPE = 'pathSegment';
const ASSIGNMENT_TYPE = 'assignment';
const STRUCT_TYPE = 'struct';
const COLLECTION_TYPE = 'collection';
const ENUM_TYPE = 'enum';
const STRING_TYPE = 'string';
const MULTI_LINE_STRING_TYPE = 'multiLineString';
const MULTI_LINE_STRING_STRIP_INDENT_TYPE = 'multiLineStringStripIndent';
const QUOTED_IDENTIFIER_TYPE = 'quotedIdentifier';
const DELIMITED_IDENTIFIER_TYPE = 'delimitedIdentifier';
const VALUE_TYPE = 'value';
const COLLECTION_VALUE_TYPE = 'collectionValue';
const EXTEND_COLLECTION_VALUE_TYPE = 'extendCollectionValue';
const EXPRESSION_TYPE = 'expression';

export interface DeclarationCstNode extends CstNode {
    name: typeof DECLARATION_TYPE;
    children: DeclarationChildren;
}

export type DeclarationChildren = {
    [ASSIGNMENT_TYPE]?: AssignmentCstNode[];
};

export interface PathCstNode extends CstNode {
    name: typeof PATH_TYPE;
    children: PathChildren;
}

export type PathChildren = {
    [PATH_SEGMENT_SEPARATOR_TOKEN_TYPE]?: IToken[];
    [PATH_SEGMENT_TYPE]?: PathSegmentCstNode[];
};

export interface PathSegmentCstNode extends CstNode {
    name: typeof PATH_SEGMENT_TYPE;
    children: PathSegmentChildren;
}

export type PathSegmentChildren = {
    [NUMBER_SIGN_TOKEN_TYPE]?: IToken[];
    [IDENTIFIER_TOKEN_TYPE]?: IToken[];
    [DELIMITED_IDENTIFIER_TYPE]?: DelimitedIdentifierCstNode[];
    [QUOTED_IDENTIFIER_TYPE]?: QuotedIdentifierCstNode[];
};

export type AssignmentChildren = {
    [PATH_TYPE]: PathCstNode[];
    [NUMBER_SIGN_TOKEN_TYPE]?: IToken[];
    [IDENTIFIER_TOKEN_TYPE]?: IToken[];
    [VALUE_TYPE]: ValueCstNode[];
    [COLON_TOKEN_TYPE]: IToken[];
};

export interface AssignmentCstNode extends CstNode {
    name: typeof ASSIGNMENT_TYPE;
    children: AssignmentChildren;
}

export type StructChildren = {
    [L_CURLY_TOKEN_TYPE]?: IToken[];
    [R_CURLY_TOKEN_TYPE]?: IToken[];
    [ASSIGNMENT_TYPE]?: AssignmentCstNode[];
    [COMMA_TOKEN_TYPE]?: IToken[];
};

export interface StructCstNode extends CstNode {
    name: typeof STRUCT_TYPE;
    children: StructChildren;
}

export type CollectionChildren = {
    [COLLECTION_VALUE_TYPE]?: CollectionValueCstNode[];
    [COMMA_TOKEN_TYPE]?: IToken[];
    [L_BRACKET_TOKEN_TYPE]?: IToken[];
    [R_BRACKET_TOKEN_TYPE]?: IToken[];
};

export interface CollectionCstNode extends CstNode {
    name: typeof COLLECTION_TYPE;
    children: CollectionChildren;
}

export type EnumChildren = {
    [PATH_TYPE]?: PathCstNode[];
    [NUMBER_SIGN_TOKEN_TYPE]: IToken[];
};

export interface EnumCstNode extends CstNode {
    name: typeof ENUM_TYPE;
    children: EnumChildren;
}

export type StringChildren = {
    [SINGLE_QUOTE_TOKEN_TYPE]: IToken[];
    [STRING_TOKEN_TYPE]?: IToken[];
    [STRING_EXIT_TOKEN_TYPE]: IToken[];
};

export interface StringCstNode extends CstNode {
    name: typeof STRING_TYPE;
    children: StructChildren;
}
export type MultiLineStringChildren = {
    [BACKTICK_TOKEN_TYPE]: IToken[];
    [MULTI_LINE_STRING_TOKEN_TYPE]?: IToken[];
    [MULTI_LINE_STRING_EXIT_TOKEN_TYPE]: IToken[];
};
export interface MultiLineStringCstNode extends CstNode {
    name: typeof MULTI_LINE_STRING_TYPE;
    children: MultiLineStringChildren;
}
export type MultiLineStringStripIndentChildren = {
    [TRIPLE_BACKTICK_TOKEN_TYPE]: IToken[];
    [MULTI_LINE_STRING_TOKEN_TYPE]?: IToken[];
    [MULTI_LINE_STRING_STRIP_INDENT_EXIT_TOKEN_TYPE]: IToken[];
};
export interface MultiLineStringStripIndentCstNode extends CstNode {
    name: typeof MULTI_LINE_STRING_TYPE;
    children: MultiLineStringStripIndentChildren;
}

export type DelimitedIdentifierChildren = {
    [PATH_SEGMENT_SEPARATOR_TOKEN_TYPE]?: IToken[];
    [DELIMITED_IDENTIFIER_TOKEN_TYPE]: IToken[];
    [DELIMITED_IDENTIFIER_EXIT_TOKEN_TYPE]: IToken[];
    [IDENTIFIER_START_TOKEN_TYPE]: IToken[];
};
export interface DelimitedIdentifierCstNode extends CstNode {
    name: typeof DELIMITED_IDENTIFIER_TYPE;
    children: DelimitedIdentifierChildren;
}

export type QuotedIdentifierChildren = {
    [PATH_SEGMENT_SEPARATOR_TOKEN_TYPE]?: IToken[];
    [QUOTED_IDENTIFIER_TOKEN_TYPE]: IToken[];
    [QUOTED_IDENTIFIER_EXIT_TOKEN_TYPE]: IToken[];
};

export interface QuotedIdentifierCstNode extends CstNode {
    name: typeof QUOTED_IDENTIFIER_TYPE;
    children: QuotedIdentifierChildren;
}

export type ValueChildren = {
    [NULL_TOKEN_TYPE]?: IToken[];
    [TRUE_TOKEN_TYPE]?: IToken[];
    [FALSE_TOKEN_TYPE]?: IToken[];
    [BINARY_TOKEN_TYPE]?: IToken[];
    [DATE_TOKEN_TYPE]?: IToken[];
    [TIME_TOKEN_TYPE]?: IToken[];
    [TIMESTAMP_TOKEN_TYPE]?: IToken[];
    [NUMBER_TOKEN_TYPE]?: IToken[];
    [STRUCT_TYPE]?: StructCstNode[];
    [COLLECTION_TYPE]?: CollectionCstNode[];
    [ENUM_TYPE]?: EnumCstNode[];
    [STRING_TYPE]?: StringCstNode[];
    [MULTI_LINE_STRING_TYPE]?: MultiLineStringCstNode[];
    [MULTI_LINE_STRING_STRIP_INDENT_TYPE]?: MultiLineStringStripIndentCstNode[];
    [PATH_TYPE]?: PathCstNode[];
    [QUOTED_IDENTIFIER_TYPE]?: QuotedIdentifierCstNode[];
    [DELIMITED_IDENTIFIER_TYPE]?: DelimitedIdentifierCstNode[];
    [EXPRESSION_TYPE]?: ExpressionCstNode[];
};

export interface ValueCstNode extends CstNode {
    name: typeof VALUE_TYPE;
    children: ValueChildren;
}

export type ExtendCollectionValueChildren = {
    [SPREAD_OPERATOR]: IToken[];
    [UP_TO_KEYWORD]?: IToken[];
    [VALUE_TYPE]?: ValueCstNode[];
};

export interface ExtendCollectionValueCstNode extends CstNode {
    name: typeof EXTEND_COLLECTION_VALUE_TYPE;
    children: ExtendCollectionValueChildren;
}

export type CollectionValueChildren = ValueChildren & {
    [EXTEND_COLLECTION_VALUE_TYPE]?: ExtendCollectionValueCstNode[];
};

export interface CollectionValueCstNode extends CstNode {
    name: typeof COLLECTION_VALUE_TYPE;
    children: CollectionValueChildren;
}

export interface ExpressionCstNode extends CstNode {
    name: typeof EXPRESSION_TYPE;
    children: ExpressionChildren;
}

export type ExpressionChildren = {
    [L_PAREN_TOKEN_TYPE]: IToken[];
    [R_PAREN_TOKEN_TYPE]?: IToken[];
    [VALUE_TYPE]?: ValueCstNode[];
    [OPERATOR]?: IToken[];
};

const LINE_BREAK_PATTERN = /\r\n|\r|\n/g;

/**
 *
 */
export class AnnotationParser extends CstParser {
    deletionRecoveryEnabled = true;
    /**
     * Array caching optimization for collection values
     * https://chevrotain.io/docs/guide/performance.html#caching-arrays-of-alternatives
     */
    cv?: IOrAlt<void>[];
    /**
     * Array caching optimization for values
     * https://chevrotain.io/docs/guide/performance.html#caching-arrays-of-alternatives
     */
    v?: IOrAlt<void>[];
    private CST_STACK: AssignmentCstNode[] = [];

    text = '';
    constructor() {
        super(allTokens, {
            maxLookahead: 1,
            recoveryEnabled: true,
            nodeLocationTracking: 'full',
            // This could reduce 30-50% of the initialization time
            // Enable validation for debugging
            skipValidations: true
        });
        this.performSelfAnalysis();
    }

    createOrSubruleEntry = (rule: (idx: number) => CstNode, options?: SubruleMethodOpts): IOrAlt<void> => ({
        ALT: (): void => {
            this.SUBRULE(rule, options);
        }
    });

    createOrConsumeEntry = (token: TokenType, gate?: () => boolean): IOrAlt<void> => ({
        ALT: (): void => {
            this.CONSUME(token);
        },
        GATE: gate
    });

    /**
     * Checks if recovery could be done for the given expected token type.
     *
     * @param expectedTokType expected token type
     * @returns boolean result
     */
    canRecoverWithSingleTokenDeletion(expectedTokType: TokenType): boolean {
        if (this.deletionRecoveryEnabled === false) {
            return false;
        }
        // We need to override the default logic for recovery with single token deletion.
        // Sometimes we need to completely disable it to produce better CST
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return super['canRecoverWithSingleTokenDeletion'](expectedTokType);
    }

    /**
     *
     * @param endToken Ending CST token type
     * @param repetitionRule Repetition rule function
     */
    CUSTOM_MANY(endToken: TokenType, repetitionRule: (idxInCallingRule?: number, ...args: any[]) => CstNode): void {
        this.MANY(() => {
            // workaround for https://github.com/SAP/chevrotain/issues/1200 once it is fixed we can use empty alternative
            this.OR([
                {
                    GATE: (): boolean =>
                        this.LA(1).tokenType === tokenMap.Comma &&
                        (this.LA(2).tokenType === endToken || this.LA(2).tokenType === tokenMap.Comma),
                    ALT: (): IToken => this.CONSUME2(tokenMap.Comma)
                },
                {
                    GATE: (): boolean => this.LA(1).tokenType === tokenMap.Comma && this.LA(2).tokenType !== endToken,
                    ALT: (): void => {
                        this.CONSUME3(tokenMap.Comma);
                        this.SUBRULE(repetitionRule);
                    }
                },
                {
                    ALT: (): CstNode => this.SUBRULE1(repetitionRule)
                }
            ]);
        });
    }

    /**
     *
     * @param previousToken Previous CST token
     */
    private adjustAssignmentRange(previousToken: IToken): void {
        // adjust location since value is missing
        const node: AssignmentCstNode = this['CST_STACK'][this['CST_STACK'].length - 1];
        if (node && previousToken && node.location) {
            // token length is not taken into account for position information
            const length = previousToken.image.length;
            node.location.startOffset = (previousToken.endOffset ?? 0) + length;
            node.location.startLine = previousToken.endLine ?? 0;
            node.location.startColumn = (previousToken.endColumn ?? 0) + length;
        }
    }

    [DECLARATION_TYPE] = this.RULE(DECLARATION_TYPE, () => {
        this.SUBRULE(this[ASSIGNMENT_TYPE]);
    });

    [ASSIGNMENT_TYPE] = this.RULE(ASSIGNMENT_TYPE, () => {
        this.OR([
            {
                GATE: (): boolean => this.LA(1).tokenType === tokenMap.Colon,
                ALT: (): void => {
                    // key is missing, but there is colon
                    const previousToken = this.LA(0);
                    this.CONSUME(tokenMap.Colon);
                    this.SUBRULE(this[VALUE_TYPE]);
                    this.adjustAssignmentRange(previousToken);
                }
            },
            {
                GATE: (): boolean => this.LA(1).tokenType === tokenMap.NumberSign,
                ALT: (): void => {
                    // Avoid removing number sign if path is missing e.g '#q: 1'
                    const previousToken = this.LA(0);
                    this.CONSUME(tokenMap.NumberSign);
                    this.CONSUME(tokenMap.Identifier);
                    this.OPTION(() => {
                        this.CONSUME1(tokenMap.Colon);
                        this.SUBRULE1(this[VALUE_TYPE]);
                    });
                    this.adjustAssignmentRange(previousToken);
                }
            },
            {
                ALT: (): void => {
                    try {
                        this.deletionRecoveryEnabled = false;
                        this.SUBRULE(this[PATH_TYPE]);
                    } finally {
                        this.deletionRecoveryEnabled = true;
                    }

                    this.OPTION1(() => {
                        this.CONSUME1(tokenMap.NumberSign);
                        this.CONSUME1(tokenMap.Identifier);
                    });
                    this.OPTION2(() => {
                        this.CONSUME2(tokenMap.Colon);
                        try {
                            this.SUBRULE2(this[VALUE_TYPE]);
                        } catch (error) {
                            const isMismatchedTokenException = (err: any): err is MismatchedTokenException => {
                                return (
                                    err?.name === 'NoViableAltException' &&
                                    err?.previousToken?.tokenType === tokenMap.Colon &&
                                    err?.token?.tokenType === EOF
                                );
                            };
                            if (isMismatchedTokenException(error)) {
                                this.recoverFromMissingKey(error);
                            } else {
                                // we have to rethrow error if we do not handle, so chevrotain error recovery can try to handle it
                                throw error;
                            }
                        }
                    });
                }
            }
        ]);
    });

    [PATH_TYPE] = this.RULE(PATH_TYPE, (valuePath: boolean) => {
        this.SUBRULE(this[PATH_SEGMENT_TYPE], { ARGS: [valuePath] });
        this.MANY(() => {
            this.CONSUME(tokenMap.PathSegmentSeparator);
            try {
                // Avoid removing trailing dots e.g 'aaa.' would be parsed as 'aaa'
                this.deletionRecoveryEnabled = false;
                this.SUBRULE2(this[PATH_SEGMENT_TYPE], { ARGS: [valuePath] });
            } finally {
                this.deletionRecoveryEnabled = true;
            }
        });
    });

    [PATH_SEGMENT_TYPE] = this.RULE(PATH_SEGMENT_TYPE, (valuePath: boolean) => {
        this.OR({
            DEF: [
                this.createOrSubruleEntry(this[DELIMITED_IDENTIFIER_TYPE]),
                this.createOrSubruleEntry(this[QUOTED_IDENTIFIER_TYPE]),
                this.createOrConsumeEntry(tokenMap.Identifier),
                {
                    ALT: (): void => {
                        this.CONSUME(tokenMap.TermCastIdentifier, { LABEL: IDENTIFIER_TOKEN_TYPE });
                    },
                    GATE: (): boolean => valuePath
                }
            ]
        });
        this.OPTION({
            GATE: () => valuePath,
            DEF: () => {
                this.CONSUME2(tokenMap.TermCastIdentifier, { LABEL: IDENTIFIER_TOKEN_TYPE });
            }
        });
        this.OPTION2({
            GATE: () => valuePath,
            DEF: () => {
                this.CONSUME(tokenMap.NumberSign);
                this.CONSUME2(tokenMap.Identifier);
            }
        });
    });

    [VALUE_TYPE] = this.RULE(VALUE_TYPE, () => {
        this.OR(
            this.v ??
                (this.v = [
                    this.createOrConsumeEntry(tokenMap.Null),
                    this.createOrConsumeEntry(tokenMap.True),
                    this.createOrConsumeEntry(tokenMap.False),
                    this.createOrConsumeEntry(tokenMap.Binary),
                    this.createOrConsumeEntry(tokenMap.Date),
                    this.createOrConsumeEntry(tokenMap.Time),
                    this.createOrConsumeEntry(tokenMap.Timestamp),
                    this.createOrConsumeEntry(tokenMap.Number),
                    this.createOrSubruleEntry(this[PATH_TYPE], { ARGS: [true] }),
                    this.createOrSubruleEntry(this[STRUCT_TYPE]),
                    this.createOrSubruleEntry(this[COLLECTION_TYPE]),
                    this.createOrSubruleEntry(this[ENUM_TYPE]),
                    this.createOrSubruleEntry(this[STRING_TYPE]),
                    this.createOrSubruleEntry(this[MULTI_LINE_STRING_STRIP_INDENT_TYPE]),
                    this.createOrSubruleEntry(this[MULTI_LINE_STRING_TYPE]),
                    this.createOrSubruleEntry(this[EXPRESSION_TYPE])
                ])
        );
    });

    [COLLECTION_VALUE_TYPE] = this.RULE(COLLECTION_VALUE_TYPE, () => {
        this.OR(
            this.cv ??
                (this.cv = [
                    this.createOrConsumeEntry(tokenMap.Null),
                    this.createOrConsumeEntry(tokenMap.True),
                    this.createOrConsumeEntry(tokenMap.False),
                    this.createOrConsumeEntry(tokenMap.Binary),
                    this.createOrConsumeEntry(tokenMap.Date),
                    this.createOrConsumeEntry(tokenMap.Time),
                    this.createOrConsumeEntry(tokenMap.Timestamp),
                    this.createOrConsumeEntry(tokenMap.Number),
                    this.createOrSubruleEntry(this[EXTEND_COLLECTION_VALUE_TYPE]),
                    this.createOrSubruleEntry(this[PATH_TYPE], { ARGS: [true] }),
                    this.createOrSubruleEntry(this[STRUCT_TYPE]),
                    this.createOrSubruleEntry(this[COLLECTION_TYPE]),
                    this.createOrSubruleEntry(this[ENUM_TYPE]),
                    this.createOrSubruleEntry(this[STRING_TYPE]),
                    this.createOrSubruleEntry(this[MULTI_LINE_STRING_STRIP_INDENT_TYPE]),
                    this.createOrSubruleEntry(this[MULTI_LINE_STRING_TYPE]),
                    this.createOrSubruleEntry(this[EXPRESSION_TYPE])
                ])
        );
    });

    [EXTEND_COLLECTION_VALUE_TYPE] = this.RULE(EXTEND_COLLECTION_VALUE_TYPE, () => {
        this.CONSUME(tokenMap.SpreadOperator);
        this.OPTION(() => {
            this.CONSUME(tokenMap.UpToKeyword);
            this.SUBRULE(this[VALUE_TYPE]);
        });
    });

    [STRUCT_TYPE] = this.RULE(STRUCT_TYPE, () => {
        this.CONSUME(tokenMap.LCurly);
        this.OPTION(() => {
            this.CUSTOM_MANY(tokenMap.RCurly, this[ASSIGNMENT_TYPE]);
        });

        this.CONSUME(tokenMap.RCurly);
    });

    [COLLECTION_TYPE] = this.RULE(COLLECTION_TYPE, () => {
        this.CONSUME(tokenMap.LBracket);
        this.OPTION(() => {
            this.CUSTOM_MANY(tokenMap.RBracket, this[COLLECTION_VALUE_TYPE]);
        });
        this.CONSUME(tokenMap.RBracket);
    });

    [ENUM_TYPE] = this.RULE(ENUM_TYPE, () => {
        this.CONSUME(tokenMap.NumberSign);
        this.OPTION(() => {
            this.SUBRULE(this[PATH_TYPE]);
        });
    });

    [QUOTED_IDENTIFIER_TYPE] = this.RULE(QUOTED_IDENTIFIER_TYPE, () => {
        this.CONSUME(tokenMap.DoubleQuote);
        this.OPTION(() => {
            this.CONSUME(tokenMap.QuotedIdentifier);
            this.MANY(() => {
                this.CONSUME(tokenMap.PathSegmentSeparator);
                this.CONSUME2(tokenMap.QuotedIdentifier);
            });
        });
        this.CONSUME2(tokenMap.QuotedIdentifierExit);
    });

    [DELIMITED_IDENTIFIER_TYPE] = this.RULE(DELIMITED_IDENTIFIER_TYPE, () => {
        this.CONSUME(tokenMap.IdentifierStart);
        this.OPTION(() => {
            this.CONSUME(tokenMap.DelimitedIdentifier);
            this.MANY(() => {
                this.CONSUME(tokenMap.PathSegmentSeparator);
                this.CONSUME2(tokenMap.DelimitedIdentifier);
            });
        });
        this.CONSUME(tokenMap.DelimitedIdentifierExit);
    });

    [STRING_TYPE] = this.RULE(STRING_TYPE, () => {
        this.CONSUME(tokenMap.SingleQuote);
        this.OPTION(() => {
            this.CONSUME(tokenMap.String);
        });
        this.CONSUME(tokenMap.StringExit);
    });

    [MULTI_LINE_STRING_TYPE] = this.RULE(MULTI_LINE_STRING_TYPE, () => {
        this.CONSUME(tokenMap.Backtick);
        this.OPTION(() => {
            this.CONSUME(tokenMap.MultiLineString);
        });
        this.CONSUME(tokenMap.MultiLineStringExit);
    });

    [MULTI_LINE_STRING_STRIP_INDENT_TYPE] = this.RULE(MULTI_LINE_STRING_STRIP_INDENT_TYPE, () => {
        this.CONSUME(tokenMap.TripleBacktick);
        this.OPTION(() => {
            this.CONSUME(tokenMap.MultiLineString);
        });
        this.CONSUME(tokenMap.MultiLineStringStripIndentExit);
    });

    [EXPRESSION_TYPE] = this.RULE(EXPRESSION_TYPE, () => {
        this.CONSUME(tokenMap.LParen);

        this.MANY(() => {
            this.OR([
                {
                    ALT: (): CstNode => this.SUBRULE(this[VALUE_TYPE])
                },
                {
                    ALT: (): IToken => this.CONSUME1(tokenMap.Operator)
                }
            ]);
        });
        this.CONSUME(tokenMap.RParen);
    });

    /**
     *
     * @param error Mismatched token error object
     */
    private recoverFromMissingKey(error: MismatchedTokenException): void {
        // insert empty value till the end of document.
        const previousToken: IToken = error.previousToken;
        const remainingText = this.text.substring((previousToken.endOffset ?? 0) + 1);
        const lines = remainingText.split(LINE_BREAK_PATTERN);
        if (lines.length) {
            // ignore subsequent lines, in the future we may consider also remaining lines
            const line = lines[0];
            const assignmentCstNode: AssignmentCstNode = this['CST_STACK'][this['CST_STACK'].length - 1];

            if (hasItems(assignmentCstNode.children[VALUE_TYPE])) {
                const valueNode = assignmentCstNode.children[VALUE_TYPE][0];
                if (isDefined(valueNode.location)) {
                    valueNode.location.startLine = previousToken.endLine ?? 0;
                    valueNode.location.startColumn = (previousToken.endColumn ?? 0) + 1;
                    valueNode.location.startOffset = (previousToken.endOffset ?? 0) + 1;

                    valueNode.location.endOffset = valueNode.location.startOffset + line.length;
                    valueNode.location.endColumn = valueNode.location.startOffset + line.length;
                    valueNode.location.endLine = previousToken.endLine;
                }

                // Update assignment end position
                if (isDefined(assignmentCstNode.location) && isDefined(valueNode.location)) {
                    assignmentCstNode.location.endOffset = valueNode.location.endOffset;
                    assignmentCstNode.location.endColumn = valueNode.location.endColumn;
                    assignmentCstNode.location.endLine = valueNode.location.endLine;
                }
            }
        }
    }
}
