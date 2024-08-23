import type { Position } from '@sap-ux/odata-annotation-core';

import type { createCdsCompilerFacade } from '@sap/ux-cds-compiler-facade';

export type CompilerToken = ReturnType<ReturnType<typeof createCdsCompilerFacade>['getTokensForUri']>[number];

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
    const line = token.line - 1; // line is 1 based in Token, but 0 based in Range
    if (line > position.line) {
        return true;
    }
    return line === position.line && token.column >= position.character;
}
