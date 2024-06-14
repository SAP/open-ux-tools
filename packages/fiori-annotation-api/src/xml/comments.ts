import { Range } from '@sap-ux/odata-annotation-core-types';
import type { parse } from '@xml-tools/parser';

export interface Comment {
    type: 'comment';
    value: string;
    range: Range;
}
type TokenVector = ReturnType<typeof parse>['tokenVector'];

/**
 * Extracts comment tokens from all the tokens in document.
 *
 * @param tokenVector - XML Tokens.
 * @returns All the comments in the document.
 */
export function collectComments(tokenVector: TokenVector): Comment[] {
    const comments: Comment[] = [];
    for (const token of tokenVector) {
        // check for comment tokens
        if (token.tokenTypeIdx !== 3) {
            continue;
        }

        const range = getTokenRange(token);
        if (range) {
            comments.push({
                type: 'comment',
                value: token.image,
                range
            });
        }
    }
    return comments;
}
/**
 * Converts token ranges where lines and columns start with 1.
 *
 * @param token - XML Tokens.
 * @returns Range where lines and columns start with 0.
 */
function getTokenRange(token: TokenVector[number]): Range | undefined {
    const startLine = token.startLine ?? -1;
    const startCharacter = token.startColumn ?? -1;
    const endLine = token.endLine ?? -1;
    const endCharacter = token.endColumn ?? -1;

    if (startLine === -1 || startCharacter === -1 || endLine === -1 || endCharacter === -1) {
        return undefined;
    }
    // tokens use 1 based counting system
    // end character is off by one
    return Range.create(startLine - 1, startCharacter - 1, endLine - 1, endCharacter);
}
