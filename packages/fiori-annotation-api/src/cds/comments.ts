import type { Range } from '@sap-ux/odata-annotation-core-types';
import { isOldToken, type CompilerToken } from './cds-compiler-tokens';

export interface Comment {
    type: 'comment';
    value: string;
    range: Range;
}

const isComment = (token: CompilerToken): boolean => {
    if (isOldToken(token)) {
        return token.type === 32 || token.type === 30 || token.type === 31;
    }
    return token.type === 'Comment' || token.type === 'DocComment';
};

/**
 * Returns all comments in the document.
 *
 * @param tokens - All tokens in the document.
 * @returns All comments in the document.
 */
export function collectComments(tokens: CompilerToken[]): Comment[] {
    const comments: Comment[] = [];
    for (const token of tokens) {
        // check for comment tokens
        if (isComment(token)) {
            const { range, value } = getCommentRangeAndValue(token);
            if (range && value) {
                comments.push({
                    type: 'comment',
                    value,
                    range
                });
            }
        }
    }
    return comments;
}

/**
 *
 * @param token
 */
function getCommentRangeAndValue(token: CompilerToken): { value: string; range?: Range } {
    if (isOldToken(token)) {
        // 32 line comment // 31 block comment // 30 doc comment
        const value = token.text;
        let range: Range | undefined;
        if (token.type === 30 || token.type === 31) {
            const lines = token.text.split('\n');
            range = {
                start: { line: token.line - 1, character: token.column },
                end: {
                    line: token.line - 2 + lines.length,
                    character: value.split('\n')[value.split('\n').length - 1].length
                }
            };
        } else if (token.type === 32) {
            range = {
                start: { line: token.line - 1, character: token.column },
                end: {
                    line: token.line - 1,
                    character: token.column + value.length
                }
            };
        }
        return { value, range };
    }
    const value = token.text;
    let range: Range | undefined;
    if (token.type === 'Comment') {
        const lines = token.text.split('\n');
        range = {
            start: { line: token.location.line - 1, character: token.location.col - 1 },
            end: {
                line: token.location.line - 2 + lines.length,
                character: token.location.endCol - 1
            }
        };
    } else if (token.type === 'DocComment') {
        range = {
            start: { line: token.location.line - 1, character: token.location.col - 1 },
            end: {
                line: token.location.line - 1,
                character: token.location.col - 1 + value.length
            }
        };
    }
    return { value, range };
}
