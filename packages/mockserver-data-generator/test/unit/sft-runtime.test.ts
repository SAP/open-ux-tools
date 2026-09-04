import { createPilotSftGenerator, type ConstrainedTextGenerator } from '../../src/model/sft-runtime.js';
import type { SftGenerationInput } from '../../src/index.js';

const input: SftGenerationInput = {
    service: { urlPath: '/sap/opu/odata/books', odataVersion: '4.0' },
    entityName: 'BookType',
    fields: [
        { name: 'OpaqueTitle', primitiveType: 'string', nullable: false, maxLength: 80 },
        { name: 'Rating', primitiveType: 'decimal', nullable: true }
    ],
    rowCount: 2,
    seed: 42,
    locale: 'en-IE'
};

describe('pilot-compatible SFT runtime', () => {
    test('requests one grammar-constrained row at a time with the pilot ChatML prompt', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"Liquidity Handbook","Rating":4.7}')
            .mockResolvedValueOnce('{"OpaqueTitle":"Treasury Operations","Rating":4.4} trailing text');
        const generator = createPilotSftGenerator({
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15,
                noRepeatNgramSize: 4,
                maxNewTokens: 300
            }
        });

        const result = await generator.generate(input, new AbortController().signal);

        expect(result.rows).toEqual([
            { OpaqueTitle: 'Liquidity Handbook', Rating: 4.7 },
            { OpaqueTitle: 'Treasury Operations', Rating: 4.4 }
        ]);
        expect(generate).toHaveBeenCalledTimes(2);
        expect(generate).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                prompt: expect.stringContaining('<|im_start|>system\nYou generate realistic'),
                grammar: [
                    { name: 'OpaqueTitle', valueKind: 'string', nullable: false },
                    { name: 'Rating', valueKind: 'number', nullable: true }
                ],
                seed: expect.any(Number),
                maxNewTokens: 300
            }),
            expect.any(AbortSignal)
        );
        expect(generate.mock.calls[0]?.[0].prompt).toContain('OpaqueTitle: string, [required], maxLength=80');
        expect(generate.mock.calls[0]?.[0].prompt).toContain('<|im_start|>assistant\n');
        expect(generate.mock.calls[0]?.[0].seed).not.toBe(generate.mock.calls[1]?.[0].seed);
    });

    test.each(['no object', '{"WrongKey":"value"}', '{"OpaqueTitle":"unterminated"'])(
        'rejects malformed or off-contract output: %s',
        async (output) => {
            const generator = createPilotSftGenerator({
                fingerprint: 'sft-model-sha256',
                textGenerator: { generate: jest.fn(async () => output) },
                sampling: {
                    temperature: 0.6,
                    topP: 0.9,
                    repetitionPenalty: 1.15,
                    noRepeatNgramSize: 4,
                    maxNewTokens: 300
                }
            });

            await expect(generator.generate({ ...input, rowCount: 1 }, new AbortController().signal)).rejects.toThrow();
        }
    );

    test('chunks wide field sets and merges each generated row deterministically', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"FieldA":"A","FieldB":"B"}')
            .mockResolvedValueOnce('{"FieldC":"C","FieldD":"D"}')
            .mockResolvedValueOnce('{"FieldE":"E"}');
        const generator = createPilotSftGenerator({
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15,
                noRepeatNgramSize: 4,
                maxNewTokens: 300
            },
            maxFieldsPerPrompt: 2
        });
        const fields = ['FieldA', 'FieldB', 'FieldC', 'FieldD', 'FieldE'].map((name) => ({
            name,
            primitiveType: 'string',
            nullable: false
        }));

        const result = await generator.generate({ ...input, fields, rowCount: 1 }, new AbortController().signal);

        expect(result.rows).toEqual([{ FieldA: 'A', FieldB: 'B', FieldC: 'C', FieldD: 'D', FieldE: 'E' }]);
        expect(generate).toHaveBeenCalledTimes(3);
        expect(generate.mock.calls.map(([request]) => request.grammar.map(({ name }) => name))).toEqual([
            ['FieldA', 'FieldB'],
            ['FieldC', 'FieldD'],
            ['FieldE']
        ]);
        expect(new Set(generate.mock.calls.map(([request]) => request.seed)).size).toBe(3);
    });

    test('bounds a non-cooperative backend and disposes it', async () => {
        const dispose = jest.fn(async () => undefined);
        const generator = createPilotSftGenerator({
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: jest.fn(() => new Promise(() => undefined)), dispose },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15,
                noRepeatNgramSize: 4,
                maxNewTokens: 300
            },
            budgetMs: 10
        });

        await expect(generator.generate({ ...input, rowCount: 1 }, new AbortController().signal)).rejects.toThrow(
            /timed out/i
        );
        await generator.dispose?.();
        expect(dispose).toHaveBeenCalledTimes(1);
    });
});
