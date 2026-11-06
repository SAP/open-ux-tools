import { parseEdmx } from '../../src/schema/edmx.js';

/**
 * A service with meaningless names: Qa declares one alternate key inline, Qb one of two properties and one
 * naming a property it does not declare through an external target, Qc none.
 *
 * @returns the metadata
 */
function metadata(): string {
    const key = (...names: string[]): string =>
        `<Record><PropertyValue Property="Key"><Collection>${names
            .map(
                (name) =>
                    `<Record><PropertyValue Property="Name" Path="${name}"/><PropertyValue Property="Alias" String="${name}"/></Record>`
            )
            .join('')}</Collection></PropertyValue></Record>`;
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Qs" Alias="SAP__self">
      <EntityType Name="Qa">
        <Key><PropertyRef Name="Qk"/></Key>
        <Property Name="Qk" Type="Edm.Guid" Nullable="false"/>
        <Property Name="Qe" Type="Edm.String" MaxLength="10"/>
        <Annotation Term="Core.AlternateKeys"><Collection>${key('Qe')}</Collection></Annotation>
      </EntityType>
      <EntityType Name="Qb">
        <Key><PropertyRef Name="Qk"/></Key>
        <Property Name="Qk" Type="Edm.Guid" Nullable="false"/>
        <Property Name="Qm" Type="Edm.String" MaxLength="4"/>
        <Property Name="Qn" Type="Edm.String" MaxLength="4"/>
      </EntityType>
      <EntityType Name="Qc">
        <Key><PropertyRef Name="Qk"/></Key>
        <Property Name="Qk" Type="Edm.Guid" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Qas" EntityType="Qs.Qa"/>
        <EntitySet Name="Qbs" EntityType="Qs.Qb"/>
        <EntitySet Name="Qcs" EntityType="Qs.Qc"/>
      </EntityContainer>
      <Annotations Target="SAP__self.Qb">
        <Annotation Term="SAP__core.AlternateKeys"><Collection>${key('Qm', 'Qn')}${key('Qz')}</Collection></Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

describe('alternate keys', () => {
    it('reads the alternate keys an entity type declares, inline or through an external target', () => {
        // Given entity types declaring alternate keys inline, externally, or not at all
        // When the metadata is parsed
        const entities = new Map(parseEdmx(metadata()).entities.map((entity) => [entity.entitySetName, entity]));
        // Then each entity holds the keys whose properties it declares
        expect(entities.get('Qas')?.alternateKeys).toEqual([['Qe']]);
        expect(entities.get('Qbs')?.alternateKeys).toEqual([['Qm', 'Qn']]);
        expect(entities.get('Qcs')?.alternateKeys).toBeUndefined();
    });
});
