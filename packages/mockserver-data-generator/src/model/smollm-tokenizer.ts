import type { CausalTokenizer } from './causal-text-runtime.js';

type RawMerge = string | readonly [string, string];

interface RawTokenizer {
    model: { type: string; vocab: Record<string, number>; merges: RawMerge[] };
    added_tokens?: Array<{ id: number; content: string; special: boolean }>;
}

export interface SmolLm2Tokenizer extends CausalTokenizer {
    specialTokenId(content: string): number;
}

function byteAlphabet(): { bytesToCharacters: string[]; charactersToBytes: ReadonlyMap<string, number> } {
    const bytes: number[] = [];
    for (let byte = 33; byte <= 126; byte += 1) {
        bytes.push(byte);
    }
    for (let byte = 161; byte <= 172; byte += 1) {
        bytes.push(byte);
    }
    for (let byte = 174; byte <= 255; byte += 1) {
        bytes.push(byte);
    }
    const represented = new Set(bytes);
    const codePoints = [...bytes];
    let extra = 0;
    for (let byte = 0; byte < 256; byte += 1) {
        if (!represented.has(byte)) {
            bytes.push(byte);
            codePoints.push(256 + extra);
            extra += 1;
        }
    }
    const bytesToCharacters = new Array<string>(256);
    const charactersToBytes = new Map<string, number>();
    bytes.forEach((byte, index) => {
        const character = String.fromCodePoint(codePoints[index] as number);
        bytesToCharacters[byte] = character;
        charactersToBytes.set(character, byte);
    });
    return { bytesToCharacters, charactersToBytes };
}

const { bytesToCharacters: BYTE_CHARACTER, charactersToBytes: CHARACTER_BYTE } = byteAlphabet();
const GPT2_SPLIT = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

function splitDigits(text: string): string[] {
    const result: string[] = [];
    let current = '';
    for (const character of text) {
        if (/\d/.test(character)) {
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

function byteSymbols(value: string): string[] {
    return Array.from(new TextEncoder().encode(value), (byte) => BYTE_CHARACTER[byte] as string);
}

function merge(symbols: string[], ranks: ReadonlyMap<string, number>): string[] {
    let result = symbols;
    while (result.length > 1) {
        let bestIndex = -1;
        let bestRank = Number.POSITIVE_INFINITY;
        for (let index = 0; index < result.length - 1; index += 1) {
            const rank = ranks.get(`${result[index]} ${result[index + 1]}`);
            if (rank !== undefined && rank < bestRank) {
                bestRank = rank;
                bestIndex = index;
            }
        }
        if (bestIndex < 0) {
            return result;
        }
        result = [
            ...result.slice(0, bestIndex),
            `${result[bestIndex]}${result[bestIndex + 1]}`,
            ...result.slice(bestIndex + 2)
        ];
    }
    return result;
}

/**
 * Byte-level BPE tokenizer matching the SmolLM2 tokenizer JSON used by the pilot.
 *
 * @param value
 */
export function createSmolLm2Tokenizer(value: unknown): SmolLm2Tokenizer {
    const input = value as RawTokenizer;
    if (input?.model?.type !== 'BPE' || !input.model.vocab || !Array.isArray(input.model.merges)) {
        throw new TypeError('SmolLM2 tokenizer contract is invalid: expected a BPE model with vocab and merges');
    }
    const vocabulary = new Map(Object.entries(input.model.vocab));
    const tokenById = new Map<number, string>([...vocabulary].map(([token, id]) => [id, token]));
    const ranks = new Map(
        input.model.merges.map((entry, index) => [typeof entry === 'string' ? entry : `${entry[0]} ${entry[1]}`, index])
    );
    const specialTokens = new Map(
        (input.added_tokens ?? []).filter(({ special }) => special).map(({ content, id }) => [content, id])
    );
    for (const [content, id] of specialTokens) {
        tokenById.set(id, content);
    }
    const specialContents = [...specialTokens.keys()].sort((left, right) => right.length - left.length);
    const specialPattern = specialContents.length
        ? new RegExp(
              `(${specialContents.map((content) => content.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('|')})`,
              'gu'
          )
        : undefined;

    const encodeOrdinary = (text: string, ids: number[]): void => {
        const preTokens = splitDigits(text).flatMap((part) => part.match(GPT2_SPLIT) ?? []);
        for (const preToken of preTokens) {
            const symbols = merge(byteSymbols(preToken), ranks);
            for (const symbol of symbols) {
                const id = vocabulary.get(symbol);
                if (id === undefined) {
                    throw new TypeError(`SmolLM2 vocabulary has no BPE symbol ${JSON.stringify(symbol)}`);
                }
                ids.push(id);
            }
        }
    };

    const encode = (text: string): number[] => {
        const ids: number[] = [];
        for (const part of specialPattern ? text.split(specialPattern) : [text]) {
            if (!part) {
                continue;
            }
            const specialId = specialTokens.get(part);
            if (specialId === undefined) {
                encodeOrdinary(part, ids);
            } else {
                ids.push(specialId);
            }
        }
        return ids;
    };

    const decode = (ids: ReadonlyArray<number>): string => {
        const bytes: number[] = [];
        for (const id of ids) {
            const token = tokenById.get(id);
            if (token === undefined) {
                throw new TypeError(`SmolLM2 tokenizer has no token for id ${id}`);
            }
            for (const character of token) {
                const byte = CHARACTER_BYTE.get(character);
                if (byte === undefined) {
                    throw new TypeError('SmolLM2 token contains an unmapped byte character');
                }
                bytes.push(byte);
            }
        }
        return new TextDecoder('utf8', { fatal: true }).decode(Uint8Array.from(bytes));
    };

    return Object.freeze({
        vocabSize: Math.max(...tokenById.keys()) + 1,
        encode,
        decode,
        specialTokenIds: Object.freeze([...specialTokens.values()]),
        specialTokenId: (content: string) => {
            const id = specialTokens.get(content);
            if (id === undefined) {
                throw new TypeError(`Unknown SmolLM2 special token ${JSON.stringify(content)}`);
            }
            return id;
        }
    });
}
