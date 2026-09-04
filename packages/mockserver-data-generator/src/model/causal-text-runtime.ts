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
    probabilities.sort((left, right) => right.probability - left.probability || left.id - right.id);
    const topP = Math.min(1, Math.max(Number.EPSILON, input.topP));
    let cumulative = 0;
    let count = 0;
    while (count < probabilities.length && cumulative < topP) {
        cumulative += probabilities[count]?.probability ?? 0;
        count += 1;
    }
    const nucleus = probabilities.slice(0, Math.max(1, count));
    const nucleusTotal = nucleus.reduce((sum, { probability }) => sum + probability, 0);
    const draw = random() * nucleusTotal;
    cumulative = 0;
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
                const token = sample(
                    output.lastLogits,
                    allowedTokenIds(state, tokenTexts, specialIds),
                    generated,
                    input,
                    random
                );
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
