import { generateService } from '../../src/index.js';
import { createMockDataGenerator, executionModeDefaults } from '../../src/standalone.js';
import type { SftGenerator } from '../../src/types.js';

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
        const result = await generateService(
            request,
            { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 5, sftModelRows: 2 },
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

    it('fills the priority targets first, in the caller order', async () => {
        const calls: Array<{ entity: string; rows: number }> = [];
        await generateService(
            request,
            { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 2, sftPriorityTargets: ['Tickets'] },
            {
                sft: numbered(calls),
                candidateVerifier: { fingerprint: 'accepts', verifyBatch: async (pairs) => pairs.map(() => true) }
            }
        );
        expect(calls.map(({ entity }) => entity)).toEqual(['Ticket', 'Memo']);
    });

    it('rejects invalid row-policy options', async () => {
        await expect(
            generateService(request, { pipeline: 'semantic-v2', rowsPerEntity: 1, sftModelRows: 0 })
        ).rejects.toThrow('SFT model rows');
        await expect(
            generateService(request, {
                pipeline: 'semantic-v2',
                rowsPerEntity: 1,
                sftPriorityTargets: [1] as unknown as string[]
            })
        ).rejects.toThrow('priority targets');
    });

    it('gives the data editor its budget and row policy unless the caller sets them', async () => {
        expect(executionModeDefaults('data-editor')).toEqual({
            sftBudgetMs: 20_000,
            sftTimeoutMs: 30_000,
            sftModelRows: 4
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
        const result = await generateService(
            { ...request, targets: [{ name: 'Tickets', kind: 'entity-set' }] },
            { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 3, sftModelRows: 2 },
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
        const result = await generateService(
            { ...request, targets: [{ name: 'Memos', kind: 'entity-set' }] },
            { pipeline: 'semantic-v2', seed: 3, rowsPerEntity: 2 },
            {
                sft: {
                    fingerprint: 'no-rows',
                    generate: async (input) => ({ rows: Array.from({ length: input.rowCount }, () => ({})) })
                }
            }
        );
        expect(result.statistics.sft.assignments[0]).toMatchObject({ outcome: 'incomplete', rowsWithoutCandidate: 2 });
    });
});
