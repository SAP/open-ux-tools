import { readFileSync } from 'node:fs';
import {
    chunkFields,
    createMemoryCompletionStore,
    createRowGenerator,
    grammarFields,
    grammarTokenBound,
    numberFormatOf,
    processCompletionStore,
    renderRowPrompt,
    type ConstrainedTextGenerationInput,
    type ConstrainedTextGenerator
} from '../../src/model/sft-runtime.js';
import type { SftGenerationInput } from '../../src/types.js';
import { SHIPPED_PROMPT_TEMPLATE } from './sft-prompt-template.js';

const input: SftGenerationInput = {
    service: { urlPath: '/sap/opu/odata/books', odataVersion: '4.0' },
    entityName: 'BookType',
    fields: [
        { name: 'OpaqueTitle', primitiveType: 'string', nullable: false, maxLength: 80 },
        { name: 'Rating', primitiveType: 'decimal', nullable: true }
    ],
    rowCount: 2,
    seed: 42
};

describe('SFT row prompt contract', () => {
    // Prompts rendered by the package before the prompt texts moved into generation-config.json.
    const pinned = JSON.parse(
        readFileSync(new URL('fixtures/sft-row-prompt.pinned.json', import.meta.url), 'utf8')
    ) as Record<'single' | 'many', { input: Pick<SftGenerationInput, 'entityName' | 'fields'>; prompt: string }>;

    test.each(['single', 'many'] as const)(
        'renders the %s-field prompt byte for byte as the model was trained on',
        (name) => {
            // Given a fixed request and the shipped prompt template
            const { input: request, prompt } = pinned[name];
            // When the prompt is rendered
            const rendered = renderRowPrompt(SHIPPED_PROMPT_TEMPLATE, request);
            // Then it equals the pinned prompt exactly
            expect(rendered).toBe(prompt);
        }
    );
});

describe('SFT row generator', () => {
    test('retains graph evidence and guidance in the prompt', () => {
        const field = {
            name: 'Stage',
            primitiveType: 'string',
            nullable: false,
            description: 'Application-defined lifecycle stage',
            valueHelpTargets: ['Stages.Code'],
            foreignKeyTargets: ['Lifecycle.Code'],
            referencedBy: ['Document.Stage', 'Request.Stage'],
            currencyOrUnitField: 'Unit',
            allowedDomain: ['Q', 'R']
        };
        const prompt = renderRowPrompt(SHIPPED_PROMPT_TEMPLATE, { ...input, fields: [field] });
        expect(prompt).toContain('value-help-target=Stages.Code');
        expect(prompt).toContain('FK-target=Lifecycle.Code');
        expect(prompt).toContain('referenced-by=Document.Stage');
        expect(prompt).toContain('referenced-by=Request.Stage');
        expect(prompt).toContain('currency/unit-code-field=Unit');
        expect(prompt).toContain('guidance="Application-defined lifecycle stage"');
        expect(prompt).toContain('enum=["Q","R"]');
        expect(prompt.match(/Application-defined lifecycle stage/g)).toHaveLength(1);
        expect(prompt).not.toMatch(/Travel|Booking/u);
    });

    test('keeps original metadata length in the prompt independently of the generation bound', () => {
        const prompt = renderRowPrompt(SHIPPED_PROMPT_TEMPLATE, {
            ...input,
            fields: [
                { name: 'Caption', primitiveType: 'string', nullable: false, maxLength: 80, declaredMaxLength: 1024 }
            ]
        });
        expect(prompt).toContain('maxLength=1024');
        expect(prompt).not.toContain('maxLength=80');
    });
    test('preserves metadata key, label and numeric facets in the trained prompt', async () => {
        const generate = jest.fn(
            async (_request: Parameters<ConstrainedTextGenerator['generate']>[0]) => '{"Code":"D1","Amount":7}'
        );
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            }
        });
        const fields = [
            {
                name: 'Code',
                primitiveType: 'string',
                nullable: false,
                isKey: true,
                maxLength: 6,
                label: 'Document "state"'
            },
            {
                name: 'Amount',
                primitiveType: 'decimal',
                nullable: false,
                precision: 9,
                scale: 0,
                label: 'Net Amount',
                semanticRole: 'monetary_amount'
            }
        ];

        await generator.generate(
            { ...input, entityName: 'DocumentType', rowCount: 1, fields },
            new AbortController().signal
        );

        const prompt = generate.mock.calls[0]?.[0].prompt;
        expect(prompt).toContain(
            '- Code: string, [PRIMARY KEY], [required], maxLength=6, label="Document \\"state\\""'
        );
        expect(prompt).toContain(
            '- Amount: decimal, [required], precision=9, scale=0, label="Net Amount", semantics=monetary_amount'
        );
        expect(prompt).not.toContain('Fixed row:');
        expect(prompt).not.toMatch(/Travel|Booking/u);
    });

    test('requests one grammar-constrained row at a time with the ChatML prompt', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"Liquidity Handbook","Rating":4.7}')
            .mockResolvedValueOnce('{"OpaqueTitle":"Treasury Operations","Rating":4.4} trailing text');
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            }
        });

        const result = await generator.generate(input, new AbortController().signal);

        expect(result.rows).toEqual([
            { OpaqueTitle: 'Liquidity Handbook', Rating: 4.7 },
            { OpaqueTitle: 'Treasury Operations', Rating: 4.4 }
        ]);
        expect(result.statistics).toEqual({ attempts: 2, parsedResponses: 2 });
        expect(generate).toHaveBeenCalledTimes(2);
        expect(generate).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                prompt: expect.stringContaining('<|im_start|>system\nYou generate realistic'),
                grammar: [
                    { name: 'OpaqueTitle', valueKind: 'string', nullable: false, maxLength: 80, steerWithin: 12 },
                    {
                        name: 'Rating',
                        valueKind: 'number',
                        nullable: false,
                        numberFormat: { integer: false, maxIntegerDigits: 15, maxFractionDigits: 6 }
                    }
                ],
                seed: expect.any(Number),
                separators: 'spaced'
            }),
            expect.any(AbortSignal)
        );
        expect(generate.mock.calls[0]?.[0].prompt).toContain('OpaqueTitle: string, [required], maxLength=80');
        expect(generate.mock.calls[0]?.[0].prompt).toContain('<|im_start|>assistant\n');
        expect(generate.mock.calls[0]?.[0].maxNewTokens).toBe(
            grammarTokenBound(generate.mock.calls[0]?.[0].grammar ?? [])
        );
        expect(generate.mock.calls[0]?.[0].seed).not.toBe(generate.mock.calls[1]?.[0].seed);
    });

    test.each(['no object', '{"WrongKey":"value"}', '{"OpaqueTitle":"unterminated"'])(
        'leaves the row to the fallback on malformed or off-contract output: %s',
        async (output) => {
            const generator = createRowGenerator({
                promptTemplate: SHIPPED_PROMPT_TEMPLATE,
                fingerprint: 'sft-model-sha256',
                textGenerator: { generate: jest.fn(async () => output) },
                sampling: {
                    temperature: 0.6,
                    topP: 0.9,
                    repetitionPenalty: 1.15
                }
            });

            await expect(generator.generate({ ...input, rowCount: 1 }, new AbortController().signal)).resolves.toEqual({
                rows: [{}],
                statistics: { attempts: 1, parsedResponses: 0 }
            });
        }
    );

    test('chunks wide field sets and merges each generated row deterministically', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"FieldA":"A","FieldB":"B"}')
            .mockResolvedValueOnce('{"FieldC":"C","FieldD":"D"}')
            .mockResolvedValueOnce('{"FieldE":"E"}');
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
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

    test('generates both rows of a chunk consecutively so the grammar cache can be reused', async () => {
        const generate = jest.fn(async ({ grammar }: Parameters<ConstrainedTextGenerator['generate']>[0]) =>
            JSON.stringify(Object.fromEntries(grammar.map(({ name }) => [name, name])))
        );
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            },
            maxFieldsPerPrompt: 2
        });
        const fields = ['FieldA', 'FieldB', 'FieldC', 'FieldD'].map((name) => ({
            name,
            primitiveType: 'string',
            nullable: false
        }));

        await generator.generate({ ...input, fields, rowCount: 2 }, new AbortController().signal);

        expect(generate.mock.calls.map(([request]) => request.grammar.map(({ name }) => name))).toEqual([
            ['FieldA', 'FieldB'],
            ['FieldA', 'FieldB'],
            ['FieldC', 'FieldD'],
            ['FieldC', 'FieldD']
        ]);
    });

    test('identifies the failing row and field chunk without discarding the root cause', async () => {
        const cause = new Error('native session failed');
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"FieldA":"A","FieldB":"B"}')
            .mockRejectedValueOnce(cause);
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            },
            maxFieldsPerPrompt: 2
        });
        const fields = ['FieldA', 'FieldB', 'FieldC'].map((name) => ({
            name,
            primitiveType: 'string',
            nullable: false
        }));

        await expect(
            generator.generate({ ...input, fields, rowCount: 1 }, new AbortController().signal)
        ).rejects.toMatchObject({
            message: 'SFT generation failed for row 1, chunk 2/2: native session failed',
            cause
        });
    });

    test('preserves completed rows after a recoverable completion failure', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"First title","Rating":4.5}')
            .mockResolvedValueOnce('{"OpaqueTitle":"Incomplete title","Rating":')
            .mockResolvedValueOnce('{"OpaqueTitle":"Third title","Rating":4.7}');
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            }
        });

        const result = await generator.generate({ ...input, rowCount: 3 }, new AbortController().signal);

        expect(result.rows).toEqual([
            { OpaqueTitle: 'First title', Rating: 4.5 },
            {},
            { OpaqueTitle: 'Third title', Rating: 4.7 }
        ]);
        expect(result.statistics).toEqual({ attempts: 3, parsedResponses: 2 });
    });

    test('preserves completed rows when the local inference budget expires', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"Completed title","Rating":4.5}')
            .mockImplementation(() => new Promise(() => undefined));
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            },
            budgetMs: 10
        });

        const result = await generator.generate(input, new AbortController().signal);

        expect(result.rows).toEqual([{ OpaqueTitle: 'Completed title', Rating: 4.5 }, {}]);
        expect(result.statistics).toEqual({ attempts: 2, parsedResponses: 1 });
    });

    test('propagates parent cancellation even after completing a row', async () => {
        const controller = new AbortController();
        const reason = new Error('Request cancelled');
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"Completed title","Rating":4.5}')
            .mockImplementation(() => {
                controller.abort(reason);
                return new Promise(() => undefined);
            });
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            }
        });

        await expect(generator.generate(input, controller.signal)).rejects.toBe(reason);
    });

    test('bounds a non-cooperative backend and disposes it', async () => {
        const dispose = jest.fn(async () => undefined);
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: jest.fn(() => new Promise(() => undefined)), dispose },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            },
            budgetMs: 10
        });

        await expect(generator.generate({ ...input, rowCount: 1 }, new AbortController().signal)).resolves.toEqual({
            rows: [{}],
            statistics: { attempts: 1, parsedResponses: 0 }
        });
        await generator.dispose?.();
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    test.each([
        [100, 10],
        [10, 100]
    ])('honors the smaller local budget (artifact %i ms, request %i ms)', async (artifactBudget, requestBudget) => {
        const controller = new AbortController();
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: () => new Promise(() => undefined) },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            },
            budgetMs: artifactBudget
        });
        let watchdog: ReturnType<typeof setTimeout> | undefined;
        try {
            const result = await Promise.race([
                generator.generate({ ...input, rowCount: 1, budgetMs: requestBudget }, controller.signal),
                new Promise((resolve) => {
                    watchdog = setTimeout(() => resolve('request budget exceeded'), 50);
                })
            ]);

            expect(result).toEqual({ rows: [{}], statistics: { attempts: 1, parsedResponses: 0 } });
        } finally {
            clearTimeout(watchdog);
            controller.abort();
        }
    });

    test.each([0, -1, Number.POSITIVE_INFINITY])('rejects invalid request budget %s', async (budgetMs) => {
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: async () => '{"OpaqueTitle":"Completed title","Rating":4.5}' },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15
            }
        });

        await expect(
            generator.generate({ ...input, rowCount: 1, budgetMs }, new AbortController().signal)
        ).rejects.toThrow('SFT request budget must be positive');
    });
});

describe('SFT runtime contract', () => {
    const sampling = { temperature: 0.6, topP: 0.9, repetitionPenalty: 1.15 };
    const plannerInput: SftGenerationInput = {
        ...input,
        fields: Array.from({ length: 10 }, (_unused, index) => ({
            name: `Field${index}`,
            primitiveType: index === 9 ? 'int' : 'string',
            nullable: false,
            maxLength: 20,
            ...(index === 9 ? { minimum: 0, maximum: 255 } : {})
        })),
        coupledFieldGroups: [['Field7', 'Field8']]
    };

    test('splits planner fields into calls of at most eight, keeping coupled fields in one call', () => {
        const chunks = chunkFields(plannerInput.fields, 8, plannerInput.coupledFieldGroups);
        expect(chunks.map((chunk) => chunk.map(({ name }) => name))).toEqual([
            ['Field0', 'Field1', 'Field2', 'Field3', 'Field4', 'Field5', 'Field6'],
            ['Field7', 'Field8', 'Field9']
        ]);
        expect(chunkFields(plannerInput.fields.slice(0, 3), 2).map((chunk) => chunk.length)).toEqual([2, 1]);
    });

    test('derives type-exact number formats and a grammar-bounded token budget', () => {
        expect(
            numberFormatOf({ name: 'Byte', primitiveType: 'int', nullable: false, minimum: 0, maximum: 255 })
        ).toEqual({ integer: true, maxIntegerDigits: 3, maxFractionDigits: 0, minimum: 0, maximum: 255 });
        expect(
            numberFormatOf({ name: 'Amount', primitiveType: 'decimal', nullable: true, precision: 7, scale: 2 })
        ).toEqual({ integer: false, maxIntegerDigits: 5, maxFractionDigits: 2 });
        expect(
            numberFormatOf({ name: 'Rate', primitiveType: 'decimal', nullable: true, precision: 3, scale: 3 })
        ).toEqual({ integer: false, maxIntegerDigits: 1, maxFractionDigits: 3, maximum: 0.999 });
        expect(numberFormatOf({ name: 'Plain', primitiveType: 'decimal', nullable: true })).toMatchObject({
            maxIntegerDigits: 15,
            maxFractionDigits: 6
        });
        expect(numberFormatOf({ name: 'Text', primitiveType: 'string', nullable: true })).toBeUndefined();

        const grammar = grammarFields([
            { name: 'Title', primitiveType: 'string', nullable: false, maxLength: 40 },
            { name: 'Count', primitiveType: 'int', nullable: true, maximum: 99 }
        ]);
        expect(grammar[0]).toMatchObject({ steerWithin: 12 });
        // The model is not offered null for a field it is asked to fill, even when the column is nullable.
        expect(grammar[1]).toMatchObject({ nullable: false });
        expect(grammar[1]).toMatchObject({ numberFormat: { integer: true, maxIntegerDigits: 2 } });
        // "{", "}", each `"Name": ` with its separator, a 40-character string (escapes count twice), two digits.
        expect(grammarTokenBound(grammar)).toBe(2 + (5 + 6) + (2 + 80) + (5 + 6) + (2 + 2 + 0));
    });

    test('decodes all rows of a call together and returns the fields each row completed', async () => {
        const batches: Array<{ request: ConstrainedTextGenerationInput; seeds: ReadonlyArray<number> }> = [];
        const textGenerator: ConstrainedTextGenerator = {
            generate: jest.fn(async () => {
                throw new Error('rows of one prompt are decoded together');
            }),
            generateBatch: jest.fn(async (request: ConstrainedTextGenerationInput, seeds: ReadonlyArray<number>) => {
                batches.push({ request, seeds });
                const names = request.grammar.map(({ name }) => name);
                const row = JSON.stringify(
                    Object.fromEntries(names.map((name) => [name, name === 'Field9' ? 7 : 'x']))
                );
                // The second row of the first call does not complete.
                return seeds.map((_seed, index) => (index === 1 && names.includes('Field0') ? undefined : row));
            })
        };
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator,
            sampling
        });

        const result = await generator.generate(plannerInput, new AbortController().signal);

        expect(batches).toHaveLength(2);
        expect(batches[0]?.seeds).toHaveLength(2);
        expect(new Set(batches[0]?.seeds).size).toBe(2);
        expect(batches[0]?.request).toMatchObject({ separators: 'spaced' });
        expect(batches[0]?.request.maxNewTokens).toBe(grammarTokenBound(batches[0]?.request.grammar ?? []));
        expect(batches[1]?.request.grammar[2]).toMatchObject({
            name: 'Field9',
            numberFormat: { integer: true, maximum: 255 }
        });
        expect(Object.keys(result.rows[0] ?? {})).toHaveLength(10);
        expect(result.rows[1]).toEqual({ Field7: 'x', Field8: 'x', Field9: 7 });
        expect(result.statistics).toEqual({ attempts: 4, parsedResponses: 3 });
    });

    test('decodes rows one at a time with the configured separators when the backend has no batch decoding', async () => {
        const generate = jest.fn(async (request: ConstrainedTextGenerationInput) =>
            JSON.stringify(Object.fromEntries(request.grammar.map(({ name }) => [name, 'x'])))
        );
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate },
            sampling,
            separators: 'compact'
        });

        const result = await generator.generate(
            { ...plannerInput, fields: plannerInput.fields.slice(0, 2), coupledFieldGroups: [] },
            new AbortController().signal
        );

        expect(generate).toHaveBeenCalledTimes(2);
        expect(generate.mock.calls[0]?.[0]).toMatchObject({ separators: 'compact' });
        expect(result.rows).toEqual([
            { Field0: 'x', Field1: 'x' },
            { Field0: 'x', Field1: 'x' }
        ]);
    });
});

describe('SFT completion store', () => {
    const sampling = { temperature: 0.6, topP: 0.9, repetitionPenalty: 1.15 };
    const request: SftGenerationInput = {
        ...input,
        fields: [{ name: 'Remark', primitiveType: 'string', nullable: false, maxLength: 40 }],
        rowCount: 3
    };

    test('answers an identical request from the store and runs the model only for new rows', async () => {
        const store = createMemoryCompletionStore(10);
        const generateBatch = jest.fn(async (_request: ConstrainedTextGenerationInput, seeds: ReadonlyArray<number>) =>
            seeds.map((seed) => `{"Remark": "Note ${seed % 1000}"}`)
        );
        const create = () =>
            createRowGenerator({
                promptTemplate: SHIPPED_PROMPT_TEMPLATE,
                fingerprint: 'sft-model-sha256',
                textGenerator: { generate: jest.fn(), generateBatch },
                sampling,
                completionStore: store
            });

        const first = await create().generate(request, new AbortController().signal);
        const second = await create().generate({ ...request, rowCount: 4 }, new AbortController().signal);

        expect(second.rows.slice(0, 3)).toEqual(first.rows);
        expect(generateBatch).toHaveBeenCalledTimes(2);
        expect(generateBatch.mock.calls[1]?.[1]).toHaveLength(1);
    });

    test('keeps the most recent entries of a bounded store', () => {
        const store = createMemoryCompletionStore(2);
        store.set('a', '1');
        store.set('b', '2');
        store.get('a');
        store.set('c', '3');
        expect(store.get('a')).toBeUndefined();
        expect(store.get('b')).toBe('2');
        expect(store.get('c')).toBe('3');
        expect(processCompletionStore()).toBe(processCompletionStore());
    });

    test('caches single-row calls as well', async () => {
        const store = createMemoryCompletionStore();
        const generate = jest.fn(async () => '{"Remark": "Checked"}');
        const create = () =>
            createRowGenerator({
                promptTemplate: SHIPPED_PROMPT_TEMPLATE,
                fingerprint: 'sft-model-sha256',
                textGenerator: { generate },
                sampling,
                completionStore: store
            });
        const single = { ...request, rowCount: 1 };

        await create().generate(single, new AbortController().signal);
        const again = await create().generate(single, new AbortController().signal);

        expect(again.rows).toEqual([{ Remark: 'Checked' }]);
        expect(generate).toHaveBeenCalledTimes(1);
    });
});

describe('SFT runtime batches', () => {
    test('decodes the rows of a call in batches of at most four and stops between batches when cancelled', async () => {
        const controller = new AbortController();
        const batches: number[] = [];
        const generateBatch = jest.fn(
            async (_request: ConstrainedTextGenerationInput, seeds: ReadonlyArray<number>) => {
                batches.push(seeds.length);
                if (batches.length === 2) {
                    controller.abort(new Error('budget'));
                }
                return seeds.map(() => '{"Remark": "Done"}');
            }
        );
        const generator = createRowGenerator({
            promptTemplate: SHIPPED_PROMPT_TEMPLATE,
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: jest.fn(), generateBatch },
            sampling: { temperature: 0.6, topP: 0.9, repetitionPenalty: 1.15 },
            budgetMs: 60_000
        });

        const result = await generator
            .generate(
                {
                    ...input,
                    fields: [{ name: 'Remark', primitiveType: 'string', nullable: false, maxLength: 40 }],
                    rowCount: 10
                },
                controller.signal
            )
            .catch((error: unknown) => error);

        expect(batches).toEqual([4, 4]);
        // The caller's own cancellation still propagates.
        expect(result).toBeInstanceOf(Error);
    });
});
