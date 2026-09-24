import {
    createAllowedTokenResolver,
    createCausalTextGenerator,
    repeatedNgramTokens,
    selectNucleus,
    type CausalLmInputs,
    type CausalLmOutputs,
    type CausalLmSession,
    type CausalTokenizer
} from '../../src/model/causal-text-runtime.js';
import { advanceText, createJsonRowGrammar } from '../../src/model/json-row-grammar.js';

function prefillFixture() {
    const tokens = ['{"Name":"', 'A', 'B', '"}', '<prompt-a>', '<prompt-b>'];
    const tokenizer: CausalTokenizer = {
        vocabSize: tokens.length,
        specialTokenIds: [4, 5],
        encode: (prompt) => (prompt.startsWith('b') ? [5, 5] : [4, 4]),
        decode: (ids) => ids.map((id) => tokens[id]).join('')
    };
    // Deliberately reuse native output buffers and mutate decode inputs: cached
    // prompt snapshots must not be exposed to either kind of session mutation.
    const key = Float32Array.of(0);
    const value = Float32Array.of(0);
    const logits = new Float32Array(tokens.length);
    const run = jest.fn(async (input: CausalLmInputs) => {
        const previous = input.pastKeyValues.get(0);
        const marker = previous?.key[0] ?? input.inputIds[0];
        expect(input.positionIds[0]).toBe(previous?.value[0] ?? 0);
        expect(input.attentionMask.length).toBe((previous?.value[0] ?? 0) + input.inputIds.length);
        const length = (previous?.value[0] ?? 0) + input.inputIds.length;
        previous?.key.fill(-999);
        previous?.value.fill(-999);
        logits.fill(-100);
        if (!previous) {
            logits[0] = 10;
        } else if (input.inputIds[0] === 0) {
            expect([4, 5]).toContain(marker);
            logits[1] = marker === 4 ? 0.5 : 0;
            logits[2] = marker === 4 ? 0 : 0.5;
        } else {
            logits[3] = 10;
        }
        key[0] = marker ?? 0;
        value[0] = length;
        return { lastLogits: logits, presentKeyValues: new Map([[0, { key, value }]]) };
    });
    const dispose = jest.fn();
    const generator = createCausalTextGenerator({ tokenizer, session: { run, dispose } });
    const input = {
        prompt: 'a',
        grammar: [{ name: 'Name', valueKind: 'string' as const, nullable: false }],
        seed: 1,
        temperature: 1,
        topP: 1,
        repetitionPenalty: 1,
        noRepeatNgramSize: 0,
        maxNewTokens: 3
    };
    return { generator, input, run, dispose };
}

describe('grammar-constrained causal text runtime', () => {
    test('reuses allowed-token candidates for equivalent grammar states', () => {
        const resolveAllowed = createAllowedTokenResolver(['{', ' ', 'x'], new Set());
        const state = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);

        const first = resolveAllowed(state);
        const second = resolveAllowed({ ...state });

        expect(second).toBe(first);
        expect(Array.from(first)).toEqual([0, 1]);
    });

    test('reuses allowed-token candidates across unbounded string lengths', () => {
        const resolveAllowed = createAllowedTokenResolver(['A', 'AB', '"', '\\n'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);
        const shortValue = advanceText(initial, '{"Name":"A');
        const longerValue = advanceText(initial, '{"Name":"AB');

        expect(resolveAllowed(longerValue)).toBe(resolveAllowed(shortValue));
    });

    test('reuses bounded-string candidates while every token still fits', () => {
        const resolveAllowed = createAllowedTokenResolver(['A', 'North', '"', '\\n'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false, maxLength: 80 }]);
        const shortValue = advanceText(initial, '{"Name":"A');
        const longerValue = advanceText(initial, '{"Name":"North');

        expect(resolveAllowed(longerValue)).toBe(resolveAllowed(shortValue));
    });

    test('filters multi-character tokens by the bounded string capacity', () => {
        const resolveAllowed = createAllowedTokenResolver(['A', 'AB', 'ABC', '"', '\\n'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 2 }]);
        const emptyValue = advanceText(initial, '{"Code":"');
        const oneCharacter = advanceText(emptyValue, 'A');
        const fullValue = advanceText(oneCharacter, 'B');

        expect(Array.from(resolveAllowed(emptyValue))).toEqual([0, 1, 4]);
        expect(Array.from(resolveAllowed(oneCharacter))).toEqual([0, 3, 4]);
        expect(Array.from(resolveAllowed(fullValue))).toEqual([3]);
    });

    test('does not let a symbol-only token exhaust a bounded generated string', () => {
        const resolveAllowed = createAllowedTokenResolver(['[', 'A', '"'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 1 }]);
        const emptyValue = advanceText(initial, '{"Code":"');

        expect(Array.from(resolveAllowed(emptyValue))).toEqual([1]);
    });

    test('selects an exact top-p nucleus without sorting the full vocabulary', () => {
        const probabilities = [
            { id: 2, probability: 0.4 },
            { id: 3, probability: 0.2 },
            { id: 1, probability: 0.4 }
        ];

        expect(selectNucleus(probabilities, 0.7)).toEqual([
            { id: 1, probability: 0.4 },
            { id: 2, probability: 0.4 }
        ]);
        expect(probabilities).toEqual([
            { id: 2, probability: 0.4 },
            { id: 3, probability: 0.2 },
            { id: 1, probability: 0.4 }
        ]);
    });

    test('matches the full-sort nucleus for varied probabilities and thresholds', () => {
        const probabilities = Array.from({ length: 127 }, (_unused, id) => ({
            id,
            probability: ((id * 37) % 23) + 1
        }));
        const total = probabilities.reduce((sum, { probability }) => sum + probability, 0);
        probabilities.forEach((entry) => (entry.probability /= total));

        for (const topP of [Number.EPSILON, 0.1, 0.5, 0.9, 1]) {
            const sorted = [...probabilities].sort(
                (left, right) => right.probability - left.probability || left.id - right.id
            );
            let cumulative = 0;
            let count = 0;
            while (count < sorted.length && cumulative < topP) {
                cumulative += sorted[count]!.probability;
                count += 1;
            }

            expect(selectNucleus(probabilities, topP)).toEqual(sorted.slice(0, Math.max(1, count)));
        }
    });

    test('threads the KV cache and prevents higher-logit off-grammar structure', async () => {
        const tokens = ['{', '}', '"', 'N', 'a', 'm', 'e', ':', 'A', 'c', 'Z', '<prompt>'];
        const desired = [0, 2, 3, 4, 5, 6, 2, 7, 2, 8, 9, 5, 6, 2, 1];
        const tokenizer: CausalTokenizer = {
            vocabSize: tokens.length,
            specialTokenIds: [11],
            encode: jest.fn(() => [11]),
            decode: (ids) => ids.map((id) => tokens[id]).join('')
        };
        let step = 0;
        const run = jest.fn(async () => {
            const logits = new Float32Array(tokens.length).fill(-100);
            logits[desired[step] ?? 1] = 10;
            if (step < 8) {
                logits[10] = 100;
            }
            step += 1;
            return {
                lastLogits: logits,
                presentKeyValues: new Map([[0, { key: new Float32Array([step]), value: new Float32Array([step]) }]])
            };
        });
        const session: CausalLmSession = { run };
        const generator = createCausalTextGenerator({ tokenizer, session });

        const result = await generator.generate(
            {
                prompt: 'ignored by fake tokenizer',
                grammar: [{ name: 'Name', valueKind: 'string', nullable: false }],
                seed: 3,
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15,
                noRepeatNgramSize: 4,
                maxNewTokens: 30
            },
            new AbortController().signal
        );

        expect(result).toBe('{"Name":"Acme"}');
        expect(run).toHaveBeenCalledTimes(desired.length);
        expect(run.mock.calls[0]?.[0].inputIds).toEqual(Int32Array.of(11));
        expect(run.mock.calls[1]?.[0].inputIds).toEqual(Int32Array.of(0));
        expect(run.mock.calls[1]?.[0].pastKeyValues.size).toBe(1);
    });

    test('rejects an incomplete object and observes cancellation between decode steps', async () => {
        const tokenizer: CausalTokenizer = {
            vocabSize: 2,
            specialTokenIds: [],
            encode: () => [1],
            decode: (ids) => (ids[0] === 0 ? '{' : '<prompt>')
        };
        const controller = new AbortController();
        const session: CausalLmSession = {
            run: jest.fn(async () => {
                controller.abort();
                return { lastLogits: Float32Array.of(1, 0), presentKeyValues: new Map() };
            })
        };
        const generator = createCausalTextGenerator({ tokenizer, session });

        await expect(
            generator.generate(
                {
                    prompt: 'prompt',
                    grammar: [{ name: 'Name', valueKind: 'string', nullable: false }],
                    seed: 1,
                    temperature: 1,
                    topP: 1,
                    repetitionPenalty: 1,
                    noRepeatNgramSize: 0,
                    maxNewTokens: 1
                },
                controller.signal
            )
        ).rejects.toThrow();
    });

    test('serializes native session calls across concurrent generations', async () => {
        const tokens = ['{"Name":"Acme"}', '<prompt>'];
        const tokenizer: CausalTokenizer = {
            vocabSize: tokens.length,
            specialTokenIds: [1],
            encode: () => [1],
            decode: (ids) => ids.map((id) => tokens[id]).join('')
        };
        let releaseFirst!: () => void;
        const firstGate = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });
        let active = 0;
        let maximumActive = 0;
        let calls = 0;
        const session: CausalLmSession = {
            run: jest.fn(async () => {
                calls += 1;
                active += 1;
                maximumActive = Math.max(maximumActive, active);
                if (calls === 1) {
                    await firstGate;
                }
                active -= 1;
                return { lastLogits: Float32Array.of(10, -100), presentKeyValues: new Map() };
            })
        };
        const generator = createCausalTextGenerator({ tokenizer, session });
        const input = {
            prompt: 'prompt',
            grammar: [{ name: 'Name', valueKind: 'string' as const, nullable: false }],
            seed: 1,
            temperature: 1,
            topP: 1,
            repetitionPenalty: 1,
            noRepeatNgramSize: 0,
            maxNewTokens: 1
        };

        const first = generator.generate(input, new AbortController().signal);
        const second = generator.generate(input, new AbortController().signal);
        await new Promise((resolve) => setImmediate(resolve));
        expect(session.run).toHaveBeenCalledTimes(1);
        releaseFirst();

        await expect(Promise.all([first, second])).resolves.toEqual(['{"Name":"Acme"}', '{"Name":"Acme"}']);
        expect(maximumActive).toBe(1);
        expect(session.run).toHaveBeenCalledTimes(1);
    });

    test('reuses only prompt KV and preserves fresh-generator output for independent row seeds', async () => {
        const { generator, input, run } = prefillFixture();
        const actual: string[] = [];
        const expected: string[] = [];
        for (const seed of [1, 2, 3, 5, 8, 1]) {
            actual.push(await generator.generate({ ...input, seed }, new AbortController().signal));
            const fresh = prefillFixture();
            expected.push(await fresh.generator.generate({ ...input, seed }, new AbortController().signal));
        }

        expect(new Set(expected).size).toBe(2);
        expect(actual).toEqual(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(1);
        expect(run).toHaveBeenCalledTimes(13);
    });

    test('keeps a single exact-prompt cache entry without leaking prior entity state', async () => {
        const { generator, input, run } = prefillFixture();
        for (const prompt of ['a', 'a', 'b', 'b', 'a', 'a ']) {
            const fresh = prefillFixture();
            const expected = await fresh.generator.generate({ ...input, prompt }, new AbortController().signal);
            await expect(generator.generate({ ...input, prompt }, new AbortController().signal)).resolves.toBe(
                expected
            );
        }

        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(4);
    });

    test('applies each caller grammar independently to shared prompt logits', async () => {
        const tokens = ['{"Name":"A"}', '{"Code":"B"}', '<prompt>'];
        const run = jest.fn(async () => ({
            lastLogits: Float32Array.of(10, 5, -100),
            presentKeyValues: new Map()
        }));
        const generator = createCausalTextGenerator({
            tokenizer: {
                vocabSize: tokens.length,
                specialTokenIds: [2],
                encode: () => [2],
                decode: (ids) => ids.map((id) => tokens[id]).join('')
            },
            session: { run }
        });
        const { input } = prefillFixture();

        for (const name of ['Name', 'Code', 'Name']) {
            await expect(
                generator.generate(
                    { ...input, grammar: [{ name, valueKind: 'string', nullable: false }] },
                    new AbortController().signal
                )
            ).resolves.toBe(name === 'Name' ? tokens[0] : tokens[1]);
        }
        expect(run).toHaveBeenCalledTimes(1);
    });

    test('clears successful prefill after caller cancellation', async () => {
        const { generator, input, run } = prefillFixture();
        const expected = await generator.generate(input, new AbortController().signal);
        const controller = new AbortController();
        const reason = new Error('caller canceled');
        controller.abort(reason);

        await expect(generator.generate(input, controller.signal)).rejects.toBe(reason);
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(2);
    });

    test('never caches prefill that finishes after cancellation', async () => {
        const { generator, input, run } = prefillFixture();
        const controller = new AbortController();
        const implementation = run.getMockImplementation();
        if (!implementation) {
            throw new Error('Missing fixture session');
        }
        run.mockImplementationOnce(async (step) => {
            const output = await implementation(step);
            controller.abort(new Error('prefill canceled'));
            return output;
        });

        await expect(generator.generate(input, controller.signal)).rejects.toThrow('prefill canceled');
        const expected = await generator.generate(input, new AbortController().signal);
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(2);
    });

    test('clears prefill after a failed native continuation', async () => {
        const { generator, input, run } = prefillFixture();
        const expected = await generator.generate(input, new AbortController().signal);
        run.mockRejectedValueOnce(new Error('native continuation failed'));

        await expect(generator.generate(input, new AbortController().signal)).rejects.toThrow(
            'native continuation failed'
        );
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(2);
    });

    test('does not retain malformed prefill logits', async () => {
        const { generator, input, run } = prefillFixture();
        run.mockResolvedValueOnce({ lastLogits: new Float32Array(), presentKeyValues: new Map() });

        await expect(generator.generate(input, new AbortController().signal)).rejects.toThrow('vocabulary size');
        const expected = await generator.generate(input, new AbortController().signal);
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(2);
    });

    test('clears prefill after incomplete output and disposal', async () => {
        const { generator, input, run, dispose } = prefillFixture();
        await expect(generator.generate({ ...input, maxNewTokens: 1 }, new AbortController().signal)).rejects.toThrow(
            'before completing'
        );
        const expected = await generator.generate(input, new AbortController().signal);
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(2);

        await generator.dispose?.();
        expect(dispose).toHaveBeenCalledTimes(1);
        // A reusable test session makes cache release observable without exposing
        // cache internals through a production-only testing API.
        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe(expected);
        expect(run.mock.calls.filter(([step]) => step.pastKeyValues.size === 0)).toHaveLength(3);
    });
});

describe('grammar-constrained causal text runtime, contract 2', () => {
    // Multi-character tokens for the structure, single characters so any forced text can be encoded.
    const vocabulary = ['{"', 'Name', '": "', 'A', 'B', ' C', '"}', '{', '"', ':', ' ', '}', 'N', 'a', 'm', 'e', '<p>'];
    const ids = new Map(vocabulary.map((text, id) => [text, id]));
    const tokenizer: CausalTokenizer = {
        vocabSize: vocabulary.length,
        specialTokenIds: [16],
        encode: (text) => {
            if (text.startsWith('<prompt>')) {
                return [16];
            }
            const encoded: number[] = [];
            let rest = text;
            const longestPrefix = (remaining: string): string | undefined =>
                vocabulary
                    .filter((token, id) => id !== 16 && remaining.startsWith(token))
                    .sort((left, right) => right.length - left.length)[0];
            while (rest.length > 0) {
                const match = longestPrefix(rest);
                if (!match) {
                    throw new Error('unencodable');
                }
                encoded.push(ids.get(match) ?? -1);
                rest = rest.slice(match.length);
            }
            return encoded;
        },
        decode: (tokens) => tokens.map((id) => vocabulary[id] ?? '').join('')
    };
    const preferring =
        (scores: Readonly<Record<string, number>>) =>
        (input: CausalLmInputs): Promise<CausalLmOutputs> => {
            const batch = input.batchSize ?? 1;
            const logits = new Float32Array(batch * vocabulary.length).fill(-100);
            for (let row = 0; row < batch; row += 1) {
                for (const [token, score] of Object.entries(scores)) {
                    logits[row * vocabulary.length + (ids.get(token) ?? 0)] = score;
                }
            }
            return Promise.resolve({
                lastLogits: logits,
                presentKeyValues: new Map([[0, { key: new Float32Array(batch), value: new Float32Array(batch) }]])
            });
        };
    const input = {
        prompt: '<prompt>',
        grammar: [{ name: 'Name', valueKind: 'string' as const, nullable: false, maxLength: 6, steerWithin: 3 }],
        seed: 1,
        temperature: 1e-6,
        topP: 1,
        repetitionPenalty: 1,
        noRepeatNgramSize: 0,
        maxNewTokens: 40,
        separators: 'spaced' as const
    };

    test('decodes the rows of one prompt together and feeds forced text without sampling', async () => {
        const run = jest.fn(preferring({ A: 5, B: 4, '"}': 1, '": "': 3, '"': 2 }));
        const generator = createCausalTextGenerator({ tokenizer, session: { run } });

        const rows = await generator.generateBatch?.(input, [1, 2], new AbortController().signal);

        expect(rows).toHaveLength(2);
        for (const row of rows ?? []) {
            expect(JSON.parse(row ?? 'null')).toEqual({ Name: expect.stringMatching(/^[AB]+$/u) });
        }
        const decodeSteps = run.mock.calls.slice(1).map(([step]) => step);
        // Both rows advance in one batch; the forced opening is fed token by token without sampling,
        // and its last token is left to the model (token healing).
        expect(decodeSteps[0]).toMatchObject({ batchSize: 2 });
        expect(Array.from(decodeSteps[0]?.inputIds ?? [])).toEqual([ids.get('{"'), ids.get('{"')]);
        expect(Array.from(decodeSteps[1]?.inputIds ?? [])).toEqual([ids.get('Name'), ids.get('Name')]);
    });

    test('ends a string at a word boundary instead of starting a word near its maximum length', async () => {
        const generator = createCausalTextGenerator({
            tokenizer,
            session: { run: jest.fn(preferring({ ' C': 9, A: 5, '"}': 1, '": "': 3, '"': 2 })) }
        });

        await expect(generator.generate(input, new AbortController().signal)).resolves.toBe('{"Name": " C C"}');
    });

    test('returns the completed rows instead of throwing when the batch is cancelled', async () => {
        const generator = createCausalTextGenerator({
            tokenizer,
            session: { run: jest.fn(preferring({ A: 5 })) }
        });
        const controller = new AbortController();
        controller.abort(new Error('budget used'));

        await expect(generator.generateBatch?.(input, [1, 2], controller.signal)).resolves.toEqual([
            undefined,
            undefined
        ]);
        await expect(generator.generate(input, controller.signal)).rejects.toThrow('budget used');
    });

    test('shares allowed value tokens across grammars with different field names', () => {
        const resolveAllowed = createAllowedTokenResolver(vocabulary, new Set([16]));
        const state = (name: string) =>
            advanceText(
                createJsonRowGrammar([{ name, valueKind: 'string', nullable: false, maxLength: 60 }], {
                    separators: 'spaced'
                }),
                `{"${name}": "AB`
            );

        expect(resolveAllowed(state('Name'))).toBe(resolveAllowed(state('Title')));
    });

    test('bans a token that would repeat an n-gram of the row values', () => {
        expect([...repeatedNgramTokens([1, 2, 3, 1, 2], 3)]).toEqual([3]);
        expect([...repeatedNgramTokens([1, 2, 3], 3)]).toEqual([]);
        expect([...repeatedNgramTokens([1, 1, 1], 0)]).toEqual([]);
    });
});
