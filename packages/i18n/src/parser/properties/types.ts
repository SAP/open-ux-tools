import type { Range } from '@sap-ux/text-document-utils';
export interface TextNode<T = 'key' | 'value'> {
    type: T;
    value: string;
    range: Range;
}

export interface KeyElementLine {
    type: 'key-element-line';
    key: TextNode<'key'>;
    element: TextNode<'value'>;
    range: Range;
}

export interface CommentLine {
    type: 'comment-line';
    value: string;
    range: Range;
}

export type TokenType = 'comment' | 'separator' | 'end-of-line' | 'key' | 'value' | 'whitespace';

export interface Token {
    type: TokenType;

    /**
     * All the matched characters since last token
     */
    image: string;
    /**
     * Start offset of the token
     */
    start: number;
    /**
     * End offset of the token
     */
    end: number;
}

export type PropertyLine = KeyElementLine | CommentLine;
export type PropertyList = PropertyLine[];

export interface PropertiesParseResult {
    ast: PropertyList;
    tokens: Token[];
}
