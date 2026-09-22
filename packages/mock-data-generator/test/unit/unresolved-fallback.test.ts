import { generateService, inspectService } from '../../src/index.js';
import type { SftGenerator } from '../../src/types.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Entry"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Phase" Type="Edm.String" MaxLength="1"><Annotation Term="Common.Text" Path="PhaseCaption"/><Annotation Term="Common.ValueList"><Record><PropertyValue Property="CollectionPath" String="PhaseCodes"/><PropertyValue Property="Parameters"><Collection><Record Type="Common.ValueListParameterInOut"><PropertyValue Property="LocalDataProperty" PropertyPath="Phase"/><PropertyValue Property="ValueListProperty" String="Code"/></Record></Collection></PropertyValue></Record></Annotation></Property>
<Property Name="PhaseCaption" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityType Name="PhaseCode"><Key><PropertyRef Name="Code"/></Key><Property Name="Code" Type="Edm.String" MaxLength="1" Nullable="false"><Annotation Term="Common.Text" Path="Caption"/></Property><Property Name="Caption" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityType Name="Opaque"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="UnmappedValue" Type="Edm.String" MaxLength="80"/><Property Name="UnmappedMeasure" Type="Edm.Decimal" Precision="5" Scale="2"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Entries" EntityType="Demo.Entry"/><EntitySet Name="PhaseCodes" EntityType="Demo.PhaseCode"/><EntitySet Name="OpaqueValues" EntityType="Demo.Opaque"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;
const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/workflow', odataVersion: '4.0' },
    targets: [
        { name: 'Entries', kind: 'entity-set' },
        { name: 'PhaseCodes', kind: 'entity-set' },
        { name: 'OpaqueValues', kind: 'entity-set' }
    ],
    existingData: {}
} as const;
const options = { pipeline: 'semantic-v2', seed: 42, rowsPerEntity: 2 } as const;

describe('LLM fallback for unresolved semantics', () => {
    it('does not publish deterministic placeholders for an evidence-poor linked domain', async () => {
        await expect(generateService({ ...request, targets: request.targets.slice(0, 2) }, options)).rejects.toThrow(
            'SFT_CANDIDATE_VERIFIER_UNAVAILABLE'
        );
    });

    it('reports partial model output as degraded instead of a ready generation result', async () => {
        const result = await generateService(
            { ...request, targets: [{ name: 'OpaqueValues', kind: 'entity-set' }] },
            options,
            {
                sft: {
                    fingerprint: 'partial-output',
                    generate: async () => ({
                        rows: [{ UnmappedValue: 'Independently proposed content', UnmappedMeasure: 12.25 }]
                    })
                }
            }
        );
        expect(result.capabilities.sft).toBe('degraded');
        expect(result.statistics.sft.acceptedSlots).toBe(2);
        expect(result.statistics.sft.eligibleSlots).toBe(4);
        expect(result.statistics.sft.fallbackSlots).toBe(2);
    });

    it('keeps deterministic rows and reports an incomplete synthetic domain instead of shrinking it', async () => {
        const result = await generateService({ ...request, targets: request.targets.slice(0, 2) }, options, {
            sft: {
                fingerprint: 'partial-domain',
                generate: async () => ({ rows: [{ Code: 'R', Caption: 'Review requested' }] })
            },
            candidateVerifier: { fingerprint: 'reviewed-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        });
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
    });

    it('pays for one model call when the verifier declines a synthetic domain candidate', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async () => ({
            rows: [
                { Code: 'R', Caption: 'Review requested' },
                { Code: 'A', Caption: 'Approved' }
            ]
        }));
        const result = await generateService({ ...request, targets: request.targets.slice(0, 2) }, options, {
            sft: { fingerprint: 'declined-domain', generate },
            candidateVerifier: { fingerprint: 'declining-test', verifyBatch: async (pairs) => pairs.map(() => false) }
        });
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
        expect(generate.mock.calls.filter(([input]) => input.entityName === 'PhaseCode')).toHaveLength(1);
        expect(result.statistics.sft.acceptedSlots).toBe(0);
    });

    it('passes incoming value-help context to unresolved reference fields', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async () => ({ rows: [] }));
        const result = await generateService(request, options, {
            sft: { fingerprint: 'reference-context', generate },
            candidateVerifier: { fingerprint: 'reviewed-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        });
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
        const domain = generate.mock.calls.find(([input]) => input.entityName === 'PhaseCode')?.[0];
        expect(domain?.fields.find(({ name }) => name === 'Code')).toMatchObject({
            referencedBy: ['Entries.Phase']
        });
        expect(domain?.fields.find(({ name }) => name === 'Caption')).toMatchObject({
            referencedBy: ['Entries.Phase']
        });
    });

    it('does not claim independent semantic validation for a model-generated status caption', async () => {
        const result = await generateService({ ...request, targets: request.targets.slice(0, 2) }, options, {
            sft: {
                fingerprint: 'unverified-caption',
                generate: async (input) => ({
                    rows: Array.from({ length: input.rowCount }, (_, index) => ({
                        Code: index === 0 ? 'R' : 'S',
                        Caption: 'Review requested'
                    }))
                })
            },
            candidateVerifier: { fingerprint: 'reviewed-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        });
        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'SFT_SEMANTICS_UNVERIFIED', target: 'PhaseCodes' })
            ])
        );
        expect(result.semanticRoles?.['PhaseCodes.Caption']).toBeUndefined();
    });

    it('marks inspection domain validation unverified for shape-valid model proposals', async () => {
        const report = await inspectService({ ...request, targets: request.targets.slice(0, 2) }, options, {
            sft: {
                fingerprint: 'unverified-domain',
                generate: async (input) => ({
                    rows: Array.from({ length: input.rowCount }, (_, index) => ({
                        Code: index === 0 ? 'R' : 'S',
                        Caption: 'Review requested'
                    }))
                })
            },
            candidateVerifier: { fingerprint: 'reviewed-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        });
        expect(report.invariants.find(({ name }) => name === 'semantic-domains')).toMatchObject({
            passed: false,
            status: 'unverified'
        });
    });

    it('offers unknown strings and numbers, and projects model-generated reference captions', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: input.rowCount }, (_, index) =>
                Object.fromEntries(
                    input.fields.map((field) => {
                        if (field.name === 'Code') {
                            return [field.name, index === 0 ? 'R' : 'S'];
                        }
                        return [field.name, field.primitiveType === 'decimal' ? 12.25 : 'Awaiting external review'];
                    })
                )
            )
        }));
        const result = await generateService(request, options, {
            sft: { fingerprint: 'residual-test', generate },
            candidateVerifier: { fingerprint: 'reviewed-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        });
        const requested = generate.mock.calls.flatMap(([input]) =>
            input.fields.map((field) => `${input.entityName}.${field.name}`)
        );
        expect(requested).toEqual(
            expect.arrayContaining(['PhaseCode.Caption', 'Opaque.UnmappedValue', 'Opaque.UnmappedMeasure'])
        );
        expect(requested).not.toEqual(expect.arrayContaining(['Entry.PhaseCaption']));
        expect(requested.some((name) => name.endsWith('.ID'))).toBe(false);
        expect(requested).toContain('PhaseCode.Code');
        expect(result.resources.PhaseCodes).toEqual([
            { Code: 'R', Caption: 'Awaiting external review' },
            { Code: 'S', Caption: 'Awaiting external review' }
        ]);
        expect(result.capabilities.sft).toBe('ready');
        expect(result.statistics.sft.assignments.find(({ resource }) => resource === 'PhaseCodes')).toMatchObject({
            rowCount: 2,
            fields: [
                { name: 'Code', eligibleSlots: 2, acceptedSlots: 2 },
                { name: 'Caption', eligibleSlots: 2, acceptedSlots: 2 }
            ]
        });
        for (const row of result.resources.Entries) {
            const reference = result.resources.PhaseCodes.find((candidate) => candidate.Code === row.Phase);
            expect(reference?.Caption).toBe('Awaiting external review');
            expect(row.PhaseCaption).toBe(reference?.Caption);
        }
        expect(result.resources.OpaqueValues[0]).toMatchObject({
            UnmappedValue: 'Awaiting external review',
            UnmappedMeasure: 12.25
        });
    });

    it('never offers authored reference identities or captions to the model', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async () => ({ rows: [] }));
        const result = await generateService(
            {
                ...request,
                targets: [{ name: 'Entries', kind: 'entity-set' }],
                existingData: {
                    PhaseCodes: {
                        contributor: { present: false },
                        initialRows: { source: 'json', present: true, rows: [{ Code: 'A', Caption: 'Authored phase' }] }
                    }
                }
            },
            options,
            { sft: { fingerprint: 'authored-domain', generate } }
        );
        expect(generate).not.toHaveBeenCalled();
        expect(
            result.resources.Entries.every((row) => row.Phase === 'A' && row.PhaseCaption === 'Authored phase')
        ).toBe(true);
    });

    it('never saves a code echo as a caption, keeping deterministic captions instead', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: input.rowCount }, () => ({ Code: '7', Caption: '7' }))
        }));
        const result = await generateService({ ...request, targets: request.targets.slice(0, 2) }, options, {
            sft: { fingerprint: 'echoed-code', generate },
            candidateVerifier: { fingerprint: 'reviewed-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        });
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
        expect(
            Object.values(result.resources)
                .flat()
                .some((row) => row.PhaseCaption === '7')
        ).toBe(false);
    });

    it('preserves declared domains and does not offer their constrained fields to the model', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: input.rowCount }, () =>
                Object.fromEntries(input.fields.map((field) => [field.name, 12.25]))
            )
        }));
        const result = await generateService(
            { ...request, targets: [{ name: 'OpaqueValues', kind: 'entity-set' }] },
            {
                ...options,
                syntheticScenario: {
                    id: 'declared-test',
                    version: '1',
                    domains: { 'OpaqueValues.UnmappedValue': ['Declared value'] }
                }
            },
            { sft: { fingerprint: 'domain-test', generate } }
        );
        expect(generate.mock.calls.flatMap(([input]) => input.fields.map((field) => field.name))).not.toContain(
            'UnmappedValue'
        );
        expect(result.resources.OpaqueValues.every((row) => row.UnmappedValue === 'Declared value')).toBe(true);
    });
});
