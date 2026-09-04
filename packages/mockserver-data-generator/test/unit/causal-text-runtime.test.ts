import {
    createAllowedTokenResolver,
    createCausalTextGenerator,
    selectNucleus,
    type CausalLmSession,
    type CausalTokenizer
} from '../../src/model/causal-text-runtime.js';
import { createJsonRowGrammar } from '../../src/model/json-row-grammar.js';

describe('grammar-constrained causal text runtime', () => {
    test('reuses allowed-token candidates for equivalent grammar states', () => {
        const resolveAllowed = createAllowedTokenResolver(['{', ' ', 'x'], new Set());
        const state = createJsonRowGrammar([{ name: 'Name', valueKind: 'string', nullable: false }]);

        const first = resolveAllowed(state);
        const second = resolveAllowed({ ...state });

        expect(second).toBe(first);
        expect(first).toEqual([0, 1]);
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
        expect(session.run).toHaveBeenCalledTimes(2);
    });
});
