import { generateService } from '../../src/index.js';
import type { SftGenerator } from '../../src/types.js';

const linkedDomains = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Entry"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Phase" Type="Edm.String" MaxLength="1"><Annotation Term="Common.Text" Path="PhaseCaption"/><Annotation Term="Common.ValueList"><Record><PropertyValue Property="CollectionPath" String="PhaseCodes"/><PropertyValue Property="Parameters"><Collection><Record Type="Common.ValueListParameterInOut"><PropertyValue Property="LocalDataProperty" PropertyPath="Phase"/><PropertyValue Property="ValueListProperty" String="Code"/></Record></Collection></PropertyValue></Record></Annotation></Property>
<Property Name="PhaseCaption" Type="Edm.String" MaxLength="80"/>
<Property Name="Stage" Type="Edm.String" MaxLength="1"><Annotation Term="Common.Text" Path="StageCaption"/><Annotation Term="Common.ValueList"><Record><PropertyValue Property="CollectionPath" String="StageCodes"/><PropertyValue Property="Parameters"><Collection><Record Type="Common.ValueListParameterInOut"><PropertyValue Property="LocalDataProperty" PropertyPath="Stage"/><PropertyValue Property="ValueListProperty" String="Code"/></Record></Collection></PropertyValue></Record></Annotation></Property>
<Property Name="StageCaption" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityType Name="PhaseCode"><Key><PropertyRef Name="Code"/></Key><Property Name="Code" Type="Edm.String" MaxLength="1" Nullable="false"><Annotation Term="Common.Text" Path="Caption"/></Property><Property Name="Caption" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityType Name="StageCode"><Key><PropertyRef Name="Code"/></Key><Property Name="Code" Type="Edm.String" MaxLength="1" Nullable="false"><Annotation Term="Common.Text" Path="Caption"/></Property><Property Name="Caption" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Entries" EntityType="Demo.Entry"/><EntitySet Name="PhaseCodes" EntityType="Demo.PhaseCode"/><EntitySet Name="StageCodes" EntityType="Demo.StageCode"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const gatewayArtifacts = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Note"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Remark" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityType Name="SAP__ValueHelp"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Label" Type="Edm.String" MaxLength="80"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Notes" EntityType="Demo.Note"/><EntitySet Name="SAP__ValueHelpSet" EntityType="Demo.SAP__ValueHelp"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const options = { pipeline: 'semantic-v2', seed: 42, rowsPerEntity: 2 } as const;

/**
 * Number of model calls made for one entity type.
 *
 * @param generate the mocked generator
 * @param entityName the entity type name to count calls for
 * @returns how many times the model was asked to produce rows for that entity
 */
function callsFor(generate: jest.Mock<SftGenerator['generate']>, entityName: string): number {
    return generate.mock.calls.filter(([input]) => input.entityName === entityName).length;
}

describe('tier 2 gating', () => {
    it('verifies each linked domain on its own, so one declined resource does not skip the next', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async () => ({
            rows: [
                { Code: 'A', Caption: 'Alpha' },
                { Code: 'B', Caption: 'Beta' }
            ]
        }));
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: linkedDomains },
                service: { urlPath: '/workflow', odataVersion: '4.0' },
                targets: [
                    { name: 'Entries', kind: 'entity-set' },
                    { name: 'PhaseCodes', kind: 'entity-set' },
                    { name: 'StageCodes', kind: 'entity-set' }
                ],
                existingData: {}
            },
            options,
            {
                sft: { fingerprint: 'rejecting-verifier', generate },
                candidateVerifier: {
                    fingerprint: 'rejects-everything',
                    verifyBatch: async (pairs) => pairs.map(() => false)
                }
            }
        );

        // The breaker is scoped to one resource: each linked domain gets its own model call.
        expect(callsFor(generate, 'PhaseCode')).toBe(1);
        expect(callsFor(generate, 'StageCode')).toBe(1);

        const unverified = result.diagnostics.filter(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED');
        expect(unverified.map(({ target }) => target).sort()).toEqual(['PhaseCodes', 'StageCodes']);
        expect(result.resources.PhaseCodes).toHaveLength(2);
        expect(result.resources.StageCodes).toHaveLength(2);
    });

    it('leaves SAP Gateway protocol entity sets to the deterministic tier', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async () => ({
            rows: [{ Remark: 'Proposed remark' }, { Remark: 'Another remark' }]
        }));
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: gatewayArtifacts },
                service: { urlPath: '/notes', odataVersion: '4.0' },
                targets: [
                    { name: 'Notes', kind: 'entity-set' },
                    { name: 'SAP__ValueHelpSet', kind: 'entity-set' }
                ],
                existingData: {}
            },
            options,
            { sft: { fingerprint: 'protocol-artifacts', generate } }
        );

        expect(callsFor(generate, 'SAP__ValueHelp')).toBe(0);
        expect(callsFor(generate, 'Note')).toBeGreaterThan(0);
        expect(result.resources.SAP__ValueHelpSet).toHaveLength(2);
        expect(result.diagnostics.some(({ code }) => code === 'SFT_SKIPPED_PROTOCOL_ARTIFACTS')).toBe(true);
    });
});
