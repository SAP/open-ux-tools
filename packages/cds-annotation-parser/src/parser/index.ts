import type { IToken, ILexingError, IRecognitionException } from 'chevrotain';
import { lexer, parser } from './factory.js';
import type { DeclarationCstNode } from './parser.js';
interface ParseResult {
    cst: DeclarationCstNode;
    tokens: IToken[];
    lexErrors: ILexingError[];
    parseErrors: IRecognitionException[];
}

export const parse = (text: string): ParseResult => {
    const { tokens, errors: lexErrors } = lexer.tokenize(text);
    parser.text = text;
    parser.input = tokens;
    return {
        cst: parser.declaration() as DeclarationCstNode,
        tokens,
        lexErrors,
        parseErrors: parser.errors
    };
};
