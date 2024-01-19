import { Token, TokenType } from '../types';
const SEPARATOR = /[,;\t]/;

export function tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    let value = '';
    let mode: 'default' | 'quoted' = 'default';
    let start = 0;
    let lastTextTokenType: TokenType = TokenType.text;

    while (i < text.length) {
        const character = text[i];
        if (mode === 'default') {
            if (SEPARATOR.test(character) || character === '\n') {
                tokens.push({
                    type: lastTextTokenType,
                    value,
                    start,
                    end: i
                });
                if (character === '\n') {
                    tokens.push({
                        type: TokenType.eol,
                        value: '\n',
                        start: i,
                        end: i + 1
                    });
                } else if (SEPARATOR.test(character)) {
                    tokens.push({
                        type: TokenType.separator,
                        value: character,
                        start: i,
                        end: i + 1
                    });
                }
                value = '';
                start = i + 1;
                lastTextTokenType = TokenType.text;
            } else if (character === '"') {
                mode = 'quoted';
            } else {
                value += character;
            }
        } else if (mode === 'quoted') {
            if (character === '"') {
                // we need to check if it is escaping next double quote
                if (i + 1 < text.length && text[i + 1] === '"') {
                    value += '"';
                    i++;
                } else {
                    lastTextTokenType = TokenType.escaped;
                    mode = 'default';
                }
            } else {
                value += character;
            }
        }
        i++;
    }
    if (value) {
        tokens.push({
            type: TokenType.text,
            value,
            start,
            end: i
        });
    }
    return tokens;
}
