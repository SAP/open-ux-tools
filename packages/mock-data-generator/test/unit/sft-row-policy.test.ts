import { generateServiceForTesting } from '../../src/index.js';
import type { SemanticClassifier, SftGenerator } from '../../src/types.js';
import { mockStandaloneModelResources } from './synthetic-standalone-models.js';

const modelResources = await mockStandaloneModelResources();
const { createMockDataGenerator, executionModeDefaults } = await import('../../src/standalone.js');
afterAll(modelResources.dispose);

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Ticket"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Category" Type="Edm.String" MaxLength="10"><Annotation Term="Common.Text" Path="CategoryText"/></Property>
<Property Name="CategoryText" Type="Edm.String" MaxLength="40"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityType Name="Memo"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
<Property Name="Owner" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Tickets" EntityType="Demo.Ticket"/><EntitySet Name="Memos" EntityType="Demo.Memo"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/tickets', odataVersion: '4.0' },
    targets: [
        { name: 'Tickets', kind: 'entity-set' },
        { name: 'Memos', kind: 'entity-set' }
    ],
    existingData: {}
} as const;

/**
 * A model double whose row i carries the suffix i, recording the entities and row counts it was asked for.
 *
 * @param calls receives entity name and row count per call
 * @returns the generator double
 */
function numbered(calls: Array<{ entity: string; rows: number }>): SftGenerator {
    return {
        fingerprint: 'row-policy',
        generate: async (input) => {
            calls.push({ entity: input.entityName, rows: input.rowCount });
            return {
                rows: Array.from({ length: input.rowCount }, (_unused, row) =>
                    Object.fromEntries(
                        input.fields.map(({ name }) => [name, name === 'Category' ? `C${row}` : `${name} value ${row}`])
                    )
                )
            };
        }
    };
}

describe('fine-tuned row policy', () => {
    it('asks the model for the configured rows and fills the others from its values, coupled fields together', async () => {
        const calls: Array<{ entity: string; rows: number }> = [];
        const result = await generateServiceForTesting(
            request,
            { seed: 3, rowsPerEntity: 5, sftModelRows: 2 },
            {
                sft: numbered(calls),
                candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) }
            }
        );

        expect(calls.every(({ rows }) => rows === 2)).toBe(true);
        const tickets = result.resources.Tickets;
        expect(tickets).toHaveLength(5);
        for (const row of tickets) {
            // Every reused caption travels with its own code.
            expect(String(row.CategoryText)).toBe(`CategoryText value ${String(row.Category).slice(1)}`);
            expect(String(row.Remark)).toMatch(/^Remark value [01]$/u);
        }
        const memos = result.resources.Memos;
        // Independent fields draw from different model rows, so reused rows vary.
        expect(new Set(memos.map(({ Remark, Owner }) => `${String(Remark)}|${String(Owner)}`)).size).toBeGreaterThan(2);
        expect(result.statistics.sft.acceptedSlots).toBe(5 * 3 + 5 * 2);
        expect(result.tiers?.model).toBe(result.statistics.sft.acceptedSlots);
    });

    it('keeps an identifier column and a semantic key unique where the model rows are reused', async () => {
        // Given a set whose model writes an identifier-shaped value, a semantic key of words and a text per row
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Kv"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Qz" Type="Edm.String" MaxLength="12"/>
<Property Name="Qn" Type="Edm.String" MaxLength="30"/>
<Property Name="Qt" Type="Edm.String" MaxLength="60"/>
<Annotation Term="Common.SemanticKey"><Collection><PropertyPath>Qn</PropertyPath></Collection></Annotation>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Kvs" EntityType="Demo.Kv"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const words = ['alpha', 'beta', 'gamma', 'delta'];
        const sft: SftGenerator = {
            fingerprint: 'identifiers',
            generate: async (input) => ({
                rows: Array.from({ length: input.rowCount }, (_unused, row) => ({
                    Qz: `QZ-0${row + 1}`,
                    Qn: words[row] ?? 'omega',
                    Qt: `Qt value ${row}`
                }))
            })
        };
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/identifiers', odataVersion: '4.0' },
                targets: [{ name: 'Kvs', kind: 'entity-set' }],
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 10, sftModelRows: 4 },
            { sft, candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) } }
        );
        const rows = result.resources.Kvs;
        // Then the identifier keeps the model's form and never repeats
        expect(new Set(rows.map(({ Qz }) => Qz)).size).toBe(10);
        expect(rows.every(({ Qz }) => /^QZ-\d+$/u.test(String(Qz)))).toBe(true);
        // And the semantic key never repeats, while the text column is still reused from the model rows
        expect(new Set(rows.map(({ Qn }) => Qn)).size).toBe(10);
        expect(rows.slice(0, 4).map(({ Qn }) => Qn)).toEqual(words);
        expect(rows.every(({ Qt }) => /^Qt value [0-3]$/u.test(String(Qt)))).toBe(true);
    });

    it.each([
        ['moves with its text', (row: number) => 100 + row],
        ['repeats in the model rows', (row: number) => (row < 2 ? 7 : 100 + row)]
    ])('never repeats a semantic key that %s', async (_case, key) => {
        // Given a set whose semantic key is a number with a text, both written by the model
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Kx"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Guid" Nullable="false"/>
<Property Name="Qk" Type="Edm.Int32"/>
<Property Name="Qd" Type="Edm.String" MaxLength="60"/>
<Annotation Term="Common.SemanticKey"><Collection><PropertyPath>Qk</PropertyPath></Collection></Annotation>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Kxs" EntityType="Demo.Kx"/></EntityContainer>
<Annotations Target="Demo.Kx/Qk"><Annotation Term="Common.Text" Path="Qd"/></Annotations>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const sft: SftGenerator = {
            fingerprint: `semantic-key-${_case}`,
            generate: async (input) => ({
                rows: Array.from({ length: input.rowCount }, (_unused, row) => ({
                    Qk: key(row),
                    Qd: `Qd value ${row}`
                }))
            })
        };
        // When ten rows are generated from four model rows
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/semantic-key', odataVersion: '4.0' },
                targets: [{ name: 'Kxs', kind: 'entity-set' }],
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 10, sftModelRows: 4 },
            { sft, candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) } }
        );
        // Then the semantic key never repeats in the set
        const keys = result.resources.Kxs.map(({ Qk }) => Qk);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('renumbers only identifiers where the model rows are reused, not times or fields of another likely role', async () => {
        // Given a set whose model writes distinct timestamps, codes most likely of a place role, and identifiers
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Ky"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Guid" Nullable="false"/>
<Property Name="Qt" Type="Edm.DateTimeOffset"/>
<Property Name="Qp" Type="Edm.String" MaxLength="10"/>
<Property Name="Qz" Type="Edm.String" MaxLength="12"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Kys" EntityType="Demo.Ky"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const written = {
            Qt: (row: number) => `2023-11-28T14:5${row}:59Z`,
            Qp: (row: number) => `7529${row}`,
            Qz: (row: number) => `QZ-0${row + 1}`
        };
        const sft: SftGenerator = {
            fingerprint: 'renumbering',
            generate: async (input) => ({
                rows: Array.from({ length: input.rowCount }, (_unused, row) =>
                    Object.fromEntries(
                        input.fields.map(({ name }) => [name, written[name as keyof typeof written]?.(row) ?? null])
                    )
                )
            })
        };
        // And a classifier whose best role for Qp is a place role, below its route threshold
        const classifier: SemanticClassifier = {
            fingerprint: 'likely-place',
            classify: async (input) => ({
                role: 'unknown',
                confidence: input.propertyName === 'Qp' ? 0.9 : 0.97,
                source: 'unknown',
                routeThreshold: 0.95,
                top: [{ role: input.propertyName === 'Qp' ? 'postal_code' : 'unknown', confidence: 0.9 }]
            })
        };
        // When ten rows are generated from four model rows
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/renumbering', odataVersion: '4.0' },
                targets: [{ name: 'Kys', kind: 'entity-set' }],
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 10, sftModelRows: 4 },
            {
                sft,
                classifier,
                candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) }
            }
        );
        const rows = result.resources.Kys;
        // Then times keep valid seconds, and the place codes are the model's, never numbers it did not write
        const modelPlaceCodes = new Set(rows.slice(0, 4).map(({ Qp }) => Qp));
        expect(rows.filter(({ Qt }) => /:6\d/u.test(String(Qt)))).toEqual([]);
        expect(rows.filter(({ Qp }) => !modelPlaceCodes.has(Qp))).toEqual([]);
        // And the identifier column is renumbered
        expect(new Set(rows.map(({ Qz }) => Qz)).size).toBe(10);
    });

    it('renumbers each identifier within its own form, keeping its length', async () => {
        // Given a set whose model writes identifiers of different forms and magnitudes in one column
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Kf"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Qz" Type="Edm.String" MaxLength="12"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Kfs" EntityType="Demo.Kf"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const written = ['50034781', 'AC02', 'B012', 'RM589.76'];
        const sft: SftGenerator = {
            fingerprint: 'forms',
            generate: async (input) => ({
                rows: Array.from({ length: input.rowCount }, (_unused, row) => ({ Qz: written[row] ?? 'ZZ99' }))
            })
        };
        // When ten rows are generated from four model rows
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/forms', odataVersion: '4.0' },
                targets: [{ name: 'Kfs', kind: 'entity-set' }],
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 10, sftModelRows: 4 },
            { sft, candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) } }
        );
        const values = result.resources.Kfs.map(({ Qz }) => String(Qz));
        // Then no identifier repeats, and each keeps the form and length of a model identifier
        const form = (value: string): string => value.replace(/\d/gu, '9');
        expect(new Set(values).size).toBe(10);
        expect(values.filter((value) => !written.map(form).includes(form(value)))).toEqual([]);
    });

    it('puts the e-mail and web addresses the model writes in a reserved domain', async () => {
        // Given a model that writes addresses with hosts anyone could register into fields of no role
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Kw"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Qe" Type="Edm.String" MaxLength="60"/>
<Property Name="Qw" Type="Edm.String" MaxLength="80"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Kws" EntityType="Demo.Kw"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const sft: SftGenerator = {
            fingerprint: 'addresses',
            generate: async (input) => ({
                rows: Array.from({ length: input.rowCount }, (_unused, row) => ({
                    Qe: `user${row}@nordmail.se`,
                    Qw: `https://www.contoso-shop.com/item/${row}`
                }))
            })
        };
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/addresses', odataVersion: '4.0' },
                targets: [{ name: 'Kws', kind: 'entity-set' }],
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 4, sftModelRows: 2 },
            { sft, candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) } }
        );
        // Then every address keeps the model's local part or path on the documentation domain
        const rows = result.resources.Kws;
        expect(rows.every(({ Qe }) => /^user\d@example\.com$/u.test(String(Qe)))).toBe(true);
        expect(rows.every(({ Qw }) => /^https:\/\/www\.example\.com\/item\/\d$/u.test(String(Qw)))).toBe(true);
    });

    it('asks the model for every row of a text whose code it does not write', async () => {
        // Given a set whose key code has a text the model writes, and fewer model rows than rows
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Kx"><Key><PropertyRef Name="Qk"/></Key>
<Property Name="Qk" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="Qt"/></Property>
<Property Name="Qt" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Kxs" EntityType="Demo.Kx"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const calls: Array<{ entity: string; rows: number }> = [];
        const result = await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/texts', odataVersion: '4.0' },
                targets: [{ name: 'Kxs', kind: 'entity-set' }],
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 5, sftModelRows: 2 },
            {
                sft: numbered(calls),
                candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) }
            }
        );
        // Then the model writes the text of every code, since a text cannot move to another code
        expect(calls).toEqual([{ entity: 'Kx', rows: 5 }]);
        expect(result.resources.Kxs.map(({ Qt }) => Qt)).toEqual([0, 1, 2, 3, 4].map((row) => `Qt value ${row}`));
    });

    it('fills the priority targets first, in the caller order', async () => {
        const calls: Array<{ entity: string; rows: number }> = [];
        await generateServiceForTesting(
            request,
            { seed: 3, rowsPerEntity: 2, sftPriorityTargets: ['Tickets'] },
            {
                sft: numbered(calls),
                candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) }
            }
        );
        expect(calls.map(({ entity }) => entity)).toEqual(['Ticket', 'Memo']);
    });

    it('fills a priority target before a value-help domain it does not reference', async () => {
        // Given a value-help domain that one entity set references and a priority target that is another set
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Qv"><Key><PropertyRef Name="Qa"/></Key>
<Property Name="Qa" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="Qb"/></Property>
<Property Name="Qb" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="Zr"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Qa" Type="Edm.String" MaxLength="4"><Annotation Term="Common.ValueList"><Record><PropertyValue Property="CollectionPath" String="Qvs"/><PropertyValue Property="Parameters"><Collection><Record Type="Common.ValueListParameterInOut"><PropertyValue Property="LocalDataProperty" PropertyPath="Qa"/><PropertyValue Property="ValueListProperty" String="Qa"/></Record></Collection></PropertyValue></Record></Annotation></Property>
</EntityType>
<EntityType Name="Wm"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
<Property Name="Owner" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Qvs" EntityType="Demo.Qv"/><EntitySet Name="Zrs" EntityType="Demo.Zr"/><EntitySet Name="Wms" EntityType="Demo.Wm"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
        const calls: Array<{ entity: string; rows: number }> = [];
        await generateServiceForTesting(
            {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/priority', odataVersion: '4.0' },
                targets: ['Qvs', 'Zrs', 'Wms'].map((name) => ({ name, kind: 'entity-set' as const })),
                existingData: {}
            },
            { seed: 3, rowsPerEntity: 2, sftPriorityTargets: ['Wms'] },
            {
                sft: numbered(calls),
                candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) }
            }
        );
        // Then the model is asked for the priority target before the domain
        const entities = calls.map(({ entity }) => entity);
        expect(entities).toContain('Qv');
        expect(entities[0]).toBe('Wm');
    });

    it('rejects invalid row-policy options', async () => {
        await expect(generateServiceForTesting(request, { rowsPerEntity: 1, sftModelRows: 0 })).rejects.toThrow(
            'SFT model rows'
        );
        await expect(
            generateServiceForTesting(request, {
                rowsPerEntity: 1,
                sftPriorityTargets: [1] as unknown as string[]
            })
        ).rejects.toThrow('priority targets');
    });

    it('gives the data editor its budget and row policy unless the caller sets them', async () => {
        expect(executionModeDefaults('data-editor')).toEqual({
            sftBudgetMs: 20_000,
            sftTimeoutMs: 30_000,
            sftModelRows: 4,
            sftDeadlineMs: 20_000,
            sftFieldsPerCall: 3
        });
        expect(executionModeDefaults()).toEqual({});
        expect(executionModeDefaults('start-mock')).toEqual({});
        const generator = await createMockDataGenerator({ executionMode: 'data-editor' });
        try {
            const report = await generator.inspectService(request, { mode: 'deterministic', rowsPerEntity: 1 });
            expect(report.fieldDecisions.length).toBeGreaterThan(0);
        } finally {
            await generator.dispose();
        }
    });

    it('protects verified model captions of a partially verified resource from being cloned onto new codes', async () => {
        const result = await generateServiceForTesting(
            { ...request, targets: [{ name: 'Tickets', kind: 'entity-set' }] },
            { seed: 3, rowsPerEntity: 3, sftModelRows: 2 },
            {
                sft: numbered([]),
                candidateVerifier: {
                    fingerprint: 'accepts-first-caption',
                    verifyBatch: async (pairs) => pairs.map(({ value }) => value === 'CategoryText value 0')
                }
            }
        );
        // Only the verified pair is published with its own code; no other code carries its caption.
        const withCaption = result.resources.Tickets.filter(
            ({ CategoryText }) => CategoryText === 'CategoryText value 0'
        );
        expect(withCaption.every(({ Category }) => Category === 'C0')).toBe(true);
        expect(withCaption.length).toBeGreaterThan(0);
    });

    it('reports a resource whose rows did not complete in time as incomplete', async () => {
        const result = await generateServiceForTesting(
            { ...request, targets: [{ name: 'Memos', kind: 'entity-set' }] },
            { seed: 3, rowsPerEntity: 2 },
            {
                sft: {
                    fingerprint: 'no-rows',
                    generate: async (input) => ({ rows: Array.from({ length: input.rowCount }, () => ({})) })
                }
            }
        );
        expect(result.statistics.sft.assignments[0]).toMatchObject({ outcome: 'incomplete', rowsWithoutCandidate: 2 });
    });

    it('gives the model only what remains of the generation deadline', async () => {
        const budgets: number[] = [];
        const slowClassifier = {
            fingerprint: 'slow-classifier',
            classify: async () => {
                await new Promise((resolve) => setTimeout(resolve, 150));
                return { role: 'unknown', confidence: 0.99, source: 'classifier' as const };
            }
        };
        const sft: SftGenerator = {
            fingerprint: 'budget-recorder',
            generate: async (input) => {
                budgets.push(input.budgetMs ?? 0);
                return { rows: [] };
            }
        };
        await generateServiceForTesting(
            { ...request, targets: [{ name: 'Memos', kind: 'entity-set' }] },
            { seed: 3, rowsPerEntity: 2, sftBudgetMs: 20_000, sftDeadlineMs: 1_000 },
            { classifier: slowClassifier, sft }
        );
        // 1 s minus at least the slow classification and the finalization reserve.
        expect(budgets[0]).toBeGreaterThan(0);
        expect(budgets[0]).toBeLessThanOrEqual(1_000 - 150 - 300);
        await expect(generateServiceForTesting(request, { rowsPerEntity: 1, sftDeadlineMs: 0 })).rejects.toThrow(
            'SFT deadline'
        );
    });
});
