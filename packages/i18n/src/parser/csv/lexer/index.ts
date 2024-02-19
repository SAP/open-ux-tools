import type { Token } from '../types';
import { TokenType } from '../types';
const SEPARATOR = /[,;\t]/;

/**
 * Check if character is a separator or new line.
 *
 * @param character single character
 * @returns boolean
 */
function isSeparatorOrNewLine(character: string): boolean {
    return SEPARATOR.test(character) || character === '\n';
}

/**
 * CSV tokenizer class.
 */
class CsvTokenizer {
    private i: number;
    private value: string;
    private mode: 'default' | 'quoted';
    private start: number;
    private lastTextTokenType: TokenType;
    private tokens: Token[];
    constructor() {
        this.i = 0;
        this.value = '';
        this.mode = 'default';
        this.start = 0;
        this.lastTextTokenType = TokenType.text;
        this.tokens = [];
    }
    /**
     * Create tokens for given CSV text.
     *
     * @param text CSV text
     */
    createToken(text: string) {
        while (this.i < text.length) {
            const character = text[this.i];
            if (this.mode === 'default') {
                if (isSeparatorOrNewLine(character)) {
                    this.handleSeparatorOrNewLine(character);
                } else if (character === '"') {
                    this.mode = 'quoted';
                } else {
                    this.value += character;
                }
            } else if (this.mode === 'quoted') {
                this.handleQuotedCharacter(text, character);
            }
            this.i++;
        }
        if (this.value) {
            this.tokens.push({
                type: TokenType.text,
                value: this.value,
                start: this.start,
                end: this.i
            });
        }
    }
    /**
     * Handle separator or new line.
     *
     * @param character single character
     */
    handleSeparatorOrNewLine(character: string): void {
        this.tokens.push({
            type: this.lastTextTokenType,
            value: this.value,
            start: this.start,
            end: this.i
        });
        if (character === '\n') {
            this.tokens.push({
                type: TokenType.eol,
                value: '\n',
                start: this.i,
                end: this.i + 1
            });
        } else if (SEPARATOR.test(character)) {
            this.tokens.push({
                type: TokenType.separator,
                value: character,
                start: this.i,
                end: this.i + 1
            });
        }

        this.value = '';
        this.start = this.i + 1;
        this.lastTextTokenType = TokenType.text;
    }

    /**
     * Handle quoted character.
     *
     * @param text complete text
     * @param character single char of text
     */
    handleQuotedCharacter(text: string, character: string): void {
        if (character === '"') {
            // we need to check if it is escaping next double quote
            if (this.i + 1 < text.length && text[this.i + 1] === '"') {
                this.value += '"';
                this.i++;
            } else {
                this.lastTextTokenType = TokenType.escaped;
                this.mode = 'default';
            }
        } else {
            this.value += character;
        }
    }
    /**
     * Get created tokens.
     *
     * @returns tokens
     */
    getTokens(): Token[] {
        return this.tokens;
    }
}

/**
 * Tokenize CSV text.
 *
 * @param text text
 * @returns list of token
 */
export function tokenize(text: string): Token[] {
    const csvTokenizer = new CsvTokenizer();
    csvTokenizer.createToken(text);

    return csvTokenizer.getTokens();
}
