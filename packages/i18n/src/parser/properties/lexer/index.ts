import type { Token, TokenType } from '../types';
import {
    COMMENT_START,
    WHITESPACE,
    END_OF_LINE,
    HEX_DIGIT,
    SEPARATOR,
    ELEMENT_ESCAPE_MAPPING,
    KEY_ESCAPE_MAPPING,
    UNICODE_CHARACTER_LENGTH
} from '../constant';

/**
 * Create token for image.
 *
 * @param type token type
 * @param image text image
 * @param start start
 * @param end end
 * @returns token
 */
export function createToken(type: TokenType, image: string, start: number, end: number): Token {
    return {
        type,
        image,
        start,
        end
    };
}

/**
 * Tokenize text.
 *
 * @param text text
 * @returns list of tokens
 */
export function tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    let image = '';
    let start = 0;
    while (i < text.length) {
        let character = text[i];

        if (character === '\n') {
            tokens.push(createToken('end-of-line', '\n', start, i + 1));
            start = i + 1;
        } else if (character === '\r') {
            if (i + 1 < text.length && text[i + 1] === '\n') {
                tokens.push(createToken('end-of-line', character + text[i + 1], i, i + 2));
                start = i + 2;
                i++;
            } else {
                tokens.push({
                    type: 'end-of-line',
                    image: character,
                    start: i,
                    end: i + 1
                });
                start = i + 1;
            }
        } else if (COMMENT_START.test(character)) {
            image += character;
            while (i + 1 < text.length) {
                const next = text[i + 1];
                if (END_OF_LINE.test(next)) {
                    break;
                }
                image += next;
                i++;
            }
            tokens.push(createToken('comment', image, start, i + 1));
            image = '';
            start = i + 1;
        } else if (WHITESPACE.test(character)) {
            image += character;
            while (i + 1 < text.length) {
                const next = text[i + 1];
                if (!WHITESPACE.test(next) || END_OF_LINE.test(next)) {
                    break;
                }
                image += next;
                i++;
            }
            tokens.push(createToken('whitespace', image, start, i + 1));
            image = '';
            start = i + 1;
        } else {
            // key-element pair
            while (i < text.length) {
                character = text[i];
                if (character === '\\') {
                    const next = text[i + 1];
                    if (next !== undefined) {
                        const mappedValue = KEY_ESCAPE_MAPPING[character + next];
                        if (mappedValue !== undefined) {
                            image += mappedValue;
                            i += 2;
                        } else {
                            i++;
                        }
                    }
                    continue;
                }
                if (WHITESPACE.test(character) || SEPARATOR.test(character) || END_OF_LINE.test(character)) {
                    break;
                }
                image += character;
                i++;
            }

            tokens.push(createToken('text', image, start, i));
            image = '';
            start = i;
            if (WHITESPACE.test(character)) {
                image += character;
                while (i + 1 < text.length) {
                    const next = text[i + 1];
                    if (!WHITESPACE.test(next) || END_OF_LINE.test(next)) {
                        break;
                    }
                    image += next;
                    i++;
                }
                tokens.push(createToken('whitespace', image, start, i + 1));
                image = '';
                start = i + 1;
                i++;
                character = text[i];
            }
            if (SEPARATOR.test(character)) {
                tokens.push(createToken('separator', character, start, i + 1));
                start = i + 1;
                i++;
                character = text[i];
            }
            if (WHITESPACE.test(character)) {
                image = character;
                while (i + 1 < text.length) {
                    const next = text[i + 1];
                    if (WHITESPACE.test(next) === false || END_OF_LINE.test(next)) {
                        break;
                    }
                    image += next;
                    i++;
                }
                tokens.push(createToken('whitespace', image, start, i + 1));
                image = '';
                start = i + 1;
                i++;
                character = text[i];
            }
            if (character === '\n') {
                tokens.push(createToken('end-of-line', '\n', start, i + 1));
                start = i + 1;
            } else if (character === '\r') {
                if (i + 1 < text.length && text[i + 1] === '\n') {
                    tokens.push(createToken('end-of-line', character + text[i + 1], i, i + 2));
                    start = i + 2;
                    i++;
                } else {
                    tokens.push({
                        type: 'end-of-line',
                        image: character,
                        start: i,
                        end: i + 1
                    });
                    start = i + 1;
                }
            } else {
                while (i < text.length) {
                    character = text[i];
                    if (character === '\\') {
                        const next = text[i + 1];
                        if (next !== undefined) {
                            const mappedValue = ELEMENT_ESCAPE_MAPPING[character + next];
                            if (mappedValue !== undefined) {
                                image += mappedValue;
                                i += 2;
                            } else if (next === '\n') {
                                tokens.push(createToken('text', image, start, i));
                                tokens.push(createToken('continuation-line-marker', '\\\n', i, i + 2));
                                start = i + 2;
                                i += 2;
                                image = '';
                            } else if (next === '\r') {
                                if (i + 1 < text.length && text[i + 2] === '\n') {
                                    tokens.push(createToken('text', image, start, i));
                                    tokens.push(createToken('continuation-line-marker', '\\\r\n', i, i + 3));
                                    start = i + 3;
                                    i += 3;
                                    image = '';
                                } else {
                                    tokens.push(createToken('text', image, start, i));
                                    tokens.push(createToken('continuation-line-marker', '\\\r', i, i + 2));
                                    start = i + 2;
                                    i += 2;
                                    image = '';
                                }
                            } else {
                                i++;
                            }
                        }
                        continue;
                    }
                    if (WHITESPACE.test(character)) {
                        if (image) {
                            tokens.push(createToken('text', image, start, i));
                            image = '';
                            start = i;
                        }
                        image = character;
                        while (i + 1 < text.length) {
                            const next = text[i + 1];
                            if (WHITESPACE.test(next) === false || END_OF_LINE.test(next)) {
                                break;
                            }
                            image += next;
                            i++;
                        }
                        tokens.push(createToken('whitespace', image, start, i + 1));
                        image = '';
                        start = i + 1;
                        i++;
                        character = text[i];
                        continue;
                    }
                    if (END_OF_LINE.test(character)) {
                        break;
                    }
                    image += character;
                    i++;
                }
                tokens.push(createToken('text', image, start, i));
                image = '';
                start = i;
                if (END_OF_LINE.test(character)) {
                    continue;
                }
            }
        }

        i++;
    }
    return tokens;
}
