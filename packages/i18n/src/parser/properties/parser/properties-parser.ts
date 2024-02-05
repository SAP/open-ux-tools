import { Range, getLineOffsets, rangeAt } from '../../utils';
import type { CommentLine, KeyElementLine, PropertyList, TextNode, Token } from '../types';

/**
 * Implements reading files Java properties files as described in https://docs.oracle.com/javase/10/docs/api/java/util/Properties.html.
 *
 * @param tokens list of token
 * @param text text content
 * @returns array of property line
 */
export function getPropertyList(tokens: Token[], text: string): PropertyList {
    const lineOffsets = getLineOffsets(text);
    const contentLength = text.length;

    let i = 0;
    const peek = (count?: number): Token => (count ? tokens[i + count] : tokens[i]);
    const consume = (): Token => tokens[i++];
    const eof = (): boolean => i >= tokens.length;

    /**
     * Parse comment.
     *
     * @returns comment line
     */
    function parseComment(): CommentLine {
        const comment = consume();
        return {
            type: 'comment-line',
            value: comment.image,
            range: rangeAt(lineOffsets, comment.start, comment.end, contentLength)
        };
    }

    /**
     * Parse key element line.
     *
     * @returns key element line
     */
    function parseKeyElement(): KeyElementLine {
        const keyToken = consume();

        const key: TextNode = {
            type: 'text',
            value: keyToken.image,
            range: rangeAt(lineOffsets, keyToken.start, keyToken.end, contentLength)
        };

        let resetStartOffset = true;
        let start: number | undefined;
        let end: number | undefined;
        if (peek().type === 'whitespace') {
            consume();
        }

        if (peek().type === 'separator') {
            const separator = consume();
            start = end = separator.end;
            if (peek().type === 'whitespace') {
                consume();
            }
        }

        let concatenatedValue = '';
        while (!eof() && peek()?.type !== 'end-of-line') {
            while (!eof() && peek()?.type !== 'end-of-line' && peek()?.type !== 'continuation-line-marker') {
                if (peek()?.type === 'text' || peek()?.type === 'whitespace') {
                    const valueToken = consume();
                    if (resetStartOffset) {
                        start = valueToken.start;
                        resetStartOffset = false;
                    }
                    end = valueToken.end;
                    concatenatedValue += valueToken.image;
                }
            }

            if (peek()?.type === 'continuation-line-marker') {
                consume();
                if (peek().type === 'whitespace') {
                    consume();
                }
            }
        }
        const element: TextNode = {
            type: 'text',
            value: concatenatedValue,
            range: rangeAt(lineOffsets, start ?? 0, end ?? 0, contentLength)
        };

        return {
            type: 'key-element-line',
            key,
            element,
            range: Range.create(key.range.start, element.range.end)
        };
    }

    /**
     * Parse property lines.
     *
     * @returns property lines
     */
    function parseList(): PropertyList {
        const list = [];

        while (!eof()) {
            const next = peek();
            if (next.type === 'comment') {
                list.push(parseComment());
            } else if (next.type === 'text') {
                list.push(parseKeyElement());
            }

            if (peek()?.type === 'end-of-line' || peek()?.type === 'whitespace') {
                consume();
            }
        }

        return list;
    }
    return parseList();
}
