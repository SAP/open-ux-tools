import { Range, getLineOffsets, rangeAt } from '@sap-ux/text-document-utils';
import type { CommentLine, PropertyList, TextNode, Token } from '../types';

/**
 * Properties list class.
 */
class PropertiesList {
    private tokens: Token[];
    private text: string;
    private index: number;
    private list: PropertyList;
    private lineOffsets: number[];
    private contentLength: number;
    /**
     * Class constructor.
     *
     * @param tokens tokens
     * @param text text
     */
    constructor(tokens: Token[], text: string) {
        this.tokens = tokens;
        this.text = text;
        this.index = 0;
        this.list = [];
        this.lineOffsets = getLineOffsets(text);
        this.contentLength = this.text.length;
    }
    /**
     * Peek a token.
     *
     * @returns token or undefined
     */
    peek(): Token | undefined {
        if (this.tokens[this.index] === undefined) {
            return undefined;
        }

        return this.tokens[this.index];
    }

    /**
     * Get next token and increment index.
     *
     * @param count number to increment index. By default one token
     * @returns Token or undefined
     */
    next(count = 1): Token | undefined {
        if (this.index >= this.tokens.length) {
            return undefined;
        }
        this.index = this.index + count;
        return this.tokens[this.index];
    }
    /**
     * Consume comment.
     *
     */
    consumeComment() {
        const comment = this.peek();
        if (!comment) {
            return;
        }
        if (comment.type === 'comment') {
            const data: CommentLine = {
                type: 'comment-line',
                value: comment.image,
                range: rangeAt(this.lineOffsets, comment.start, comment.end, this.contentLength)
            };
            this.list.push(data);
            this.next();
        }
    }

    /**
     * Consume key.
     *
     * @returns key node or undefined
     */
    consumeKey(): TextNode<'key'> | undefined {
        let key: TextNode<'key'> | undefined;
        while (this.peek()) {
            const token = this.peek();
            if (!token) {
                break;
            }
            if (token.type === 'key') {
                key = {
                    type: 'key',
                    value: token.image,
                    range: rangeAt(this.lineOffsets, token.start, token.end, this.contentLength)
                };
                this.next();
                break;
            }
            this.next();
        }
        return key;
    }
    /**
     * Consume value.
     *
     * @returns value node or undefined
     */
    consumeValue(): TextNode<'value'> | undefined {
        let value: TextNode<'value'> | undefined;
        while (this.peek()) {
            const token = this.peek();
            if (!token) {
                break;
            }
            if (token.type === 'value') {
                value = {
                    type: 'value',
                    value: token.image,
                    range: rangeAt(this.lineOffsets, token.start, token.end, this.contentLength)
                };
                this.next();
                break;
            }
            this.next();
        }
        return value;
    }
    /**
     * Consume key value pair.
     *
     */
    consumeKeyValue() {
        const key = this.consumeKey();
        if (!key) {
            return;
        }
        let element = this.consumeValue();
        if (!element) {
            element = {
                type: 'value',
                value: '',
                range: { ...key.range, start: { line: key.range.end.line, character: key.range.end.character } }
            };
        }

        this.list.push({
            type: 'key-element-line',
            key,
            element,
            range: Range.create(key.range.start, element.range.end)
        });
    }
    /**
     * Create properties list.
     */
    createList() {
        while (this.peek()) {
            const token = this.peek();
            if (!token) {
                break;
            }
            if (['whitespace', 'separator', 'end-of-line'].includes(token.type)) {
                this.next();
                continue;
            }
            if (token.type === 'comment') {
                this.consumeComment();
                continue;
            }
            this.consumeKeyValue();
        }
    }

    /**
     * Get properties list.
     *
     * @returns property list
     */
    getList(): PropertyList {
        return this.list;
    }
}

/**
 * Implements reading files Java properties files as described in https://docs.oracle.com/javase/10/docs/api/java/util/Properties.html.
 *
 * @param tokens list of token
 * @param text text content
 * @returns array of property line
 */
export function getPropertyList(tokens: Token[], text: string): PropertyList {
    const propertiesLine = new PropertiesList(tokens, text);
    propertiesLine.createList();
    return propertiesLine.getList();
}
