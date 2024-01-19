import { Range, positionAt, getLineOffsets } from '../../utils';
import { type CsvDocument, type Token, type CsvField, type CsvRow, type CsvParseResult, TokenType } from '../types';
import { tokenize } from '../lexer';

class ParseCsv {
    private text: string;
    private lineOffsets: number[];
    private i: number;
    private tokens: Token[];
    constructor(text: string) {
        this.text = text;
        this.tokens = tokenize(text);
        this.lineOffsets = getLineOffsets(text);
        this.i = 0;
    }
    getTokens() {
        return this.tokens;
    }
    getContentLength(): number {
        return this.text.length;
    }
    peek(count = 0): Token | undefined {
        return this.tokens[this.i + count];
    }
    consume(): Token {
        return this.tokens[this.i++];
    }
    eof(): boolean {
        return this.i >= this.tokens.length;
    }
    parseField(): CsvField {
        const token = this.consume();
        return {
            quoted: token.type === TokenType.escaped ? true : false,
            value: token.value,
            range: Range.create(
                positionAt(this.lineOffsets, token.start, this.getContentLength()),
                positionAt(this.lineOffsets, token.end, this.getContentLength())
            )
        };
    }
    parseRow(): CsvRow {
        const row: CsvRow = {
            fields: [],
            range: Range.create(0, 0, 0, 0)
        };

        while (!this.eof() && this.peek()?.type !== TokenType.eol) {
            if (this.peek()?.type === TokenType.escaped || this.peek()?.type === TokenType.text) {
                row.fields.push(this.parseField());
            }

            const next = this.peek();
            if (next && next.type !== TokenType.eol) {
                if (next.type === TokenType.separator && this.peek(1) === undefined) {
                    // trailing separator at the end of file
                    row.fields.push({
                        quoted: false,
                        value: '',
                        range: Range.create(
                            positionAt(this.lineOffsets, next.end, this.getContentLength()),
                            positionAt(this.lineOffsets, next.end, this.getContentLength())
                        )
                    });
                }
                this.consume();
            }
        }

        if (row.fields.length) {
            const start = row.fields[0].range.start;
            const end = row.fields[row.fields.length - 1].range.end;
            row.range = Range.create(start.line, start.character, end.line, end.character);
        }
        return row;
    }
    parseDocument(): CsvDocument {
        // escape newline(s)
        while (!this.eof()) {
            const next = this.peek();
            if (next?.type === TokenType.text && next.value.length === 0 && this.peek(1)?.type === TokenType.eol) {
                this.consume(); // empty text
                this.consume(); // eol
                continue;
            } else {
                break;
            }
        }
        const document: CsvDocument = {
            header: this.parseRow(),
            rows: []
        };
        while (!this.eof()) {
            if (this.peek()?.type === TokenType.escaped || this.peek()?.type === TokenType.text) {
                document.rows.push(this.parseRow());
            }
            this.consume();
        }
        return document;
    }
}

export function parseCsv(text: string): CsvParseResult {
    const csv = new ParseCsv(text);
    const tokens = csv.getTokens();
    return {
        ast: csv.parseDocument(),
        tokens
    };
}
