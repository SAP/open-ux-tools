import {
    createPilotSftGenerator,
    renderPilotSftPrompt,
    type ConstrainedTextGenerator
} from '../../src/model/sft-runtime.js';
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
    test.each([1, 2] as const)('retains graph evidence and guidance in prompt contract %s', (contractVersion) => {
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
        const prompt = renderPilotSftPrompt({ ...input, contractVersion, fields: [field] });
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
        const prompt = renderPilotSftPrompt({
            ...input,
            fields: [
                { name: 'Caption', primitiveType: 'string', nullable: false, maxLength: 80, declaredMaxLength: 1024 }
            ]
        });
        expect(prompt).toContain('maxLength=1024');
        expect(prompt).not.toContain('maxLength=80');
    });
    test('retains the trained pilot prompt when the planner supplies contract version 2', async () => {
        const generate = jest.fn(
            async (_request: Parameters<ConstrainedTextGenerator['generate']>[0]) =>
                '{"OpaqueTitle":"Treasury Handbook","Rating":4.5}'
        );
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
        const request = {
            ...input,
            contractVersion: 2 as const,
            rowCount: 1,
            fixedRows: [{ ID: 1 }],
            acceptedRoles: { ID: 'numeric_identifier' }
        };

        const result = await generator.generate(request, new AbortController().signal);

        expect(result.rows).toEqual([{ OpaqueTitle: 'Treasury Handbook', Rating: 4.5 }]);
        expect(generate.mock.calls[0]?.[0].prompt).toBe(renderPilotSftPrompt({ ...request, contractVersion: 1 }));
        expect(request.fixedRows).toEqual([{ ID: 1 }]);
        expect(request.contractVersion).toBe(2);
    });

    test('renders the v2 contract with real service context and no Travel/Booking template', () => {
        const prompt = renderPilotSftPrompt({
            contractVersion: 2,
            service: { urlPath: '/sap/opu/odata/finance', alias: 'cash-bank', odataVersion: '4.0' },
            entityName: 'CashBankType',
            fields: [
                {
                    name: 'Narrative',
                    primitiveType: 'string',
                    nullable: false,
                    maxLength: 80,
                    description: 'Operational bank description',
                    allowedDomain: ['Operating Account', 'Clearing Account']
                }
            ],
            rowCount: 1,
            seed: 42,
            locale: 'de-DE',
            fixedRows: [{ BankCountry: 'DE', BankInternalID: '0000123456' }],
            siblingGroup: 'narrative',
            acceptedRoles: { BankCountry: 'country' }
        });

        expect(prompt).not.toContain('/sap/opu/odata/finance');
        expect(prompt).toContain('Entity: CashBank');
        expect(prompt).toContain('Locale: de-DE');
        expect(prompt).toContain('Operational bank description');
        expect(prompt).toContain('Operating Account');
        expect(prompt).toContain('"BankCountry":"DE"');
        expect(prompt).toContain('Example of the kind of concrete, filled-in values expected');
        expect(prompt).toContain('W-1042');
        expect(prompt).toContain('Now return a JSON array of exactly 1 filled-in object');
        expect(prompt).toContain('Accepted roles: {"BankCountry":"country"}');
        expect(prompt).not.toContain('Return one JSON array containing exactly one object');
        expect(prompt).not.toMatch(/Travel|Booking/u);
    });

    test('preserves metadata key, label and numeric facets in the trained prompt for planner contract 2', async () => {
        const generate = jest.fn(
            async (_request: Parameters<ConstrainedTextGenerator['generate']>[0]) => '{"Code":"D1","Amount":7}'
        );
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
            { ...input, entityName: 'DocumentType', contractVersion: 2, rowCount: 1, fields },
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

    test('uses explicit model prompt version 2 for atomic sibling groups and matching fixed rows', async () => {
        const generate = jest.fn(async ({ grammar }: Parameters<ConstrainedTextGenerator['generate']>[0]) =>
            JSON.stringify(Object.fromEntries(grammar.map(({ name }) => [name, `${name} value`])))
        );
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
            maxFieldsPerPrompt: 2,
            promptContractVersion: 2
        });
        const fields = ['Summary', 'Description', 'Notes', 'Comment'].map((name) => ({
            name,
            primitiveType: 'string',
            nullable: false,
            maxLength: 80
        }));

        await generator.generate(
            {
                ...input,
                contractVersion: 2,
                fields,
                rowCount: 2,
                fixedRows: [
                    { ID: 1, Currency: 'EUR', Summary: 'Fallback summary', Description: 'Fallback description' },
                    { ID: 2, Currency: 'USD', Summary: 'Fallback summary', Description: 'Fallback description' }
                ],
                siblingGroup: 'narrative'
            },
            new AbortController().signal
        );

        expect(generate).toHaveBeenCalledTimes(2);
        expect(generate.mock.calls[0][0].grammar.map(({ name }) => name)).toEqual([
            'Summary',
            'Description',
            'Notes',
            'Comment'
        ]);
        expect(generate.mock.calls[0][0].prompt).toContain('Fixed row: {"ID":1,"Currency":"EUR"}');
        expect(generate.mock.calls[1][0].prompt).toContain('Fixed row: {"ID":2,"Currency":"USD"}');
        expect(generate.mock.calls[0][0].prompt).toContain('"Currency":"EUR"');
        expect(generate.mock.calls[0][0].prompt).not.toContain('Fallback summary');
        expect(generate.mock.calls[0][0].prompt).not.toContain('Fallback description');
        expect(generate.mock.calls[0][0].prompt.indexOf('Fields:')).toBeLessThan(
            generate.mock.calls[0][0].prompt.indexOf('Fixed row:')
        );
    });

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
        expect(result.statistics).toEqual({ attempts: 2, parsedResponses: 2 });
        expect(generate).toHaveBeenCalledTimes(2);
        expect(generate).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                prompt: expect.stringContaining('<|im_start|>system\nYou generate realistic'),
                grammar: [
                    { name: 'OpaqueTitle', valueKind: 'string', nullable: false, maxLength: 80 },
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

    test('generates both rows of a chunk consecutively so the grammar cache can be reused', async () => {
        const generate = jest.fn(async ({ grammar }: Parameters<ConstrainedTextGenerator['generate']>[0]) =>
            JSON.stringify(Object.fromEntries(grammar.map(({ name }) => [name, name])))
        );
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

    test('uses three-field chunks for reliable ordinary-entity JSON generation', async () => {
        const generate = jest.fn(async ({ grammar }: Parameters<ConstrainedTextGenerator['generate']>[0]) =>
            JSON.stringify(Object.fromEntries(grammar.map(({ name }) => [name, name])))
        );
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
        const fields = Array.from({ length: 13 }, (_unused, index) => ({
            name: `LongBusinessProperty${index + 1}`,
            primitiveType: 'string',
            nullable: false
        }));

        await generator.generate({ ...input, fields, rowCount: 1 }, new AbortController().signal);

        expect(generate.mock.calls.map(([request]) => request.grammar.length)).toEqual([3, 3, 3, 3, 1]);
    });

    test('uses eight-field chunks for entities with at least one hundred residual fields', async () => {
        const generate = jest.fn(async ({ grammar }: Parameters<ConstrainedTextGenerator['generate']>[0]) =>
            JSON.stringify(Object.fromEntries(grammar.map(({ name }) => [name, name])))
        );
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
        const fields = Array.from({ length: 101 }, (_unused, index) => ({
            name: `Field${index + 1}`,
            primitiveType: 'bool',
            nullable: false
        }));

        await generator.generate({ ...input, fields, rowCount: 1 }, new AbortController().signal);

        expect(generate.mock.calls.map(([request]) => request.grammar.length)).toEqual([
            8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 5
        ]);
    });

    test('splits an incomplete chunk and reports every raw completion attempt', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockRejectedValueOnce(new Error('SFT generation ended before completing its JSON object'))
            .mockResolvedValueOnce('{"FieldA":"A","FieldB":"B","FieldC":"C","FieldD":"D"}')
            .mockResolvedValueOnce('{"FieldE":"E","FieldF":"F","FieldG":"G","FieldH":"H"}');
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
            maxFieldsPerPrompt: 8
        });
        const fields = ['FieldA', 'FieldB', 'FieldC', 'FieldD', 'FieldE', 'FieldF', 'FieldG', 'FieldH'].map((name) => ({
            name,
            primitiveType: 'string',
            nullable: false
        }));

        const result = await generator.generate({ ...input, fields, rowCount: 1 }, new AbortController().signal);

        expect(result.rows).toEqual([
            { FieldA: 'A', FieldB: 'B', FieldC: 'C', FieldD: 'D', FieldE: 'E', FieldF: 'F', FieldG: 'G', FieldH: 'H' }
        ]);
        expect(result.statistics).toEqual({ attempts: 3, parsedResponses: 2 });
        expect(generate.mock.calls.map(([request]) => request.grammar.map(({ name }) => name))).toEqual([
            ['FieldA', 'FieldB', 'FieldC', 'FieldD', 'FieldE', 'FieldF', 'FieldG', 'FieldH'],
            ['FieldA', 'FieldB', 'FieldC', 'FieldD'],
            ['FieldE', 'FieldF', 'FieldG', 'FieldH']
        ]);
    });

    test('identifies the failing row and field chunk without discarding the root cause', async () => {
        const cause = new TypeError('SFT completion contains an unterminated JSON object');
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"FieldA":"A","FieldB":"B"}')
            .mockRejectedValueOnce(cause);
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
        const fields = ['FieldA', 'FieldB', 'FieldC'].map((name) => ({
            name,
            primitiveType: 'string',
            nullable: false
        }));

        await expect(
            generator.generate({ ...input, fields, rowCount: 1 }, new AbortController().signal)
        ).rejects.toMatchObject({
            message: 'SFT generation failed for row 1, chunk 2/2: SFT completion contains an unterminated JSON object',
            cause
        });
    });

    test('preserves completed rows after a recoverable planner-v2 completion failure', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"First title","Rating":4.5}')
            .mockResolvedValueOnce('{"OpaqueTitle":"Incomplete title","Rating":')
            .mockResolvedValueOnce('{"OpaqueTitle":"Third title","Rating":4.7}');
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
            promptContractVersion: 2
        });

        const result = await generator.generate(
            { ...input, contractVersion: 2, rowCount: 3 },
            new AbortController().signal
        );

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
            budgetMs: 10
        });

        const result = await generator.generate({ ...input, contractVersion: 2 }, new AbortController().signal);

        expect(result.rows).toEqual([{ OpaqueTitle: 'Completed title', Rating: 4.5 }, {}]);
        expect(result.statistics).toEqual({ attempts: 2, parsedResponses: 1 });
    });

    test('does not publish incomplete multi-chunk rows when the local budget expires', async () => {
        const generate = jest
            .fn<ReturnType<ConstrainedTextGenerator['generate']>, Parameters<ConstrainedTextGenerator['generate']>>()
            .mockResolvedValueOnce('{"OpaqueTitle":"Incomplete title"}')
            .mockImplementation(() => new Promise(() => undefined));
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
            budgetMs: 10,
            maxFieldsPerPrompt: 1
        });

        const result = await generator.generate({ ...input, rowCount: 1 }, new AbortController().signal);

        expect(result.rows).toEqual([{}]);
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

        await expect(generator.generate(input, controller.signal)).rejects.toBe(reason);
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
        const generator = createPilotSftGenerator({
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: () => new Promise(() => undefined) },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15,
                noRepeatNgramSize: 4,
                maxNewTokens: 300
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
        const generator = createPilotSftGenerator({
            fingerprint: 'sft-model-sha256',
            textGenerator: { generate: async () => '{"OpaqueTitle":"Completed title","Rating":4.5}' },
            sampling: {
                temperature: 0.6,
                topP: 0.9,
                repetitionPenalty: 1.15,
                noRepeatNgramSize: 4,
                maxNewTokens: 300
            }
        });

        await expect(
            generator.generate({ ...input, rowCount: 1, budgetMs }, new AbortController().signal)
        ).rejects.toThrow('SFT request budget must be positive');
    });
});
