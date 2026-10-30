import { parseEdmx } from '../../src/schema/edmx.js';

describe('rich schema IR', () => {
    it('retains structured properties and semantic metadata links', () => {
        const graph = parseEdmx(`<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Catalog">
      <ComplexType Name="Address">
        <Property Name="City" Type="Edm.String" Nullable="false" MaxLength="40"/>
      </ComplexType>
      <EntityType Name="Product">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CountryCode" Type="Edm.String" MaxLength="3">
          <Annotation Term="com.sap.vocabularies.Common.v1.Text" Path="CountryName"/>
          <Annotation Term="Org.OData.Measures.V1.ISOCurrency" Path="Currency"/>
          <Annotation Term="com.sap.vocabularies.Common.v1.ValueList">
            <Record>
              <PropertyValue Property="CollectionPath" String="Countries"/>
            </Record>
          </Annotation>
        </Property>
        <Property Name="CountryName" Type="Edm.String" MaxLength="40"/>
        <Property Name="Currency" Type="Edm.String" MaxLength="3"/>
        <Property Name="Address" Type="Catalog.Address" Nullable="false"/>
        <Property Name="Tags" Type="Collection(Edm.String)" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Products" EntityType="Catalog.Product"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);

        expect(graph.complexTypes).toEqual([
            expect.objectContaining({
                name: 'Address',
                qualifiedName: 'Catalog.Address',
                properties: [expect.objectContaining({ name: 'City', primitiveType: 'string', maxLength: 40 })]
            })
        ]);
        expect(graph.entities[0].structuredProperties).toEqual([
            {
                name: 'Address',
                kind: 'complex',
                declaredType: 'Catalog.Address',
                elementType: 'Catalog.Address',
                nullable: false,
                annotations: []
            },
            {
                name: 'Tags',
                kind: 'collection',
                declaredType: 'Collection(Edm.String)',
                elementType: 'Edm.String',
                nullable: false,
                annotations: []
            }
        ]);
        expect(graph.entities[0].properties.find(({ name }) => name === 'CountryCode')).toMatchObject({
            declaredType: 'Edm.String',
            links: {
                text: 'CountryName',
                currency: 'Currency',
                valueListCollection: 'Countries'
            }
        });
    });
});
