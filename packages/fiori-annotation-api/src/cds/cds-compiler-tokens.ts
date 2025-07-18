import type { Position } from '@sap-ux/odata-annotation-core';
import { Range } from '@sap-ux/odata-annotation-core';

export interface Token {
    readonly type: number;

    readonly text: string;
    /**
     * line number, 1-based
     */
    readonly line: number;
    /**
     * column number, 0-based
     */
    readonly column: number;

    readonly tokenIndex: number;

    readonly isIdentifier?: string;
}
export interface TokenV6 {
    readonly type: string;

    readonly text: string;
    readonly location: {
        readonly line: number;
        readonly col: number;

        readonly endLine: number;
        readonly endCol: number;

        readonly file: string;
    };

    readonly tokenIndex: number;
    readonly parsedAs: 'keyword' | 'global' | 'UsingAlias';
    readonly keyword: string;
    readonly isIdentifier?: string;
}

export type CompilerToken = Token | TokenV6;

/**
 * Finds last matching token before a certain position.
 *
 * @param pattern - Regular expression to which the token text should match. If omitted, then will match any token.
 * @param tokens - All tokens in the document.
 * @param position - Position before which the token should be.
 * @returns Last token before the given position.
 */
export function findLastTokenBeforePosition(
    pattern: RegExp | undefined,
    tokens: CompilerToken[],
    position: Position
): CompilerToken | undefined {
    let matchedToken: CompilerToken | undefined;
    for (const token of tokens) {
        if (isTokenAfterPosition(token, position)) {
            return matchedToken;
        }
        if (!pattern || pattern.test(token.text)) {
            matchedToken = token;
        }
    }
    return undefined;
}

/**
 * Finds first matched token after a certain position.
 *
 * @param pattern - Regular expression to which the token text should match. If omitted, then will match any token.
 * @param tokens - All tokens in the document.
 * @param position - Position after which the token should be.
 * @returns First matched token after the given position.
 */
export function findFirstTokenAfterPosition(
    pattern: RegExp | undefined,
    tokens: CompilerToken[],
    position: Position
): CompilerToken | undefined {
    for (const token of tokens) {
        if (isTokenAfterPosition(token, position) && (!pattern || pattern.test(token.text))) {
            return token;
        }
    }
    return undefined;
}

/**
 * Checks if token is after a certain position in the file.
 *
 * @param token - All tokens in the document.
 * @param position - Position after which the token should be.
 * @returns - True if token is after the give position.
 */
export function isTokenAfterPosition(token: CompilerToken, position: Position): boolean {
    if (isOldToken(token)) {
        const line = token.line - 1; // line is 1 based in Token, but 0 based in Range
        if (line > position.line) {
            return true;
        }
        return line === position.line && token.column >= position.character;
    }
    const line = token.location.line - 1; // line is 1 based in Token, but 0 based in Range
    if (line > position.line) {
        return true;
    }
    return line === position.line && token.location.col > position.character;
}

/**
 *  Checks token structure.
 *
 * @param token - Token to check
 * @returns True if token is of pre compiler v6 structure.
 */
export function isOldToken(token: Token | TokenV6): token is Token {
    return (token as TokenV6).location === undefined;
}

/**
 * Returns a function that checks if tokens position starts at the given position.
 *
 * @param start - Matching token start position.
 * @returns True if token starts at the given position.
 */
export function matchTokenByStart(start: Position): (token: CompilerToken) => boolean {
    return (token: CompilerToken) => {
        if (isOldToken(token)) {
            return token.line === start.line + 1 && token.column === start.character;
        }
        return token.location.line === start.line + 1 && token.location.col === start.character + 1;
    };
}

/**
 * Creates a range from the given token.
 *
 * @param token - Token to create range from.
 * @returns Token range.
 */
export function createTokenRange(token: CompilerToken): Range {
    if (isOldToken(token)) {
        return Range.create(
            token.line - 1,
            token.column,

            token.line - 1,
            token.column + token.text.length
        );
    }
    return Range.create(
        token.location.line - 1,
        token.location.col - 1,
        token.location.endLine - 1,
        token.location.endCol - 1
    );
}

/**
 * Get token column.
 *
 * @param token - Token.
 * @returns column number.
 */
export function tokenColumn(token: CompilerToken): number {
    if (isOldToken(token)) {
        return token.column;
    }
    return token.location.col - 1;
}

/**
 * Get token line.
 *
 * @param token - Token.
 * @returns line number.
 */
export function tokenLine(token: CompilerToken): number {
    if (isOldToken(token)) {
        return token.line - 1;
    }
    return token.location.line - 1;
}
