import { generateService, inspectService } from '../../src/index.js';
import type { MockDataServiceRequest, SftGenerator } from '../../src/types.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Note"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityType Name="Memo"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityContainer Name="Container">
<EntitySet Name="Notes" EntityType="Demo.Note"/>
<EntitySet Name="Memos" EntityType="Demo.Memo"/>
</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const options = { pipeline: 'semantic-v2', seed: 7, rowsPerEntity: 2 } as const;

/**
 * Request for the given entity sets of the two-entity test service.
 *
 * @param names entity sets to generate
 * @returns the service request
 */
function request(names: ReadonlyArray<string>): MockDataServiceRequest {
    return {
        metadata: { format: 'edmx', content: metadata },
        service: { urlPath: '/notes', odataVersion: '4.0' },
        targets: names.map((name) => ({ name, kind: 'entity-set' as const })),
        existingData: {}
    };
}

/**
 * A model double that answers every call with the given rows.
 *
 * @param rows candidate rows, one per requested row
 * @returns the generator double
 */
function answering(rows: ReadonlyArray<Record<string, unknown>>): SftGenerator {
    return {
        fingerprint: 'fixed-answer',
        generate: async (input) => ({
            rows: Array.from({ length: input.rowCount }, (_unused, index) => rows[index] ?? {}) as never
        })
    };
}

describe('fine-tuned tier outcome statistics', () => {
    it('reports an accepted resource with no invalid or missing candidates', async () => {
        const result = await generateService(request(['Notes']), options, {
            sft: answering([{ Remark: 'Customer asked for a call back' }, { Remark: 'Invoice sent by mail' }])
        });
        const [assignment] = result.statistics.sft.assignments;
        expect(assignment).toMatchObject({ resource: 'Notes', outcome: 'accepted', rowsWithoutCandidate: 0 });
        expect(assignment.fields).toEqual([{ name: 'Remark', eligibleSlots: 2, acceptedSlots: 2, invalidSlots: 0 }]);
        expect(result.statistics.sft.skippedResources).toBeUndefined();
    });

    it('counts invalid candidates per field when no row passes validation', async () => {
        const tooLong = 'x'.repeat(61);
        const result = await generateService(request(['Notes']), options, {
            sft: answering([{ Remark: tooLong }, { Remark: tooLong }])
        });
        const [assignment] = result.statistics.sft.assignments;
        expect(assignment.outcome).toBe('rejected');
        expect(assignment.fields[0]).toMatchObject({ acceptedSlots: 0, invalidSlots: 2 });
    });

    it('reports rows without a complete candidate as a partial outcome', async () => {
        const result = await generateService(request(['Notes']), options, {
            sft: answering([{ Remark: 'Delivery confirmed by the carrier' }])
        });
        const [assignment] = result.statistics.sft.assignments;
        expect(assignment).toMatchObject({ outcome: 'partial', rowsWithoutCandidate: 1 });
        expect(assignment.fields[0]).toMatchObject({ acceptedSlots: 1, invalidSlots: 0 });
    });

    it('reports a failed model call', async () => {
        const result = await generateService(request(['Notes']), options, {
            sft: {
                fingerprint: 'failing',
                generate: async () => {
                    throw new Error('native runtime failure');
                }
            }
        });
        expect(result.statistics.sft.assignments[0]).toMatchObject({ outcome: 'failed', rowsWithoutCandidate: 2 });
    });

    it('reports a timed-out model call', async () => {
        const result = await generateService(
            request(['Notes']),
            { ...options, sftTimeoutMs: 20 },
            {
                sft: {
                    fingerprint: 'hanging',
                    generate: async (_input, signal) =>
                        new Promise((_resolve, reject) => {
                            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
                        })
                }
            }
        );
        expect(result.statistics.sft.assignments[0]).toMatchObject({ outcome: 'timeout' });
    });

    it('lists the resources the service budget left without an attempt', async () => {
        const slow: SftGenerator = {
            fingerprint: 'slow',
            generate: async (input) => {
                await new Promise((resolve) => setTimeout(resolve, 80));
                return { rows: Array.from({ length: input.rowCount }, () => ({ Remark: 'Parcel left at the door' })) };
            }
        };
        const result = await generateService(
            request(['Notes', 'Memos']),
            { ...options, sftBudgetMs: 60 },
            { sft: slow }
        );
        expect(result.statistics.sft.assignments).toHaveLength(1);
        expect(result.statistics.sft.skippedResources).toEqual([
            {
                resource: expect.stringMatching(/^(Notes|Memos)$/u),
                reason: 'budget',
                rowCount: 2,
                fields: ['Remark']
            }
        ]);
    });
});

describe('per-field value tiers in the inspection report', () => {
    it('splits each published property between model cells and the tier of its remaining cells', async () => {
        const report = await inspectService(request(['Notes']), options, {
            sft: answering([{ Remark: 'Customer asked for a call back' }])
        });
        const remark = report.fieldDecisions.find(
            ({ resource, property }) => resource === 'Notes' && property === 'Remark'
        );
        expect(remark?.valueTier).toMatchObject({ cells: 2, modelCells: 1 });
        const key = report.fieldDecisions.find(({ resource, property }) => resource === 'Notes' && property === 'ID');
        expect(key?.valueTier).toMatchObject({ cells: 2, modelCells: 0 });
        // Entity sets that were not requested publish no rows, so they carry no tier.
        const memo = report.fieldDecisions.find(({ resource }) => resource === 'Memos');
        expect(memo?.valueTier).toBeUndefined();
    });
});

describe('generation totals in the inspection report', () => {
    it('carries the same statistics, tier totals and typed-floor causes as the generation result', async () => {
        const sft = answering([{ Remark: 'Customer asked for a call back' }, { Remark: 'Invoice sent by mail' }]);
        const result = await generateService(request(['Notes']), options, { sft });
        const report = await inspectService(request(['Notes']), options, { sft });
        expect(report.statistics).toEqual(result.statistics);
        expect(report.tiers).toEqual(result.tiers);
        expect(report.typedFloor).toEqual(result.typedFloor);
    });
});
