import { generateServiceForTesting } from '../../src/index.js';

/**
 * A service with meaningless names: each Mb references one Ma, and the single boolean key of Mb allows two
 * rows only.
 *
 * @param valueList - Whether a value list of an Mb field reads Ma.
 * @returns the metadata
 */
function metadata(valueList = false): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Ms" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="Mas" EntityType="Ms.Ma"/>
        <EntitySet Name="Mbs" EntityType="Ms.Mb"/>
      </EntityContainer>
      <EntityType Name="Ma">
        <Key><PropertyRef Name="Mk"/></Key>
        <Property Name="Mk" Type="Edm.String" Nullable="false" MaxLength="8"/>
      </EntityType>
      <EntityType Name="Mb">
        <Key><PropertyRef Name="Mf"/></Key>
        <Property Name="Mf" Type="Edm.Boolean" Nullable="false"/>
        <Property Name="Mk" Type="Edm.String" MaxLength="8"/>
        <NavigationProperty Name="Mup" Type="Ms.Ma">
          <ReferentialConstraint Property="Mk" ReferencedProperty="Mk"/>
        </NavigationProperty>
      </EntityType>
      ${
          valueList
              ? `<Annotations Target="Ms.Mb/Mk"><Annotation Term="Common.ValueList"><Record>
          <PropertyValue Property="CollectionPath" String="Mas"/>
          <PropertyValue Property="Parameters"><Collection><Record Type="Common.ValueListParameterInOut">
            <PropertyValue Property="LocalDataProperty" PropertyPath="Mk"/><PropertyValue Property="ValueListProperty" String="Mk"/>
          </Record></Collection></PropertyValue></Record></Annotation></Annotations>`
              : ''
      }
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * Generates both sets.
 *
 * @param content - The metadata.
 * @returns the diagnostics
 */
async function diagnostics(content: string) {
    const result = await generateServiceForTesting(
        {
            metadata: { format: 'edmx', content },
            service: { urlPath: '/childless', odataVersion: '4.0' },
            targets: [
                { name: 'Mas', kind: 'entity-set' },
                { name: 'Mbs', kind: 'entity-set' }
            ],
            existingData: {}
        },
        { seed: 1, rowsPerEntity: 10 }
    );
    return result.diagnostics;
}

describe('parents without children', () => {
    it('reports new parent rows that no new child row references', async () => {
        // Given a child set whose key allows fewer rows than its parents have
        // When rows are generated
        // Then the parents left without a child are reported on the child set
        expect(await diagnostics(metadata())).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    code: 'CHILD_ROWS_FEWER_THAN_PARENTS',
                    target: 'Mbs',
                    message: expect.stringMatching(/^8 of 10 new Mas rows/u)
                })
            ])
        );
    });

    it('reports nothing for the rows of a value list', async () => {
        // Given the same parents read as a value list of the child field
        // When rows are generated
        // Then value-list rows no child uses are not reported
        expect((await diagnostics(metadata(true))).map(({ code }) => code)).not.toContain(
            'CHILD_ROWS_FEWER_THAN_PARENTS'
        );
    });
});
