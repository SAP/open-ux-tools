import { createToken, Lexer } from 'chevrotain';

export const DEFAULT_MODE = 'default_mode';
export const QUOTED_IDENTIFIER_MODE = 'quoted_mode';
export const STRING_MODE = 'string_mode';
export const MULTI_LINE_STRING_MODE = 'multi_line_string_mode';
export const MULTI_LINE_STRING_STRIP_INDENT_MODE = 'multi_line_string_strip_indent_mode';
export const DELIMITED_IDENTIFIER_MODE = 'delimited_mode';
export const EXPRESSION_MODE = 'expression_mode';

export const QUOTED_IDENTIFIER_TOKEN_TYPE = 'QuotedIdentifier';
const QuotedIdentifier = createToken({ name: QUOTED_IDENTIFIER_TOKEN_TYPE, pattern: /[^/\u0022\n\r\u2028\u2029.]+/ });

export const QUOTED_IDENTIFIER_EXIT_TOKEN_TYPE = 'QuotedIdentifierExit';
const QuotedIdentifierExit = createToken({
    name: QUOTED_IDENTIFIER_EXIT_TOKEN_TYPE,
    pattern: /[\u0022\n\r\u2028\u2029]{1}/,

    pop_mode: true
});

export const DELIMITED_IDENTIFIER_TOKEN_TYPE = 'DelimitedIdentifier';
const DelimitedIdentifier = createToken({
    name: DELIMITED_IDENTIFIER_TOKEN_TYPE,
    pattern: /[^\u005d\n\r\u2028\u2029./]+/
});

export const DELIMITED_IDENTIFIER_EXIT_TOKEN_TYPE = 'DelimitedIdentifierExit';
const DelimitedIdentifierExit = createToken({
    name: DELIMITED_IDENTIFIER_EXIT_TOKEN_TYPE,
    pattern: /[\u005d\n\r\u2028\u2029]{1}/,

    pop_mode: true
});

export const TERM_CAST_IDENTIFIER_TOKEN_TYPE = 'TermCastIdentifier';
const TermCastIdentifier = createToken({
    name: TERM_CAST_IDENTIFIER_TOKEN_TYPE,
    pattern: /[@$_a-zA-Z][$_a-zA-Z0-9]*/
});

export const IDENTIFIER_TOKEN_TYPE = 'Identifier';
const Identifier = createToken({
    name: IDENTIFIER_TOKEN_TYPE,
    pattern: /[$_a-zA-Z][$_a-zA-Z0-9]*/,

    longer_alt: TermCastIdentifier
});

export const BACKTICK_TOKEN_TYPE = 'Backtick';
const Backtick = createToken({ name: BACKTICK_TOKEN_TYPE, pattern: '`', push_mode: MULTI_LINE_STRING_MODE });

export const TRIPLE_BACKTICK_TOKEN_TYPE = 'TripleBacktick';
const TripleBacktick = createToken({
    name: TRIPLE_BACKTICK_TOKEN_TYPE,
    pattern: '```',
    push_mode: MULTI_LINE_STRING_STRIP_INDENT_MODE
});

export const MULTI_LINE_STRING_EXIT_TOKEN_TYPE = 'MultiLineStringExit';
const MultiLineStringExit = createToken({ name: MULTI_LINE_STRING_EXIT_TOKEN_TYPE, pattern: /[`]{1}/, pop_mode: true });
export const MULTI_LINE_STRING_TOKEN_TYPE = 'MultiLineString';
const MultiLineString = createToken({ name: MULTI_LINE_STRING_TOKEN_TYPE, pattern: /(([^`]+|'')+)/ });

export const MULTI_LINE_STRING_STRIP_INDENT_EXIT_TOKEN_TYPE = 'MultiLineStringStripIndentExit';
const MultiLineStringStripIndentExit = createToken({
    name: MULTI_LINE_STRING_STRIP_INDENT_EXIT_TOKEN_TYPE,
    pattern: /[`]{3}/,
    pop_mode: true
});

export const STRING_TOKEN_TYPE = 'String';
const StringToken = createToken({ name: STRING_TOKEN_TYPE, pattern: /(([^\n\r']+|'')+)/ });
export const STRING_EXIT_TOKEN_TYPE = 'StringExit';

const StringExit = createToken({ name: STRING_EXIT_TOKEN_TYPE, pattern: /[\n\r']{1}/, pop_mode: true });

export const COMMENT_TOKEN_TYPE = 'Comment';
const Comment = createToken({
    name: COMMENT_TOKEN_TYPE,
    pattern: /\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/,

    line_breaks: true,
    group: 'comments'
});

export const LINE_COMMENT_TOKEN_TYPE = 'LineComment';
const LineComment = createToken({
    name: LINE_COMMENT_TOKEN_TYPE,
    pattern: /\/\/[^\n\r\f]*/,
    group: 'comments'
});

export const NUMBER_SIGN_TOKEN_TYPE = 'NumberSign';
const NumberSign = createToken({ name: NUMBER_SIGN_TOKEN_TYPE, pattern: '#' });

export const COLON_TOKEN_TYPE = 'Colon';
const Colon = createToken({ name: COLON_TOKEN_TYPE, pattern: ':' });

export const COMMA_TOKEN_TYPE = 'Comma';
const Comma = createToken({ name: COMMA_TOKEN_TYPE, pattern: ',' });

export const PATH_SEGMENT_SEPARATOR_TOKEN_TYPE = 'PathSegmentSeparator';
const PathSegmentSeparator = createToken({ name: PATH_SEGMENT_SEPARATOR_TOKEN_TYPE, pattern: /\.|\// });

export const SINGLE_QUOTE_TOKEN_TYPE = 'SingleQuote';

const SingleQuote = createToken({ name: SINGLE_QUOTE_TOKEN_TYPE, pattern: "'", push_mode: STRING_MODE });

export const DOUBLE_QUOTE_TOKEN_TYPE = 'DoubleQuote';

const DoubleQuote = createToken({ name: DOUBLE_QUOTE_TOKEN_TYPE, pattern: '"', push_mode: QUOTED_IDENTIFIER_MODE });

export const IDENTIFIER_START_TOKEN_TYPE = 'IdentifierStart';
const IdentifierStart = createToken({
    name: IDENTIFIER_START_TOKEN_TYPE,
    pattern: '![',

    push_mode: DELIMITED_IDENTIFIER_MODE
});

export const L_BRACKET_TOKEN_TYPE = 'LBracket';
const LBracket = createToken({ name: L_BRACKET_TOKEN_TYPE, pattern: '[' });

export const R_BRACKET_TOKEN_TYPE = 'RBracket';
const RBracket = createToken({ name: R_BRACKET_TOKEN_TYPE, pattern: ']' });

export const L_CURLY_TOKEN_TYPE = 'LCurly';
const LCurly = createToken({ name: L_CURLY_TOKEN_TYPE, pattern: '{' });

export const R_CURLY_TOKEN_TYPE = 'RCurly';
const RCurly = createToken({ name: R_CURLY_TOKEN_TYPE, pattern: '}' });

export const L_PAREN_TOKEN_TYPE = 'LParen';
const LParen = createToken({ name: L_PAREN_TOKEN_TYPE, pattern: '(', push_mode: EXPRESSION_MODE });

export const R_PAREN_TOKEN_TYPE = 'RParen';
const RParen = createToken({ name: R_PAREN_TOKEN_TYPE, pattern: ')', pop_mode: true });

export const WHITE_SPACE_TOKEN_TYPE = 'WhiteSpace';
const WhiteSpace = createToken({
    name: WHITE_SPACE_TOKEN_TYPE,
    pattern: /\s+/,
    group: Lexer.SKIPPED,

    line_breaks: true
});

export const NUMBER_TOKEN_TYPE = 'Number';
const NumberToken = createToken({ name: NUMBER_TOKEN_TYPE, pattern: /(\+|-)?[0-9]+(\.[0-9]+)?([eE](\+|-)?[0-9]+)?/ });
// keywords
export const NULL_TOKEN_TYPE = 'Null';

const Null = createToken({ name: NULL_TOKEN_TYPE, pattern: /null/i, longer_alt: Identifier });
export const TRUE_TOKEN_TYPE = 'True';

const True = createToken({ name: TRUE_TOKEN_TYPE, pattern: /true/i, longer_alt: Identifier });

export const FALSE_TOKEN_TYPE = 'False';

const False = createToken({ name: FALSE_TOKEN_TYPE, pattern: /false/i, longer_alt: Identifier });

export const BINARY_TOKEN_TYPE = 'Binary';
const Binary = createToken({
    name: BINARY_TOKEN_TYPE,
    pattern: /x'[^\n\r']+'?/i
});

export const DATE_TOKEN_TYPE = 'Date';
const DateToken = createToken({
    name: DATE_TOKEN_TYPE,
    pattern: /Date'[^\n\r']+'?/i
});
export const TIME_TOKEN_TYPE = 'Time';
const Time = createToken({ name: TIME_TOKEN_TYPE, pattern: /Time'[^\n\r']+'?/i });
export const TIMESTAMP_TOKEN_TYPE = 'Timestamp';
const Timestamp = createToken({
    name: TIMESTAMP_TOKEN_TYPE,
    pattern: /Timestamp'[^\n\r']+'?/i
});

export const SPREAD_OPERATOR = 'SpreadOperator';
const SpreadOperator = createToken({
    name: SPREAD_OPERATOR,
    pattern: /[.]{3}/i
});

export const UP_TO_KEYWORD = 'UpToKeyword';
const UpToKeyword = createToken({
    name: UP_TO_KEYWORD,
    pattern: /up to/i
});

// cap documentation refers to db operators - HANA DB operators https://help.sap.com/docs/SAP_HANA_PLATFORM/4fe29514fd584807ac9f2a04f6754767/20a380977519101494ceddd944e87527.html
// for each operator token: maintain operator metadata (operatorMap, operatorImageMap in /transformer/expressions.ts)
export const OPERATOR = 'Operator';
const words = (...values: string[]) => values.map((value) => '\\b' + value + '\\b');
console.log(words('a', 'b'));

const regEx = new RegExp(
    [
        '=',
        '!=',
        '<>',
        '>=?',
        '<=?',
        '\\?',
        ':',
        '\\|\\|',
        '\\+',
        '-',
        '\\*',
        '\\/',
        ...words('IS NULL', 'IS NOT NULL', 'NOT LIKE', 'LIKE', 'NOT BETWEEN', 'BETWEEN', 'NOT', 'AND', 'OR')
    ].join('|'),
    'i'
);
const Operator = createToken({
    name: OPERATOR,
    pattern: regEx
});

export const tokenMap = {
    Comment,
    LineComment,
    NumberSign,
    Colon,
    Comma,
    PathSegmentSeparator,
    SingleQuote,
    DoubleQuote,
    IdentifierStart,
    LBracket,
    RBracket,
    LCurly,
    RCurly,
    LParen,
    RParen,
    WhiteSpace,
    Number: NumberToken,
    Binary,
    Date: DateToken,
    Time,
    Timestamp,
    Null,
    True,
    False,
    Identifier,
    TermCastIdentifier,
    DelimitedIdentifier,
    QuotedIdentifier,
    String: StringToken,
    StringExit,
    QuotedIdentifierExit,
    DelimitedIdentifierExit,
    SpreadOperator,
    UpToKeyword,
    MultiLineString,
    MultiLineStringExit,
    MultiLineStringStripIndentExit,
    Backtick,
    TripleBacktick,
    Operator
};

export const lexerDefinition = {
    modes: {
        [DEFAULT_MODE]: [
            SpreadOperator,
            UpToKeyword,
            Comment,
            LineComment,
            NumberSign,
            Colon,
            Comma,
            PathSegmentSeparator,
            TripleBacktick,
            Backtick,
            SingleQuote,
            DoubleQuote,
            IdentifierStart,
            LBracket,
            RBracket,
            LCurly,
            RCurly,
            LParen,
            WhiteSpace,
            NumberToken,
            Binary,
            DateToken,
            Time,
            Timestamp,
            Null,
            True,
            False,
            Operator,
            Identifier,
            TermCastIdentifier
        ],
        [QUOTED_IDENTIFIER_MODE]: [QuotedIdentifier, PathSegmentSeparator, QuotedIdentifierExit],
        [DELIMITED_IDENTIFIER_MODE]: [DelimitedIdentifier, PathSegmentSeparator, DelimitedIdentifierExit],
        [STRING_MODE]: [StringToken, StringExit],
        [MULTI_LINE_STRING_STRIP_INDENT_MODE]: [MultiLineString, MultiLineStringStripIndentExit],
        [MULTI_LINE_STRING_MODE]: [MultiLineString, MultiLineStringExit],
        [EXPRESSION_MODE]: [
            LParen,
            Comment,
            LineComment,
            NumberSign,
            TripleBacktick,
            Backtick,
            SingleQuote,
            DoubleQuote,
            IdentifierStart,
            LBracket,
            RBracket,
            LCurly,
            RCurly,
            WhiteSpace,
            Operator,
            NumberToken,
            Binary,
            DateToken,
            Time,
            Timestamp,
            Null,
            True,
            False,
            PathSegmentSeparator,
            Identifier,
            TermCastIdentifier,
            RParen
        ],
        delimited: []
    },
    defaultMode: DEFAULT_MODE
};
