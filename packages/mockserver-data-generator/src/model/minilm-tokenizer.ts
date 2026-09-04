const CONTINUATION_PREFIX = '##';
const MAX_WORD_CHARACTERS = 100;
const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;

export interface MiniLmTokenizer {
    encodeForModel(text: string): {
        inputIds: ReadonlyArray<number>;
        attentionMask: ReadonlyArray<number>;
        tokenTypeIds: ReadonlyArray<number>;
    };
}

function basicTokens(text: string): string[] {
    const result: string[] = [];
    let current = '';
    for (const character of text.toLowerCase()) {
        if (/\s/u.test(character)) {
            if (current) {
                result.push(current);
            }
            current = '';
        } else if (ASCII_PUNCTUATION.test(character)) {
            if (current) {
                result.push(current);
            }
            current = '';
            result.push(character);
        } else {
            current += character;
        }
    }
    if (current) {
        result.push(current);
    }
    return result;
}

function wordPieces(word: string, vocabulary: ReadonlyMap<string, number>): string[] {
    if (word.length > MAX_WORD_CHARACTERS) {
        return ['[UNK]'];
    }
    if (vocabulary.has(word)) {
        return [word];
    }
    const result: string[] = [];
    let start = 0;
    while (start < word.length) {
        let end = word.length;
        let match: string | undefined;
        while (end > start) {
            const candidate = `${start === 0 ? '' : CONTINUATION_PREFIX}${word.slice(start, end)}`;
            if (vocabulary.has(candidate)) {
                match = candidate;
                break;
            }
            end -= 1;
        }
        if (!match) {
            return ['[UNK]'];
        }
        result.push(match);
        start = end;
    }
    return result;
}

/**
 * Minimal uncased WordPiece tokenizer matching the pilot MiniLM encoder.
 *
 * @param vocabularyText
 */
export function createMiniLmTokenizer(vocabularyText: string): MiniLmTokenizer {
    const vocabulary = new Map(
        vocabularyText
            .split('\n')
            .map((token) => token.trimEnd())
            .filter(Boolean)
            .map((token, index) => [token, index])
    );
    for (const required of ['[UNK]', '[CLS]', '[SEP]']) {
        if (!vocabulary.has(required)) {
            throw new TypeError(`MiniLM vocabulary is missing ${required}`);
        }
    }
    return Object.freeze({
        encodeForModel: (text: string) => {
            const pieces = basicTokens(text).flatMap((word) => wordPieces(word, vocabulary));
            const inputIds = ['[CLS]', ...pieces, '[SEP]'].map((token) => vocabulary.get(token) as number);
            return Object.freeze({
                inputIds: Object.freeze(inputIds),
                attentionMask: Object.freeze(new Array<number>(inputIds.length).fill(1)),
                tokenTypeIds: Object.freeze(new Array<number>(inputIds.length).fill(0))
            });
        }
    });
}
