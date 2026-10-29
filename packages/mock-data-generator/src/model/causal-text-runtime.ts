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
import type { ConstrainedTextGenerator, ConstrainedTextGenerationInput, JsonSeparators } from './sft-runtime.js';
import { rememberLatest } from './bounded-entries.js';
import { SFT_ALLOWED_TOKEN_CACHE_ENTRIES, SFT_FORCED_TEXT_CACHE_ENTRIES } from '../limits.js';
import { isErrorNamed, isRecord } from '../guards.js';

export interface CausalTokenizer {
    vocabSize: number;
    specialTokenIds: ReadonlyArray<number>;
    encode(text: string): ReadonlyArray<number>;
    decode(ids: ReadonlyArray<number>): string;
}

interface CausalLmKeyValue {
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

interface CreateCausalTextGeneratorOptions {
    tokenizer: CausalTokenizer;
    session: CausalLmSession;
}

const VALUE_PHASES: ReadonlySet<string> = new Set(['before-value', 'in-string-value', 'in-nonstring-value']);
const CONTENT_PHASES: ReadonlySet<string> = new Set(['in-string-value', 'in-nonstring-value']);

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
 * Cache the tokenizer-wide grammar scan for equivalent decoder states.
 *
 * The runtime feeds all grammar-forced text itself and asks for the tokens a value can take; those
 * never reach into the next key, so their set depends on the value's state alone and the cache is
 * shared by every grammar the generator sees. Outside values (the last token of forced text, which
 * the model samples across the boundary) the next key matters, so those states key on the whole state.
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
    const maximumTokenLength = Math.max(0, ...decoded.map(({ text }) => Array.from(text).length));
    // Entries are equivalent grammar states, not requests, so the oldest state is the one to drop.
    const remember = (key: string, allowed: Int32Array): Int32Array => {
        rememberLatest(cache, key, allowed, SFT_ALLOWED_TOKEN_CACHE_ENTRIES);
        return allowed;
    };
    const valueAllowed = (state: JsonRowGrammarState): ReadonlyArray<number> => {
        const allows = (text: string): boolean => textAllowed(state, text, { withinValue: true });
        const inPlainString = state.phase === 'in-string-value' && !state.escaped && state.stringHasAlphanumeric;
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
    const wholeStateAllowed = (state: JsonRowGrammarState): ReadonlyArray<number> => {
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
        const inValue = VALUE_PHASES.has(state.phase);
        const key = inValue
            ? `v${valueStateKey(state, maximumTokenLength)}`
            : `s${JSON.stringify({ ...state, stringLength: 0 })}`;
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        return remember(key, Int32Array.from(inValue ? valueAllowed(state) : wholeStateAllowed(state)));
    };
}

/**
 * Sample one allowed token.
 *
 * @param logits the row's next-token logits
 * @param allowed grammar-allowed token ids
 * @param history value tokens of the row so far; the repetition penalty applies to them only
 * @param input sampling options
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
            } catch (error) {
                // A token that is not text on its own (an unmapped id or a partial UTF-8 sequence) is never
                // allowed by the grammar; the tokenizer reports it as a TypeError.
                if (isErrorNamed(error, 'TypeError')) {
                    return undefined;
                }
                throw error;
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
    /** Fields whose string the grammar closed at its maximum while the model was still writing. */
    cutFields: Set<string>;
}

/**
 * A string cut at its maximum length, shortened to its last complete word: the text before the last
 * whitespace, without trailing separators; a code without whitespace keeps its complete segments. A
 * single word is kept as it is, and so is a value that would lose too much of its text.
 *
 * @param value the cut string
 * @returns the shortened string, or the value itself
 */
export function trimToWordBoundary(value: string): string {
    const boundary = value.search(/\s\S*$/u);
    if (boundary <= 0) {
        // A code cut inside its last segment keeps its complete segments (`INV-2018-0` becomes `INV-2018`).
        const separator = value.search(/[-_/.:][^-_/.:]*$/u);
        const code = separator > 0 ? value.slice(0, separator) : value;
        return /[\p{L}\p{N}]/u.test(code) && code.length * 2 >= value.length ? code : value;
    }
    const trimmed = value.slice(0, boundary).replace(/[\s,;:&+/(\-\u2013\u2014]+$/u, '');
    return /[\p{L}\p{N}]/u.test(trimmed) && trimmed.length * 3 >= value.length ? trimmed : value;
}

/**
 * Serialize a completion object with the separators the runtime enforces.
 *
 * @param row the completion's fields in order
 * @param separators the enforced separators
 * @returns the JSON text
 */
function serializeRow(row: Readonly<Record<string, unknown>>, separators: JsonSeparators): string {
    const [colon, comma] = separators === 'spaced' ? [': ', ', '] : [':', ','];
    return `{${Object.entries(row)
        .map(([key, value]) => `${JSON.stringify(key)}${colon}${JSON.stringify(value)}`)
        .join(comma)}}`;
}

/** A causal text generator's model and vocabulary, and the state its calls share. */
interface CausalDecoder {
    tokenizer: CausalTokenizer;
    session: CausalLmSession;
    /** Decoded text of each token id. */
    tokenTexts: ReadonlyArray<string | undefined>;
    /** Token ids that cannot be emitted. */
    specialIds: ReadonlySet<number>;
    vocabSize: number;
    /** Token ids the grammar allows in a state. */
    resolveAllowedTokens: (state: JsonRowGrammarState) => Readonly<Int32Array>;
    /** The id of a lone closing quote, or -1 when the vocabulary has none. */
    closingQuoteToken: number;
    /** Token ids of forced grammar text, by text. */
    forcedTokenCache: Map<string, ReadonlyArray<number>>;
    /** Serializes session runs; a failed run does not block the next one. */
    sessionQueue: Promise<void>;
    /** The output of the last prompt prefill, shared by calls with the exact same prompt. */
    cachedPrefill: { prompt: string; output: CausalLmOutputs } | undefined;
}

/** One decoding call: its request, its rows and the sampling scratch buffers they share. */
interface DecodingRun {
    input: ConstrainedTextGenerationInput;
    sequences: DecodingSequence[];
    samplingWeights: Float64Array;
    samplingHeap: Int32Array;
}

/**
 * The model's own first choice among the tokens it may emit.
 *
 * @param decoder the generator's model and vocabulary
 * @param logits the logits of one row
 * @returns the token id with the highest logit, or -1 when there is none
 */
function preferredToken(decoder: CausalDecoder, logits: Float32Array): number {
    let best = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let id = 0; id < decoder.vocabSize; id += 1) {
        const score = logits[id] ?? Number.NEGATIVE_INFINITY;
        if (score > bestScore && !decoder.specialIds.has(id)) {
            best = id;
            bestScore = score;
        }
    }
    return best;
}

/**
 * The token ids of forced grammar text, cached by text.
 *
 * @param decoder the generator's model and vocabulary
 * @param text the forced text
 * @returns the frozen token ids
 * @throws {TypeError} when the text does not round-trip through the tokenizer
 */
function forcedTokens(decoder: CausalDecoder, text: string): ReadonlyArray<number> {
    const cached = decoder.forcedTokenCache.get(text);
    if (cached) {
        return cached;
    }
    const ids = Object.freeze([...decoder.tokenizer.encode(text)]);
    if (ids.length === 0 || decoder.tokenizer.decode(ids) !== text) {
        throw new TypeError('SFT forced grammar text does not round-trip through the tokenizer');
    }
    rememberLatest(decoder.forcedTokenCache, text, ids, SFT_FORCED_TEXT_CACHE_ENTRIES);
    return ids;
}

/**
 * Run the session after every run queued before it. A prompt prefill (`prompt` set) is cached and
 * reused for the exact same prompt; row continuations are never cached.
 *
 * @param decoder the generator's model and shared state
 * @param input the session inputs
 * @param signal cancellation
 * @param prompt the prompt of a prefill run
 * @returns the session outputs
 */
function runSession(
    decoder: CausalDecoder,
    input: CausalLmInputs,
    signal: AbortSignal,
    prompt?: string
): Promise<CausalLmOutputs> {
    const operation = decoder.sessionQueue
        .catch(() => undefined)
        .then(async () => {
            signal.throwIfAborted();
            // The session and tokenizer belong to this generator. Only exact
            // prompts share seed-independent prefill, never row continuations.
            if (prompt !== undefined && decoder.cachedPrefill?.prompt === prompt) {
                return clonePrefillOutput(decoder.cachedPrefill.output);
            }
            if (prompt !== undefined) {
                decoder.cachedPrefill = undefined;
            }
            const output = await decoder.session.run(input);
            signal.throwIfAborted();
            if (output.lastLogits.length !== decoder.vocabSize * (input.batchSize ?? 1)) {
                throw new TypeError('SFT logits do not match tokenizer vocabulary size');
            }
            if (prompt !== undefined) {
                decoder.cachedPrefill = { prompt, output: clonePrefillOutput(output) };
                return clonePrefillOutput(decoder.cachedPrefill.output);
            }
            return output;
        });
    decoder.sessionQueue = operation.then(
        () => undefined,
        () => undefined
    );
    return operation;
}

/**
 * Feed the grammar-forced text of a row without sampling, except its last token: the model samples
 * across the boundary itself (token healing), so a key and the value after it are tokenized the way
 * the model learned rather than split where the grammar stops forcing.
 *
 * @param decoder the generator's model and vocabulary
 * @param sequence the row
 * @returns whether forced tokens were fed
 */
function feedForcedText(decoder: CausalDecoder, sequence: DecodingSequence): boolean {
    const forced = forcedText(sequence.state);
    const ids = forced.length > 0 ? forcedTokens(decoder, forced).slice(0, -1) : [];
    if (ids.length === 0) {
        return false;
    }
    const fed = decoder.tokenizer.decode(ids);
    sequence.state = advanceText(sequence.state, fed);
    sequence.generated.push(...ids);
    sequence.pending = [...ids];
    return true;
}

/**
 * Choose a row's next tokens from its logits: forced text when the grammar forces some, otherwise one
 * sampled token. Marks the row complete or incomplete when it ends.
 *
 * @param decoder the generator's model and vocabulary
 * @param run the decoding call
 * @param sequence the row
 * @param logits the row's logits
 */
function chooseNextToken(
    decoder: CausalDecoder,
    run: DecodingRun,
    sequence: DecodingSequence,
    logits: Float32Array
): void {
    const { input } = run;
    const { tokenTexts, closingQuoteToken } = decoder;
    if (grammarComplete(sequence.state)) {
        sequence.outcome = 'complete';
        return;
    }
    if (sequence.generated.length >= input.maxNewTokens) {
        sequence.outcome = 'incomplete';
        return;
    }
    if (feedForcedText(decoder, sequence)) {
        return;
    }
    // At a string's maximum only its closing quote is allowed. When the model's own first choice
    // was to keep writing, the string was cut and is shortened to a word boundary afterwards.
    if (
        sequence.state.phase === 'in-string-value' &&
        sequence.state.fieldName !== undefined &&
        sequence.state.maximumStringLength !== undefined &&
        sequence.state.stringLength >= sequence.state.maximumStringLength &&
        !(tokenTexts[preferredToken(decoder, logits)] ?? '').startsWith('"')
    ) {
        sequence.cutFields.add(sequence.state.fieldName);
    }
    const valuePhase = VALUE_PHASES.has(sequence.state.phase);
    const sampled = sample(
        logits,
        decoder.resolveAllowedTokens(sequence.state),
        valuePhase ? sequence.valueHistory : [],
        input,
        sequence.random,
        run.samplingWeights,
        run.samplingHeap
    );
    // Near a string's maximum length, a token that starts a new word ends the string instead,
    // so text stops at a word boundary rather than being cut off inside a word.
    const startsWord = /^\s/u.test(tokenTexts[sampled] ?? '');
    const token =
        startsWord && closingQuoteToken >= 0 && withinSteeringWindow(sequence.state) ? closingQuoteToken : sampled;
    const text = tokenTexts[token];
    if (text === undefined) {
        throw new TypeError('SFT selected an undecodable token');
    }
    sequence.generated.push(token);
    // Only value content counts as a repetition: not the token that opens a value across the key
    // boundary (a healed ` "`, a digit after the separator) and not the one that closes a string.
    if (
        CONTENT_PHASES.has(sequence.state.phase) &&
        !(sequence.state.phase === 'in-string-value' && text.startsWith('"'))
    ) {
        sequence.valueHistory.push(token);
    }
    sequence.state = advanceText(sequence.state, text);
    if (grammarComplete(sequence.state)) {
        sequence.outcome = 'complete';
        return;
    }
    sequence.pending = [token];
}

/**
 * The text of a completed row; strings the grammar cut at their maximum are shortened to a word
 * boundary.
 *
 * @param decoder the generator's tokenizer
 * @param sequence the completed row
 * @param separators the enforced separators
 * @returns the JSON text of the row
 * @throws {TypeError} when a row with cut strings is not a JSON object
 */
function completedText(decoder: CausalDecoder, sequence: DecodingSequence, separators: JsonSeparators): string {
    const text = decoder.tokenizer.decode(sequence.generated);
    if (sequence.cutFields.size === 0) {
        return text;
    }
    const row: unknown = JSON.parse(text);
    if (!isRecord(row)) {
        throw new TypeError('SFT completion row must be a JSON object');
    }
    for (const field of sequence.cutFields) {
        const value = row[field];
        if (typeof value === 'string') {
            row[field] = trimToWordBoundary(value);
        }
    }
    return serializeRow(row, separators);
}

/**
 * Prefill the shared prompt, then advance the rows together, one token per row and step, until every
 * row has ended; a lone row takes all its grammar-forced tokens in one step.
 *
 * @param decoder the generator's model and shared state
 * @param run the decoding call
 * @param promptIds the token ids of the prompt
 * @param signal cancellation
 */
async function advanceSequences(
    decoder: CausalDecoder,
    run: DecodingRun,
    promptIds: ReadonlyArray<number>,
    signal: AbortSignal
): Promise<void> {
    const { sequences } = run;
    const prefill = await runSession(
        decoder,
        {
            inputIds: Int32Array.from(promptIds),
            attentionMask: new Int32Array(promptIds.length).fill(1),
            positionIds: Int32Array.from({ length: promptIds.length }, (_unused, index) => index),
            pastKeyValues: new Map(),
            batchSize: 1
        },
        signal,
        run.input.prompt
    );
    signal.throwIfAborted();
    sequences.forEach((sequence) => chooseNextToken(decoder, run, sequence, prefill.lastLogits));
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
            decoder,
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
                const { vocabSize } = decoder;
                chooseNextToken(
                    decoder,
                    run,
                    sequence,
                    output.lastLogits.subarray(row * vocabSize, (row + 1) * vocabSize)
                );
            }
        });
    }
}

/**
 * Decode one completion per seed for a shared prompt. Rows advance together, one token per row and
 * step; a lone row takes all grammar-forced tokens in one step. Forced text is fed without sampling.
 *
 * @param decoder the generator's model and shared state
 * @param input shared prompt, grammar and sampling options
 * @param seeds one per row
 * @param signal cancellation; with `partialOnAbort` completed rows are returned instead
 * @param partialOnAbort whether cancellation returns the completed rows
 * @returns completions, undefined where a row did not complete
 */
async function decode(
    decoder: CausalDecoder,
    input: ConstrainedTextGenerationInput,
    seeds: ReadonlyArray<number>,
    signal: AbortSignal,
    partialOnAbort: boolean
): Promise<ReadonlyArray<string | undefined>> {
    if (!Number.isSafeInteger(input.maxNewTokens) || input.maxNewTokens <= 0) {
        throw new TypeError('SFT maxNewTokens must be a positive integer');
    }
    if (seeds.length === 0) {
        return [];
    }
    const promptIds = decoder.tokenizer.encode(input.prompt);
    if (promptIds.length === 0) {
        throw new TypeError('SFT prompt encoded to no tokens');
    }
    const separators = input.separators;
    const sequences: DecodingSequence[] = seeds.map((seed) => ({
        state: createJsonRowGrammar(input.grammar, { separators }),
        random: seededRandom(seed),
        generated: [],
        valueHistory: [],
        pending: [],
        cutFields: new Set<string>()
    }));
    const run: DecodingRun = {
        input,
        sequences,
        samplingWeights: new Float64Array(decoder.vocabSize),
        samplingHeap: new Int32Array(decoder.vocabSize)
    };
    const results = (): ReadonlyArray<string | undefined> =>
        sequences.map((sequence) =>
            sequence.outcome === 'complete' ? completedText(decoder, sequence, separators) : undefined
        );
    try {
        await advanceSequences(decoder, run, promptIds, signal);
    } catch (error) {
        decoder.cachedPrefill = undefined;
        if (partialOnAbort && signal.aborted) {
            return results();
        }
        throw error;
    }
    return results();
}

/**
 * Run the causal model with token-level JSON shape constraints.
 *
 * @param options the tokenizer and the session of the model
 * @returns the constrained text generator
 */
export function createCausalTextGenerator(options: CreateCausalTextGeneratorOptions): ConstrainedTextGenerator {
    const tokenTexts = tokenTextTable(options.tokenizer);
    const specialIds = new Set(options.tokenizer.specialTokenIds);
    const decoder: CausalDecoder = {
        tokenizer: options.tokenizer,
        session: options.session,
        tokenTexts,
        specialIds,
        vocabSize: options.tokenizer.vocabSize,
        resolveAllowedTokens: createAllowedTokenResolver(tokenTexts, specialIds),
        closingQuoteToken: tokenTexts.findIndex((text, id) => text === '"' && !specialIds.has(id)),
        forcedTokenCache: new Map<string, ReadonlyArray<number>>(),
        sessionQueue: Promise.resolve(),
        cachedPrefill: undefined
    };
    return Object.freeze({
        generate: async (input: ConstrainedTextGenerationInput, signal: AbortSignal) => {
            try {
                const [completion] = await decode(decoder, input, [input.seed], signal, false);
                if (completion === undefined) {
                    throw new Error('SFT generation ended before completing its JSON object');
                }
                return completion;
            } catch (error) {
                decoder.cachedPrefill = undefined;
                throw error;
            }
        },
        generateBatch: async (
            input: ConstrainedTextGenerationInput,
            seeds: ReadonlyArray<number>,
            signal: AbortSignal
        ) => decode(decoder, input, seeds, signal, true),
        dispose: async () => {
            await decoder.sessionQueue;
            decoder.cachedPrefill = undefined;
            await options.session.dispose?.();
        }
    });
}
