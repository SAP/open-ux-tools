import type { Range } from '@sap-ux/text-document-utils';
export enum TokenType {
    separator = 'separator',
    eol = 'eol',
    text = 'text',
    escaped = 'escaped-text'
}

export interface Token {
    type: TokenType;
    value: string;
    /**
     * Start offset of the token
     */
    start: number;
    /**
     * End offset of the token
     */
    end: number;
}

export interface CsvRow {
    fields: CsvField[];
    range: Range;
}

export interface CsvField {
    value: string;
    quoted: boolean;
    range: Range;
}

export interface CsvDocument {
    header: CsvRow;
    rows: CsvRow[];
}

export interface CsvParseResult {
    ast: CsvDocument;
    tokens: Token[];
}
