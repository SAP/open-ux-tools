import {
    advanceText,
    createJsonRowGrammar,
    grammarComplete,
    textAllowed,
    type JsonRowGrammarState
} from './json-row-grammar.js';
import type { ConstrainedTextGenerator, ConstrainedTextGenerationInput } from './sft-runtime.js';

export interface CausalTokenizer {
    vocabSize: number;
    specialTokenIds: ReadonlyArray<number>;
    encode(text: string): ReadonlyArray<number>;
    decode(ids: ReadonlyArray<number>): string;
}

export interface CausalLmKeyValue {
    key: Float32Array;
    value: Float32Array;
}

export interface CausalLmInputs {
    inputIds: Int32Array;
    attentionMask: Int32Array;
    positionIds: Int32Array;
    pastKeyValues: ReadonlyMap<number, CausalLmKeyValue>;
}

export interface CausalLmOutputs {
    lastLogits: Float32Array;
    presentKeyValues: ReadonlyMap<number, CausalLmKeyValue>;
}

export interface CausalLmSession {
    run(input: CausalLmInputs): Promise<CausalLmOutputs>;
    dispose?(): Promise<void> | void;
}

export interface CreateCausalTextGeneratorOptions {
    tokenizer: CausalTokenizer;
    session: CausalLmSession;
}

function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    };
}

function allowedTokenIds(
    state: JsonRowGrammarState,
    texts: ReadonlyArray<string | undefined>,
    specialIds: ReadonlySet<number>
): number[] {
    const result: number[] = [];
    for (let id = 0; id < texts.length; id += 1) {
        const text = texts[id];
        if (!specialIds.has(id) && text !== undefined && textAllowed(state, text)) {
            result.push(id);
        }
    }
    return result;
}

interface DecodedToken {
    id: number;
    text: string;
    plainStringLength?: number;
}

function plainStringLength(text: string): number | undefined {
    if (text.length === 0) {
        return undefined;
    }
    let length = 0;
    for (const character of text) {
        if (character === '"' || character === '\\' || (character.codePointAt(0) ?? 0) < 0x20) {
            return undefined;
        }
        length += 1;
    }
    return length;
}

function mergeTokenIds(left: ReadonlyArray<number>, right: ReadonlyArray<number>): number[] {
    const merged: number[] = [];
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < left.length || rightIndex < right.length) {
        if (rightIndex >= right.length || (leftIndex < left.length && left[leftIndex]! < right[rightIndex]!)) {
            merged.push(left[leftIndex]!);
            leftIndex += 1;
        } else {
            merged.push(right[rightIndex]!);
            rightIndex += 1;
        }
    }
    return merged;
}

function grammarCacheKey(state: JsonRowGrammarState): string {
    if (state.phase === 'in-string-value' && state.maximumStringLength !== undefined) {
        return JSON.stringify(state);
    }
    return JSON.stringify({ ...state, stringLength: 0 });
}

/**
 * Cache the tokenizer-wide grammar scan for equivalent decoder states.
 *
 * @param texts decoded tokenizer vocabulary
 * @param specialIds token IDs that cannot be emitted
 * @returns resolver for allowed token IDs
 */
export function createAllowedTokenResolver(
    texts: ReadonlyArray<string | undefined>,
    specialIds: ReadonlySet<number>
): (state: JsonRowGrammarState) => ReadonlyArray<number> {
    const cache = new Map<string, ReadonlyArray<number>>();
    const decoded = texts.flatMap((tokenText, id): DecodedToken[] => {
        if (specialIds.has(id) || tokenText === undefined) {
            return [];
        }
        const length = plainStringLength(tokenText);
        return [{ id, text: tokenText, ...(length === undefined ? {} : { plainStringLength: length }) }];
    });
    const plainStringTokens = decoded.filter(
        (token): token is DecodedToken & { plainStringLength: number } => token.plainStringLength !== undefined
    );
    const complexStringTokens = decoded.filter(({ plainStringLength: length }) => length === undefined);
    const plainCapacityCache = new Map<number, ReadonlyArray<number>>();
    const maximumPlainLength = Math.max(0, ...plainStringTokens.map(({ plainStringLength: length }) => length));
    return (state) => {
        const key = grammarCacheKey(state);
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        let allowed: ReadonlyArray<number>;
        if (
            state.phase === 'in-string-value' &&
            !state.escaped &&
            state.unicodeEscapeRemaining === 0 &&
            state.maximumStringLength !== undefined
        ) {
            const capacity = Math.max(0, state.maximumStringLength - state.stringLength);
            const capacityKey = Math.min(capacity, maximumPlainLength);
            let plainIds = plainCapacityCache.get(capacityKey);
            if (!plainIds) {
                plainIds = Object.freeze(
                    plainStringTokens.filter(({ plainStringLength: length }) => length <= capacity).map(({ id }) => id)
                );
                plainCapacityCache.set(capacityKey, plainIds);
            }
            const complexIds = complexStringTokens.filter(({ text }) => textAllowed(state, text)).map(({ id }) => id);
            allowed = Object.freeze(mergeTokenIds(plainIds, complexIds));
        } else {
            allowed = Object.freeze(allowedTokenIds(state, texts, specialIds));
        }
        cache.set(key, allowed);
        return allowed;
    };
}

interface TokenProbability {
    id: number;
    probability: number;
}

function probabilityIsHigher(left: TokenProbability, right: TokenProbability): boolean {
    return left.probability > right.probability || (left.probability === right.probability && left.id < right.id);
}

function siftDown(heap: TokenProbability[], start: number): void {
    let parent = start;
    while (true) {
        const left = parent * 2 + 1;
        if (left >= heap.length) {
            return;
        }
        const right = left + 1;
        const child = right < heap.length && probabilityIsHigher(heap[right]!, heap[left]!) ? right : left;
        if (!probabilityIsHigher(heap[child]!, heap[parent]!)) {
            return;
        }
        [heap[parent], heap[child]] = [heap[child]!, heap[parent]!];
        parent = child;
    }
}

/**
 * Select the ordered top-p nucleus with a max heap instead of sorting every candidate.
 *
 * @param probabilities normalized token probabilities
 * @param topP cumulative probability threshold
 * @returns highest-probability candidates needed to reach the threshold
 */
export function selectNucleus(
    probabilities: ReadonlyArray<TokenProbability>,
    topP: number
): ReadonlyArray<TokenProbability> {
    const heap = [...probabilities];
    for (let index = Math.floor(heap.length / 2) - 1; index >= 0; index -= 1) {
        siftDown(heap, index);
    }
    const nucleus: TokenProbability[] = [];
    let cumulative = 0;
    while (heap.length > 0 && cumulative < topP) {
        const highest = heap[0]!;
        const last = heap.pop()!;
        if (heap.length > 0) {
            heap[0] = last;
            siftDown(heap, 0);
        }
        nucleus.push(highest);
        cumulative += highest.probability;
    }
    return nucleus;
}

function sample(
    logits: Float32Array,
    candidates: ReadonlyArray<number>,
    history: ReadonlyArray<number>,
    input: ConstrainedTextGenerationInput,
    random: () => number
): number {
    if (candidates.length === 0) {
        throw new Error('SFT grammar has no valid next token');
    }
    const repeated = new Set(history);
    const temperature = Math.max(input.temperature, 1e-6);
    const scores = candidates.map((id) => {
        const raw = logits[id] ?? Number.NEGATIVE_INFINITY;
        let penalized = raw;
        if (repeated.has(id) && input.repetitionPenalty !== 1) {
            penalized = raw > 0 ? raw / input.repetitionPenalty : raw * input.repetitionPenalty;
        }
        return { id, score: penalized / temperature };
    });
    const maximum = Math.max(...scores.map(({ score }) => score));
    if (!Number.isFinite(maximum)) {
        throw new Error('SFT runtime returned no finite allowed logits');
    }
    const probabilities = scores.map(({ id, score }) => ({ id, probability: Math.exp(score - maximum) }));
    const total = probabilities.reduce((sum, { probability }) => sum + probability, 0);
    probabilities.forEach((entry) => (entry.probability /= total));
    const topP = Math.min(1, Math.max(Number.EPSILON, input.topP));
    const nucleus = selectNucleus(probabilities, topP);
    const nucleusTotal = nucleus.reduce((sum, { probability }) => sum + probability, 0);
    const draw = random() * nucleusTotal;
    let cumulative = 0;
    for (const candidate of nucleus) {
        cumulative += candidate.probability;
        if (draw < cumulative) {
            return candidate.id;
        }
    }
    return nucleus.at(-1)!.id;
}

function tokenTextTable(tokenizer: CausalTokenizer): ReadonlyArray<string | undefined> {
    return Object.freeze(
        Array.from({ length: tokenizer.vocabSize }, (_unused, id) => {
            try {
                return tokenizer.decode([id]);
            } catch {
                return undefined;
            }
        })
    );
}

/**
 * Run the pilot causal model with token-level JSON shape constraints.
 *
 * @param options
 */
export function createCausalTextGenerator(options: CreateCausalTextGeneratorOptions): ConstrainedTextGenerator {
    const tokenTexts = tokenTextTable(options.tokenizer);
    const specialIds = new Set(options.tokenizer.specialTokenIds);
    let sessionQueue: Promise<void> = Promise.resolve();
    const runSession = (input: CausalLmInputs, signal: AbortSignal): Promise<CausalLmOutputs> => {
        const operation = sessionQueue
            .catch(() => undefined)
            .then(() => {
                signal.throwIfAborted();
                return options.session.run(input);
            });
        sessionQueue = operation.then(
            () => undefined,
            () => undefined
        );
        return operation;
    };
    return Object.freeze({
        generate: async (input: ConstrainedTextGenerationInput, signal: AbortSignal) => {
            if (!Number.isSafeInteger(input.maxNewTokens) || input.maxNewTokens <= 0) {
                throw new TypeError('SFT maxNewTokens must be a positive integer');
            }
            const promptIds = options.tokenizer.encode(input.prompt);
            if (promptIds.length === 0) {
                throw new TypeError('SFT prompt encoded to no tokens');
            }
            let state = createJsonRowGrammar(input.grammar);
            let inputIds = Int32Array.from(promptIds);
            let position = 0;
            let totalLength = promptIds.length;
            let pastKeyValues: ReadonlyMap<number, CausalLmKeyValue> = new Map();
            const generated: number[] = [];
            const random = seededRandom(input.seed);
            const resolveAllowedTokens = createAllowedTokenResolver(tokenTexts, specialIds);

            while (generated.length < input.maxNewTokens && !grammarComplete(state)) {
                signal.throwIfAborted();
                const sequenceLength = inputIds.length;
                const basePosition = position;
                const output = await runSession(
                    {
                        inputIds,
                        attentionMask: new Int32Array(totalLength).fill(1),
                        positionIds: Int32Array.from(
                            { length: sequenceLength },
                            (_unused, index) => basePosition + index
                        ),
                        pastKeyValues
                    },
                    signal
                );
                signal.throwIfAborted();
                if (output.lastLogits.length !== options.tokenizer.vocabSize) {
                    throw new TypeError('SFT logits do not match tokenizer vocabulary size');
                }
                const token = sample(output.lastLogits, resolveAllowedTokens(state), generated, input, random);
                const text = tokenTexts[token];
                if (text === undefined) {
                    throw new TypeError('SFT selected an undecodable token');
                }
                generated.push(token);
                state = advanceText(state, text);
                pastKeyValues = output.presentKeyValues;
                position += sequenceLength;
                totalLength += 1;
                inputIds = Int32Array.of(token);
            }
            if (!grammarComplete(state)) {
                throw new Error('SFT generation ended before completing its JSON object');
            }
            return options.tokenizer.decode(generated);
        },
        dispose: async () => {
            await sessionQueue;
            await options.session.dispose?.();
        }
    });
}
