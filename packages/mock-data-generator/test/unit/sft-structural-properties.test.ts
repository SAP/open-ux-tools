import { generateService } from '../../src/index.js';
import type { SftGenerator } from '../../src/types.js';

// `Parent` points at the same entity set it belongs to, so `ParentID` and `ID` are both
// structural for `Categories`.
const selfReference = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Category"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Headline" Type="Edm.String" MaxLength="80"/><Property Name="ParentID" Type="Edm.Int32"/>
<NavigationProperty Name="Parent" Type="Demo.Category"><ReferentialConstraint Property="ParentID" ReferencedProperty="ID"/></NavigationProperty></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Categories" EntityType="Demo.Category"><NavigationPropertyBinding Path="Parent" Target="Categories"/></EntitySet></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

describe('structural properties of a self-referencing entity set', () => {
    it('keeps both ends of a self-reference out of the fine-tuned tier', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async () => ({
            rows: [{ Headline: 'First headline' }, { Headline: 'Second headline' }]
        }));
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: selfReference },
                service: { urlPath: '/catalog', odataVersion: '4.0' },
                targets: [{ name: 'Categories', kind: 'entity-set' }],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 42, rowsPerEntity: 2 },
            { sft: { fingerprint: 'self-reference', generate } }
        );

        const offered = generate.mock.calls.flatMap(([input]) => input.fields.map(({ name }) => name));
        expect(offered).not.toContain('ParentID');
        expect(offered).not.toContain('ID');
        expect(result.resources.Categories).toHaveLength(2);
    });
});
