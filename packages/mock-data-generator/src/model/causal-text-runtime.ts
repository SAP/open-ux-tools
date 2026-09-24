import {
    advanceText,
    createJsonRowGrammar,
    forcedText,
    grammarComplete,
    textAllowed,
    valueStateKey,
    withinSteeringWindow,
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
    /** Token ids, `batchSize` rows of equal length, row-major. */
    inputIds: Int32Array;
    /** Attention mask, `batchSize` rows of past plus new length, row-major. */
    attentionMask: Int32Array;
    positionIds: Int32Array;
    pastKeyValues: ReadonlyMap<number, CausalLmKeyValue>;
    /** Rows decoded together; 1 when absent. */
    batchSize?: number;
}

export interface CausalLmOutputs {
    /** Logits of each row's last position, `batchSize` rows of the vocabulary size. */
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

// Bounds the shared allowed-token cache (at most one vocabulary-sized Int32Array per entry) and
// the forced-text tokenization cache; entries are equivalent grammar states, not requests.
const MAXIMUM_ALLOWED_TOKEN_ENTRIES = 512;
const MAXIMUM_FORCED_TEXT_ENTRIES = 4_096;

const VALUE_PHASES: ReadonlySet<string> = new Set(['before-value', 'in-string-value', 'in-nonstring-value']);

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

interface DecodedToken {
    id: number;
    text: string;
    plainStringLength?: number;
}

/**
 * Read an element after the caller has established the collection bounds.
 *
 * @param values bounded collection
 * @param index established in-range index
 * @param label privacy-safe collection label for an invariant failure
 * @returns the indexed element
 */
function requiredElement<T>(values: ArrayLike<T>, index: number, label: string): T {
    const value = values[index];
    if (value === undefined) {
        throw new RangeError(`${label} index is outside its established bounds`);
    }
    return value;
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
        if (
            rightIndex >= right.length ||
            (leftIndex < left.length &&
                requiredElement(left, leftIndex, 'left token') < requiredElement(right, rightIndex, 'right token'))
        ) {
            merged.push(requiredElement(left, leftIndex, 'left token'));
            leftIndex += 1;
        } else {
            merged.push(requiredElement(right, rightIndex, 'right token'));
            rightIndex += 1;
        }
    }
    return merged;
}

/**
 * Cache key of the legacy (`any` separators) path: the whole state, with lengths normalized where
 * they cannot change the result.
 *
 * @param state grammar state
 * @param maximumTokenLength longest token text
 * @returns cache key
 */
function legacyCacheKey(state: JsonRowGrammarState, maximumTokenLength: number): string {
    if (state.phase === 'in-string-value' && state.maximumStringLength !== undefined) {
        const capacity = state.maximumStringLength - state.stringLength;
        if (
            !state.escaped &&
            state.unicodeEscapeRemaining === 0 &&
            capacity >= maximumTokenLength + state.steerWithin
        ) {
            return JSON.stringify({
                ...state,
                stringLength: 0,
                maximumStringLength: maximumTokenLength
            });
        }
        return JSON.stringify(state);
    }
    return JSON.stringify({ ...state, stringLength: 0 });
}

/**
 * Cache the tokenizer-wide grammar scan for equivalent decoder states.
 *
 * With canonical separators (`compact`, `spaced`) the runtime feeds all grammar-forced text itself
 * and only asks for the tokens a value can take; those never reach into the next key, so their set
 * depends on the value's state alone and the cache is shared by every grammar the generator sees.
 * The legacy `any` mode keys on the whole state.
 *
 * @param texts decoded tokenizer vocabulary
 * @param specialIds token IDs that cannot be emitted
 * @returns resolver for allowed token IDs
 */
export function createAllowedTokenResolver(
    texts: ReadonlyArray<string | undefined>,
    specialIds: ReadonlySet<number>
): (state: JsonRowGrammarState) => Readonly<Int32Array> {
    const cache = new Map<string, Int32Array>();
    const decoded = texts.flatMap((tokenText, id): DecodedToken[] => {
        if (specialIds.has(id) || tokenText === undefined || tokenText.length === 0) {
            return [];
        }
        const length = plainStringLength(tokenText);
        return [{ id, text: tokenText, ...(length === undefined ? {} : { plainStringLength: length }) }];
    });
    const plainStringTokens = decoded.filter(
        (token): token is DecodedToken & { plainStringLength: number } => token.plainStringLength !== undefined
    );
    const allPlainIds = Object.freeze(plainStringTokens.map(({ id }) => id));
    const complexStringTokens = decoded.filter(({ plainStringLength: length }) => length === undefined);
    const byFirstCharacter = new Map<string, DecodedToken[]>();
    for (const token of decoded) {
        const first = String.fromCodePoint(token.text.codePointAt(0) ?? 0);
        const group = byFirstCharacter.get(first);
        if (group) {
            group.push(token);
        } else {
            byFirstCharacter.set(first, [token]);
        }
    }
    const plainCapacityCache = new Map<number, ReadonlyArray<number>>();
    const maximumPlainLength = Math.max(0, ...plainStringTokens.map(({ plainStringLength: length }) => length));
    const maximumTokenLength = Math.max(0, ...decoded.map(({ text }) => Array.from(text).length));
    const remember = (key: string, allowed: Int32Array): Int32Array => {
        if (cache.size >= MAXIMUM_ALLOWED_TOKEN_ENTRIES) {
            const oldest = cache.keys().next();
            if (!oldest.done) {
                cache.delete(oldest.value);
            }
        }
        cache.set(key, allowed);
        return allowed;
    };
    const canonicalAllowed = (state: JsonRowGrammarState): ReadonlyArray<number> => {
        const allows = (text: string): boolean => textAllowed(state, text, { withinValue: true });
        const inPlainString =
            state.phase === 'in-string-value' &&
            !state.escaped &&
            state.unicodeEscapeRemaining === 0 &&
            state.stringHasAlphanumeric;
        const farFromLimit =
            state.maximumStringLength === undefined ||
            state.maximumStringLength - state.stringLength >= maximumTokenLength + state.steerWithin;
        if (inPlainString && farFromLimit) {
            return mergeTokenIds(
                allPlainIds,
                complexStringTokens.filter(({ text }) => allows(text)).map(({ id }) => id)
            );
        }
        const ids: number[] = [];
        for (const [first, tokens] of byFirstCharacter) {
            // Characters are checked one by one, so no token can pass once its first character fails.
            if (!allows(first)) {
                continue;
            }
            for (const token of tokens) {
                if (allows(token.text)) {
                    ids.push(token.id);
                }
            }
        }
        return ids.sort((left, right) => left - right);
    };
    const legacyAllowed = (state: JsonRowGrammarState): ReadonlyArray<number> => {
        if (
            state.phase === 'in-string-value' &&
            !state.escaped &&
            state.unicodeEscapeRemaining === 0 &&
            state.maximumStringLength !== undefined &&
            state.steerWithin === 0
        ) {
            const capacity = Math.max(0, state.maximumStringLength - state.stringLength);
            const capacityKey = Math.min(capacity, maximumPlainLength);
            let plainIds: ReadonlyArray<number>;
            if (state.stringHasAlphanumeric) {
                plainIds = plainCapacityCache.get(capacityKey) ?? [];
                if (plainIds.length === 0 && capacityKey > 0) {
                    plainIds = Object.freeze(
                        plainStringTokens
                            .filter(({ plainStringLength: length }) => length <= capacity)
                            .map(({ id }) => id)
                    );
                    plainCapacityCache.set(capacityKey, plainIds);
                }
            } else {
                plainIds = plainStringTokens.filter(({ text }) => textAllowed(state, text)).map(({ id }) => id);
            }
            const complexIds = complexStringTokens.filter(({ text }) => textAllowed(state, text)).map(({ id }) => id);
            return mergeTokenIds(plainIds, complexIds);
        }
        const result: number[] = [];
        for (let id = 0; id < texts.length; id += 1) {
            const text = texts[id];
            if (!specialIds.has(id) && text !== undefined && textAllowed(state, text)) {
                result.push(id);
            }
        }
        return result;
    };
    return (state) => {
        // Outside values the next key matters, so those states keep the whole-state key.
        const canonical = state.separators !== 'any' && VALUE_PHASES.has(state.phase);
        const key = canonical
            ? `v${valueStateKey(state, maximumTokenLength)}`
            : `l${legacyCacheKey(state, maximumTokenLength)}`;
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        return remember(key, Int32Array.from(canonical ? canonicalAllowed(state) : legacyAllowed(state)));
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
        const child =
            right < heap.length &&
            probabilityIsHigher(
                requiredElement(heap, right, 'probability heap'),
                requiredElement(heap, left, 'probability heap')
            )
                ? right
                : left;
        if (
            !probabilityIsHigher(
                requiredElement(heap, child, 'probability heap'),
                requiredElement(heap, parent, 'probability heap')
            )
        ) {
            return;
        }
        [heap[parent], heap[child]] = [
            requiredElement(heap, child, 'probability heap'),
            requiredElement(heap, parent, 'probability heap')
        ];
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
        const highest = requiredElement(heap, 0, 'probability heap');
        const last = heap.pop();
        if (!last) {
            throw new RangeError('probability heap became empty during selection');
        }
        if (heap.length > 0) {
            heap[0] = last;
            siftDown(heap, 0);
        }
        nucleus.push(highest);
        cumulative += highest.probability;
    }
    return nucleus;
}

/**
 * Sample one allowed token.
 *
 * @param logits the row's next-token logits
 * @param allowed grammar-allowed token ids
 * @param history value tokens of the row so far; the repetition penalty applies to them only
 * @param input sampling options (`noRepeatNgramSize` is not applied: measured without benefit)
 * @param random the row's seeded random source
 * @param weights scratch buffer of the vocabulary size
 * @param heap scratch buffer of the vocabulary size
 * @returns the chosen token id
 */
function sample(
    logits: Float32Array,
    allowed: Readonly<Int32Array>,
    history: ReadonlyArray<number>,
    input: ConstrainedTextGenerationInput,
    random: () => number,
    weights: Float64Array,
    heap: Int32Array
): number {
    if (allowed.length === 0) {
        throw new Error('SFT grammar has no valid next token');
    }
    const candidates = allowed;
    const repeated = new Set(history);
    const temperature = Math.max(input.temperature, 1e-6);
    const score = (id: number): number => {
        const raw = logits[id] ?? Number.NEGATIVE_INFINITY;
        let penalized: number = raw;
        if (repeated.has(id) && input.repetitionPenalty !== 1) {
            penalized = raw > 0 ? raw / input.repetitionPenalty : raw * input.repetitionPenalty;
        }
        return penalized / temperature;
    };
    let maximum = Number.NEGATIVE_INFINITY;
    for (const id of candidates) {
        maximum = Math.max(maximum, score(id));
    }
    if (!Number.isFinite(maximum)) {
        throw new Error('SFT runtime returned no finite allowed logits');
    }
    let total = 0;
    for (let index = 0; index < candidates.length; index += 1) {
        const weight = Math.exp(score(requiredElement(candidates, index, 'candidate')) - maximum);
        weights[index] = weight;
        heap[index] = index;
        total += weight;
    }
    const isHigher = (left: number, right: number): boolean => {
        const leftWeight = requiredElement(weights, left, 'sampling weight');
        const rightWeight = requiredElement(weights, right, 'sampling weight');
        return (
            leftWeight > rightWeight ||
            (leftWeight === rightWeight &&
                requiredElement(candidates, left, 'candidate') < requiredElement(candidates, right, 'candidate'))
        );
    };
    const siftIndexDown = (start: number, size: number): void => {
        let parent = start;
        while (true) {
            const left = parent * 2 + 1;
            if (left >= size) {
                return;
            }
            const right = left + 1;
            const child =
                right < size &&
                isHigher(requiredElement(heap, right, 'sampling heap'), requiredElement(heap, left, 'sampling heap'))
                    ? right
                    : left;
            if (
                !isHigher(requiredElement(heap, child, 'sampling heap'), requiredElement(heap, parent, 'sampling heap'))
            ) {
                return;
            }
            [heap[parent], heap[child]] = [
                requiredElement(heap, child, 'sampling heap'),
                requiredElement(heap, parent, 'sampling heap')
            ];
            parent = child;
        }
    };
    for (let index = Math.floor(candidates.length / 2) - 1; index >= 0; index -= 1) {
        siftIndexDown(index, candidates.length);
    }
    const topP = Math.min(1, Math.max(Number.EPSILON, input.topP));
    const threshold = total * topP;
    let heapSize = candidates.length;
    let nucleusTotal = 0;
    while (heapSize > 0 && nucleusTotal < threshold) {
        const highest = requiredElement(heap, 0, 'sampling heap');
        heapSize -= 1;
        if (heapSize > 0) {
            heap[0] = requiredElement(heap, heapSize, 'sampling heap');
            siftIndexDown(0, heapSize);
        }
        heap[heapSize] = highest;
        nucleusTotal += requiredElement(weights, highest, 'sampling weight');
    }
    const draw = random() * nucleusTotal;
    let cumulative = 0;
    for (let index = candidates.length - 1; index >= heapSize; index -= 1) {
        const candidateIndex = requiredElement(heap, index, 'sampling heap');
        cumulative += requiredElement(weights, candidateIndex, 'sampling weight');
        if (draw < cumulative) {
            return requiredElement(candidates, candidateIndex, 'candidate');
        }
    }
    return requiredElement(candidates, requiredElement(heap, heapSize, 'sampling heap'), 'candidate');
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
 * Keep reusable prompt state separate from mutable native input/output buffers.
 *
 * @param output completed prompt inference
 * @returns an independent snapshot of logits and layer state
 */
function clonePrefillOutput(output: CausalLmOutputs): CausalLmOutputs {
    return {
        lastLogits: output.lastLogits.slice(),
        presentKeyValues: new Map(
            Array.from(output.presentKeyValues, ([layer, { key, value }]) => [
                layer,
                { key: key.slice(), value: value.slice() }
            ])
        )
    };
}

/**
 * Keep the given rows of a batched layer cache, in the given order.
 *
 * @param cache layer state of `batchSize` rows
 * @param batchSize rows in the cache
 * @param rows row indexes to keep; a row may repeat
 * @returns the selected rows
 */
function selectCacheRows(
    cache: ReadonlyMap<number, CausalLmKeyValue>,
    batchSize: number,
    rows: ReadonlyArray<number>
): ReadonlyMap<number, CausalLmKeyValue> {
    if (rows.length === batchSize && rows.every((row, index) => row === index)) {
        return cache;
    }
    const select = (data: Float32Array): Float32Array => {
        const rowSize = data.length / batchSize;
        const selected = new Float32Array(rows.length * rowSize);
        rows.forEach((row, index) => selected.set(data.subarray(row * rowSize, (row + 1) * rowSize), index * rowSize));
        return selected;
    };
    return new Map(Array.from(cache, ([layer, { key, value }]) => [layer, { key: select(key), value: select(value) }]));
}

interface DecodingSequence {
    state: JsonRowGrammarState;
    random: () => number;
    generated: number[];
    valueHistory: number[];
    /** Tokens to feed at the next step; forced text may take several. */
    pending: number[];
    outcome?: 'complete' | 'incomplete';
}

/**
 * Run the pilot causal model with token-level JSON shape constraints.
 *
 * @param options
 */
export function createCausalTextGenerator(options: CreateCausalTextGeneratorOptions): ConstrainedTextGenerator {
    const tokenTexts = tokenTextTable(options.tokenizer);
    const specialIds = new Set(options.tokenizer.specialTokenIds);
    const vocabSize = options.tokenizer.vocabSize;
    const resolveAllowedTokens = createAllowedTokenResolver(tokenTexts, specialIds);
    const closingQuoteToken = tokenTexts.findIndex((text, id) => text === '"' && !specialIds.has(id));
    const forcedTokenCache = new Map<string, ReadonlyArray<number>>();
    const forcedTokens = (text: string): ReadonlyArray<number> => {
        const cached = forcedTokenCache.get(text);
        if (cached) {
            return cached;
        }
        const ids = Object.freeze([...options.tokenizer.encode(text)]);
        if (ids.length === 0 || options.tokenizer.decode(ids) !== text) {
            throw new TypeError('SFT forced grammar text does not round-trip through the tokenizer');
        }
        if (forcedTokenCache.size >= MAXIMUM_FORCED_TEXT_ENTRIES) {
            forcedTokenCache.clear();
        }
        forcedTokenCache.set(text, ids);
        return ids;
    };
    let sessionQueue: Promise<void> = Promise.resolve();
    let cachedPrefill: { prompt: string; output: CausalLmOutputs } | undefined;
    const runSession = (input: CausalLmInputs, signal: AbortSignal, prompt?: string): Promise<CausalLmOutputs> => {
        const operation = sessionQueue
            .catch(() => undefined)
            .then(async () => {
                signal.throwIfAborted();
                // The session and tokenizer belong to this generator. Only exact
                // prompts share seed-independent prefill, never row continuations.
                if (prompt !== undefined && cachedPrefill?.prompt === prompt) {
                    return clonePrefillOutput(cachedPrefill.output);
                }
                if (prompt !== undefined) {
                    cachedPrefill = undefined;
                }
                const output = await options.session.run(input);
                signal.throwIfAborted();
                if (output.lastLogits.length !== vocabSize * (input.batchSize ?? 1)) {
                    throw new TypeError('SFT logits do not match tokenizer vocabulary size');
                }
                if (prompt !== undefined) {
                    cachedPrefill = { prompt, output: clonePrefillOutput(output) };
                    return clonePrefillOutput(cachedPrefill.output);
                }
                return output;
            });
        sessionQueue = operation.then(
            () => undefined,
            () => undefined
        );
        return operation;
    };

    /**
     * Decode one completion per seed for a shared prompt. Rows advance together, one token per
     * row and step; a lone row takes all grammar-forced tokens in one step. With canonical
     * separators the forced text is fed without sampling.
     *
     * @param input shared prompt, grammar and sampling options
     * @param seeds one per row
     * @param signal cancellation; with `partialOnAbort` completed rows are returned instead
     * @param partialOnAbort whether cancellation returns the completed rows
     * @returns completions, undefined where a row did not complete
     */
    const decode = async (
        input: ConstrainedTextGenerationInput,
        seeds: ReadonlyArray<number>,
        signal: AbortSignal,
        partialOnAbort: boolean
    ): Promise<ReadonlyArray<string | undefined>> => {
        if (!Number.isSafeInteger(input.maxNewTokens) || input.maxNewTokens <= 0) {
            throw new TypeError('SFT maxNewTokens must be a positive integer');
        }
        if (seeds.length === 0) {
            return [];
        }
        const promptIds = options.tokenizer.encode(input.prompt);
        if (promptIds.length === 0) {
            throw new TypeError('SFT prompt encoded to no tokens');
        }
        const separators = input.separators ?? 'any';
        const canonical = separators !== 'any';
        const sequences: DecodingSequence[] = seeds.map((seed) => ({
            state: createJsonRowGrammar(input.grammar, { separators }),
            random: seededRandom(seed),
            generated: [],
            valueHistory: [],
            pending: []
        }));
        const samplingWeights = new Float64Array(vocabSize);
        const samplingHeap = new Int32Array(vocabSize);
        const choose = (sequence: DecodingSequence, logits: Float32Array): void => {
            if (grammarComplete(sequence.state)) {
                sequence.outcome = 'complete';
                return;
            }
            if (sequence.generated.length >= input.maxNewTokens) {
                sequence.outcome = 'incomplete';
                return;
            }
            const forced = canonical ? forcedText(sequence.state) : '';
            // Forced text is fed without sampling, except its last token: the model samples across
            // the boundary itself (token healing), so a key and the value after it are tokenized
            // the way the model learned rather than split where the grammar stops forcing.
            const ids = forced.length > 0 ? forcedTokens(forced).slice(0, -1) : [];
            if (ids.length > 0) {
                const fed = options.tokenizer.decode(ids);
                sequence.state = advanceText(sequence.state, fed);
                sequence.generated.push(...ids);
                sequence.pending = [...ids];
                return;
            }
            const valuePhase = VALUE_PHASES.has(sequence.state.phase);
            const sampled = sample(
                logits,
                resolveAllowedTokens(sequence.state),
                valuePhase ? sequence.valueHistory : [],
                input,
                sequence.random,
                samplingWeights,
                samplingHeap
            );
            // Near a string's maximum length, a token that starts a new word ends the string instead,
            // so text stops at a word boundary rather than being cut off inside a word.
            const startsWord = /^\s/u.test(tokenTexts[sampled] ?? '');
            const token =
                startsWord && closingQuoteToken >= 0 && withinSteeringWindow(sequence.state)
                    ? closingQuoteToken
                    : sampled;
            const text = tokenTexts[token];
            if (text === undefined) {
                throw new TypeError('SFT selected an undecodable token');
            }
            sequence.generated.push(token);
            if (valuePhase) {
                sequence.valueHistory.push(token);
            }
            sequence.state = advanceText(sequence.state, text);
            if (grammarComplete(sequence.state)) {
                sequence.outcome = 'complete';
                return;
            }
            sequence.pending = [token];
        };

        const results = (): ReadonlyArray<string | undefined> =>
            sequences.map((sequence) =>
                sequence.outcome === 'complete' ? options.tokenizer.decode(sequence.generated) : undefined
            );
        try {
            const prefill = await runSession(
                {
                    inputIds: Int32Array.from(promptIds),
                    attentionMask: new Int32Array(promptIds.length).fill(1),
                    positionIds: Int32Array.from({ length: promptIds.length }, (_unused, index) => index),
                    pastKeyValues: new Map(),
                    batchSize: 1
                },
                signal,
                input.prompt
            );
            signal.throwIfAborted();
            sequences.forEach((sequence) => choose(sequence, prefill.lastLogits));
            let cache = prefill.presentKeyValues;
            // Batch row of each sequence in `cache`; every row of the prefill is row 0.
            const rows = sequences.map(() => 0);
            let cacheBatch = 1;
            let length = promptIds.length;
            while (true) {
                const active = sequences.flatMap((sequence, index) =>
                    sequence.outcome === undefined && sequence.pending.length > 0 ? [index] : []
                );
                if (active.length === 0) {
                    break;
                }
                signal.throwIfAborted();
                cache = selectCacheRows(
                    cache,
                    cacheBatch,
                    active.map((index) => requiredElement(rows, index, 'cache row'))
                );
                cacheBatch = active.length;
                active.forEach((index, row) => (rows[index] = row));
                // A lone row takes all its forced tokens at once; rows in a batch advance together.
                const step =
                    active.length === 1
                        ? requiredElement(sequences, requiredElement(active, 0, 'active'), 'sequence').pending.length
                        : 1;
                const inputIds = new Int32Array(active.length * step);
                active.forEach((index, row) => {
                    const sequence = requiredElement(sequences, index, 'sequence');
                    const fed = sequence.pending.splice(0, step);
                    inputIds.set(fed, row * step);
                });
                const pastLength = length;
                const output = await runSession(
                    {
                        inputIds,
                        attentionMask: new Int32Array(active.length * (pastLength + step)).fill(1),
                        positionIds: Int32Array.from(
                            { length: active.length * step },
                            (_unused, index) => pastLength + (index % step)
                        ),
                        pastKeyValues: cache,
                        batchSize: active.length
                    },
                    signal
                );
                signal.throwIfAborted();
                cache = output.presentKeyValues;
                length += step;
                active.forEach((index, row) => {
                    const sequence = requiredElement(sequences, index, 'sequence');
                    if (sequence.pending.length === 0) {
                        choose(sequence, output.lastLogits.subarray(row * vocabSize, (row + 1) * vocabSize));
                    }
                });
            }
        } catch (error) {
            cachedPrefill = undefined;
            if (partialOnAbort && signal.aborted) {
                return results();
            }
            throw error;
        }
        return results();
    };

    return Object.freeze({
        generate: async (input: ConstrainedTextGenerationInput, signal: AbortSignal) => {
            try {
                const [completion] = await decode(input, [input.seed], signal, false);
                if (completion === undefined) {
                    throw new Error('SFT generation ended before completing its JSON object');
                }
                return completion;
            } catch (error) {
                cachedPrefill = undefined;
                throw error;
            }
        },
        generateBatch: async (
            input: ConstrainedTextGenerationInput,
            seeds: ReadonlyArray<number>,
            signal: AbortSignal
        ) => decode(input, seeds, signal, true),
        dispose: async () => {
            await sessionQueue;
            cachedPrefill = undefined;
            await options.session.dispose?.();
        }
    });
}
