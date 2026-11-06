import { jest } from '@jest/globals';
import {
    createAllowedTokenResolver,
    createCausalTextGenerator,
    trimToWordBoundary,
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
        encode: (text) => {
            const id = tokens.indexOf(text);
            if (id >= 0) {
                return [id];
            }
            return text.startsWith('b') ? [5, 5] : [4, 4];
        },
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
    const dispose = jest.fn<() => void>();
    const generator = createCausalTextGenerator({ tokenizer, session: { run, dispose } });
    const input = {
        prompt: 'a',
        grammar: [{ name: 'Name', valueKind: 'string' as const, nullable: false }],
        seed: 1,
        temperature: 1,
        topP: 1,
        repetitionPenalty: 1,
        maxNewTokens: 3,
        separators: 'compact' as const
    };
    return { generator, input, run, dispose };
}

describe('grammar-constrained causal text runtime', () => {
    test('reuses allowed-token candidates for equivalent grammar states', () => {
        const resolveAllowed = createAllowedTokenResolver(['{', ' ', 'x'], new Set());
        const state = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }], {
            separators: 'compact'
        });

        const first = resolveAllowed(state);
        const second = resolveAllowed({ ...state });

        expect(second).toBe(first);
        // Canonical separators allow no whitespace before the object.
        expect(Array.from(first)).toEqual([0]);
    });

    test('reuses allowed-token candidates across unbounded string lengths', () => {
        const resolveAllowed = createAllowedTokenResolver(['A', 'AB', '"', '\\n'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }], {
            separators: 'compact'
        });
        const shortValue = advanceText(initial, '{"Name":"A');
        const longerValue = advanceText(initial, '{"Name":"AB');

        expect(resolveAllowed(longerValue)).toBe(resolveAllowed(shortValue));
    });

    test('reuses bounded-string candidates while every token still fits', () => {
        const resolveAllowed = createAllowedTokenResolver(['A', 'North', '"', '\\n'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false, maxLength: 80 }], {
            separators: 'compact'
        });
        const shortValue = advanceText(initial, '{"Name":"A');
        const longerValue = advanceText(initial, '{"Name":"North');

        expect(resolveAllowed(longerValue)).toBe(resolveAllowed(shortValue));
    });

    test('filters multi-character tokens by the bounded string capacity', () => {
        const resolveAllowed = createAllowedTokenResolver(['A', 'AB', 'ABC', '"', '\\n'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 2 }], {
            separators: 'compact'
        });
        const emptyValue = advanceText(initial, '{"Code":"');
        const oneCharacter = advanceText(emptyValue, 'A');
        const fullValue = advanceText(oneCharacter, 'B');

        expect(Array.from(resolveAllowed(emptyValue))).toEqual([0, 1, 4]);
        expect(Array.from(resolveAllowed(oneCharacter))).toEqual([0, 3, 4]);
        expect(Array.from(resolveAllowed(fullValue))).toEqual([3]);
    });

    test('does not let a symbol-only token exhaust a bounded generated string', () => {
        const resolveAllowed = createAllowedTokenResolver(['[', 'A', '"'], new Set());
        const initial = createJsonRowGrammar([{ name: 'Code', valueKind: 'string', nullable: false, maxLength: 1 }], {
            separators: 'compact'
        });
        const emptyValue = advanceText(initial, '{"Code":"');

        expect(Array.from(resolveAllowed(emptyValue))).toEqual([1]);
    });

    test('threads the KV cache, feeds forced structure and prevents a higher-logit off-grammar token', async () => {
        const tokens = ['{', '}', '"', 'N', 'a', 'm', 'e', ':', 'A', 'c', 'Z', '<prompt>'];
        const id = (text: string): number => tokens.indexOf(text);
        // Sampled token per decode step; the prefill only precedes the forced opening.
        const desired = ['"', 'A', 'c', 'm', 'e', '"', '}'];
        const tokenizer: CausalTokenizer = {
            vocabSize: tokens.length,
            specialTokenIds: [11],
            encode: (text) => ([...text].every((character) => tokens.includes(character)) ? [...text].map(id) : [11]),
            decode: (ids) => ids.map((tokenId) => tokens[tokenId]).join('')
        };
        let step = 0;
        const run = jest.fn<CausalLmSession['run']>(async () => {
            const logits = new Float32Array(tokens.length).fill(-100);
            if (step > 0) {
                logits[id(desired[step - 1] ?? '}')] = 10;
            }
            // `Z` outscores the opening quote the grammar requires after the key.
            if (step === 1) {
                logits[id('Z')] = 100;
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
                maxNewTokens: 30,
                separators: 'compact'
            },
            new AbortController().signal
        );

        expect(result).toBe('{"Name":"Acme"}');
        expect(run).toHaveBeenCalledTimes(desired.length + 1);
        expect(run.mock.calls[0]?.[0].inputIds).toEqual(Int32Array.of(11));
        // The forced opening is fed in one step without its last token, which the model samples.
        expect(run.mock.calls[1]?.[0].inputIds).toEqual(Int32Array.from([...'{"Name":'].map(id)));
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
                    maxNewTokens: 1,
                    separators: 'compact'
                },
                controller.signal
            )
        ).rejects.toThrow();
    });

    test('serializes native session calls across concurrent generations', async () => {
        const tokens = ['{"Name":"Acme"}', '<prompt>', '{"Name":"'];
        const tokenizer: CausalTokenizer = {
            vocabSize: tokens.length,
            specialTokenIds: [1],
            encode: (text) => (text === tokens[2] ? [2] : [1]),
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
                return { lastLogits: Float32Array.of(10, -100, -100), presentKeyValues: new Map() };
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
            maxNewTokens: 1,
            separators: 'compact' as const
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
        const tokens = ['{"Name":"A"}', '{"Code":"B"}', '<prompt>', '{"Name":"', '{"Code":"'];
        const run = jest.fn(async () => ({
            lastLogits: Float32Array.of(10, 5, -100, -100, -100),
            presentKeyValues: new Map()
        }));
        const generator = createCausalTextGenerator({
            tokenizer: {
                vocabSize: tokens.length,
                specialTokenIds: [2],
                encode: (text) => (tokens.includes(text) ? [tokens.indexOf(text)] : [2]),
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

describe('grammar-constrained causal text runtime with canonical separators', () => {
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

    test('shortens a string the grammar cut at its maximum to its last complete word', async () => {
        const generator = createCausalTextGenerator({
            tokenizer,
            session: { run: jest.fn(preferring({ ' C': 9, A: 5, '"}': 1, '": "': 3, '"': 2 })) }
        });

        await expect(
            generator.generate(
                { ...input, grammar: [{ name: 'Name', valueKind: 'string', nullable: false, maxLength: 8 }] },
                new AbortController().signal
            )
        ).resolves.toBe('{"Name": " C C C"}');
    });

    test('keeps a string the model itself ends at its maximum', async () => {
        const generator = createCausalTextGenerator({
            tokenizer,
            session: { run: jest.fn(preferring({ A: 9, '"}': 1, '": "': 3, '"': 2 })) }
        });
        // The model prefers `A` while it may, and the closing quote when nothing else is allowed.
        const text = await generator.generate(
            { ...input, grammar: [{ name: 'Name', valueKind: 'string', nullable: false, maxLength: 4 }] },
            new AbortController().signal
        );
        expect(text).toBe('{"Name": "AAAA"}');
    });

    test('samples value tokens only from the top-p nucleus', async () => {
        // Given two value tokens of nearly equal probability
        const generator = createCausalTextGenerator({
            tokenizer,
            session: { run: jest.fn(preferring({ A: 1, B: 0.9 })) }
        });
        const generate = (topP: number) =>
            generator.generateBatch?.(
                {
                    ...input,
                    temperature: 1,
                    topP,
                    grammar: [{ name: 'Name', valueKind: 'string', nullable: false, maxLength: 2 }]
                },
                Array.from({ length: 16 }, (_unused, index) => index + 1),
                new AbortController().signal
            );

        // When rows are sampled with a nucleus that holds only the likelier token, and with the full distribution
        const narrow = new Set(await generate(0.5));
        const full = new Set(await generate(1));

        // Then the narrow nucleus never yields the less likely token
        expect(narrow).toEqual(new Set(['{"Name": "AA"}']));
        expect([...full].some((row) => row?.includes('B'))).toBe(true);
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
});

describe('word-boundary trimming', () => {
    test('drops the unfinished last word and trailing separators', () => {
        expect(trimToWordBoundary('Replaced the cooling fan and the')).toBe('Replaced the cooling fan and');
        expect(trimToWordBoundary('Crafted Fe')).toBe('Crafted');
        expect(trimToWordBoundary('Plan, build -')).toBe('Plan, build');
        expect(trimToWordBoundary('Plan, build, te')).toBe('Plan, build');
    });

    test('keeps the complete segments of a cut code', () => {
        expect(trimToWordBoundary('INV-2018-0')).toBe('INV-2018');
        expect(trimToWordBoundary('DOC-SPC-N/')).toBe('DOC-SPC-N');
        expect(trimToWordBoundary('A-1234567')).toBe('A-1234567');
    });

    test('keeps single words and values that would lose most of their text', () => {
        expect(trimToWordBoundary('Opportunit')).toBe('Opportunit');
        expect(trimToWordBoundary('A Longwordthatwascut')).toBe('A Longwordthatwascut');
    });
});

describe('repetition penalty scope', () => {
    test('does not count the token that opens a value as a repetition', async () => {
        const vocabulary = ['<p>', '{', '"', 'A', 'B', ':', ' ', ',', '}', ' "', ' null', ...'FirstSecond'];
        const ids = new Map(vocabulary.map((text, id) => [text, id]));
        const tokenizer: CausalTokenizer = {
            vocabSize: vocabulary.length,
            specialTokenIds: [0],
            encode: (text) => {
                if (text.startsWith('<prompt>')) {
                    return [0];
                }
                const encoded: number[] = [];
                let rest = text;
                const longest = (remaining: string): string | undefined =>
                    vocabulary
                        .filter((token, id) => id !== 0 && remaining.startsWith(token))
                        .sort((left, right) => right.length - left.length)[0];
                while (rest.length > 0) {
                    const match = longest(rest);
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
        // ` "` barely beats ` null`; a 1.15 penalty on ` "` would flip the second field to null.
        const scores: Readonly<Record<string, number>> = { ' "': 5, ' null': 4.8, A: 3, '"': 2, ',': 2, '}': 2 };
        const run = jest.fn(async (step: CausalLmInputs) => {
            const batch = step.batchSize ?? 1;
            const logits = new Float32Array(batch * vocabulary.length).fill(-100);
            for (let row = 0; row < batch; row += 1) {
                for (const [token, score] of Object.entries(scores)) {
                    logits[row * vocabulary.length + (ids.get(token) ?? 0)] = score;
                }
            }
            return { lastLogits: logits, presentKeyValues: new Map() };
        });
        const generator = createCausalTextGenerator({ tokenizer, session: { run } });

        const text = await generator.generate(
            {
                prompt: '<prompt>',
                grammar: [
                    { name: 'First', valueKind: 'string', nullable: true, maxLength: 1 },
                    { name: 'Second', valueKind: 'string', nullable: true, maxLength: 1 }
                ],
                seed: 1,
                temperature: 1e-6,
                topP: 1,
                repetitionPenalty: 1.15,
                maxNewTokens: 40,
                separators: 'spaced'
            },
            new AbortController().signal
        );

        expect(text).toBe('{"First": "A", "Second": "A"}');
    });
});
