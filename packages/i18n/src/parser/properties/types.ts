import { Range } from "../utils";
export interface TextNode {
    type: 'text';
    value: string;
    range: Range;
}

export interface KeyElementLine {
    type: 'key-element-line';
    key: TextNode;
    element: TextNode;
    range: Range;
}

export interface CommentLine {
    type: 'comment-line';
    value: string;
    range: Range;
}


export type TokenType =
    | 'comment'
    | 'separator'
    | 'continuation-line-marker'
    | 'end-of-line'
    | 'text'
    | 'escape'
    | 'whitespace';

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
