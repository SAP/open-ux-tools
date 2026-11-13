import { parseEdmx } from '../../src/schema/edmx.js';

const V2_METADATA = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:sap="http://www.sap.com/Protocols/SAPData" Version="1.0">
  <edmx:DataServices>
    <Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" Namespace="Catalog">
      <EntityType Name="Category">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
      </EntityType>
      <EntityType Name="Book">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CategoryID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Edition" Type="Edm.String" MaxLength="4" sap:label="2024" sap:quickinfo="0042"/>
        <NavigationProperty Name="category" Relationship="Catalog.Book_Category" FromRole="Book" ToRole="Category"/>
      </EntityType>
      <Association Name="Book_Category">
        <End Type="Catalog.Book" Role="Book" Multiplicity="*"/>
        <End Type="Catalog.Category" Role="Category" Multiplicity="1"/>
        <ReferentialConstraint>
          <Principal Role="Category"><PropertyRef Name="ID"/></Principal>
          <Dependent Role="Book"><PropertyRef Name="CategoryID"/></Dependent>
        </ReferentialConstraint>
      </Association>
      <EntityContainer Name="Container">
        <EntitySet Name="Categories" EntityType="Catalog.Category"/>
        <EntitySet Name="Books" EntityType="Catalog.Book"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

const V4_METADATA = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
      <EntityType Name="Order">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Code" Type="Edm.String" MaxLength="4">
          <Annotation Term="Common.Label" String="0042"/>
          <Annotation Term="Common.FieldControl" Int="7"/>
          <Annotation Term="Measures.Scale" Decimal="1.50"/>
          <Annotation Term="UI.Hidden" Bool="false"/>
        </Property>
        <Property Name="Amount" Type="Edm.Decimal" Precision="15" Scale="2">
          <Annotation Term="Measures.ISOCurrency" Path="Currency"/>
        </Property>
        <Property Name="Currency" Type="Edm.String" MaxLength="5">
          <Annotation Term="Semantics.CurrencyCode" Bool="true"/>
        </Property>
        <Property Name="Unit" Type="Edm.String" MaxLength="3">
          <Annotation Term="Measures.Unit" Path="UoM"/>
        </Property>
        <Property Name="UoM" Type="Edm.String" MaxLength="3">
          <Annotation Term="Common.IsCurrency" Bool="false"/>
        </Property>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Orders" EntityType="Demo.Order"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

function property(content: string, entitySetName: string, name: string) {
    const entity = parseEdmx(content).entities.find((candidate) => candidate.entitySetName === entitySetName);
    return entity?.properties.find((candidate) => candidate.name === name);
}

describe('EDMX attribute values', () => {
    it('reads a V2 Multiplicity="1" end as a required target', () => {
        // Given a V2 association whose principal end has Multiplicity="1"
        // When the metadata is parsed
        const relationship = parseEdmx(V2_METADATA).relationships.find(({ name }) => name === 'category');
        // Then the target is required, not optional
        expect(relationship?.targetCardinality).toBe('one');
    });

    it('keeps numeric-looking SAP labels and descriptions as text', () => {
        // Given sap:label="2024" and sap:quickinfo="0042"
        // When the metadata is parsed
        const edition = property(V2_METADATA, 'Books', 'Edition');
        // Then both survive verbatim, including leading zeros
        expect(edition?.label).toBe('2024');
        expect(edition?.description).toBe('0042');
        expect(edition?.maxLength).toBe(4);
    });

    it('types annotation values by their EDM expression, not by their spelling', () => {
        // Given String, Int, Decimal and Bool annotations
        // When the metadata is parsed
        const code = property(V4_METADATA, 'Orders', 'Code');
        const value = (term: string): unknown =>
            code?.annotations.find((annotation) => annotation.term === term)?.value;
        // Then a String stays a string with its leading zeros, and the typed expressions are converted
        expect(code?.label).toBe('0042');
        expect(value('Common.Label')).toBe('0042');
        expect(value('Common.FieldControl')).toBe(7);
        expect(value('Measures.Scale')).toBe(1.5);
        expect(value('UI.Hidden')).toBe(false);
    });

    it('keeps decimal precision and scale as integers', () => {
        // Given Precision="15" Scale="2"
        // When the metadata is parsed
        const amount = property(V4_METADATA, 'Orders', 'Amount');
        // Then the facets are numbers
        expect(amount?.precision).toBe(15);
        expect(amount?.scale).toBe(2);
    });

    it('does not treat a unit marked IsCurrency="false" as a currency', () => {
        // Given a unit property annotated Common.IsCurrency with Bool="false"
        // When the metadata is parsed
        const unit = property(V4_METADATA, 'Orders', 'Unit');
        // Then no currency link is inferred from it
        expect(unit?.links?.currency).toBeUndefined();
    });
});
