import { generateService, validateGeneratedResult } from '../../src/index.js';
import { validateTupleDomains } from '../../src/generation/tuple-domain.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { MockDataRow, MockDataServiceRequest } from '../../src/types.js';

// Trimmed from SEPMRA_ALP_SO_ANA_SRV (SEPMRA_C_ALP_SlsOrdItemCubeALPResults): an aggregate whose
// 15-character currency text mirrors the 40-character I_Currency.Currency_Text through a value list,
// while the currency code itself is bound to I_Currency by a referential constraint.
const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:sap="http://www.sap.com/Protocols/SAPData">
<edmx:DataServices m:DataServiceVersion="2.0">
<Schema Namespace="ALP" xml:lang="en" sap:schema-version="1" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
<EntityType Name="I_CurrencyType" sap:label="Currency" sap:content-version="1">
<Key><PropertyRef Name="Currency"/></Key>
<Property Name="Currency" Type="Edm.String" Nullable="false" MaxLength="5" sap:text="Currency_Text" sap:label="Currency" sap:semantics="currency-code"/>
<Property Name="Currency_Text" Type="Edm.String" MaxLength="40" sap:label="Description"/>
</EntityType>
<EntityType Name="SalesCubeResult" sap:semantics="aggregate" sap:label="Sales Analysis" sap:content-version="1">
<Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.String" Nullable="false" sap:sortable="false" sap:filterable="false"/>
<Property Name="NetAmount" Type="Edm.Decimal" Precision="16" Scale="3" sap:aggregation-role="measure" sap:unit="Currency" sap:label="Revenue" sap:filterable="false"/>
<Property Name="Currency" Type="Edm.String" MaxLength="5" sap:aggregation-role="dimension" sap:text="CurrencyT" sap:label="Currency" sap:value-list="standard" sap:semantics="currency-code"/>
<Property Name="CurrencyT" Type="Edm.String" MaxLength="15" sap:attribute-for="Currency" sap:label="Currency Name"/>
<NavigationProperty Name="to_Currency" Relationship="ALP.assoc_Currency" FromRole="FromRole_assoc_Currency" ToRole="ToRole_assoc_Currency"/>
</EntityType>
<Association Name="assoc_Currency" sap:content-version="1">
<End Type="ALP.SalesCubeResult" Multiplicity="1" Role="FromRole_assoc_Currency"/>
<End Type="ALP.I_CurrencyType" Multiplicity="0..1" Role="ToRole_assoc_Currency"/>
<ReferentialConstraint>
<Principal Role="ToRole_assoc_Currency"><PropertyRef Name="Currency"/></Principal>
<Dependent Role="FromRole_assoc_Currency"><PropertyRef Name="Currency"/></Dependent>
</ReferentialConstraint>
</Association>
<EntityContainer Name="ALP_Entities" m:IsDefaultEntityContainer="true">
<EntitySet Name="I_Currency" EntityType="ALP.I_CurrencyType"/>
<EntitySet Name="SalesCubeResults" EntityType="ALP.SalesCubeResult"/>
<AssociationSet Name="assoc_Currency" Association="ALP.assoc_Currency">
<End EntitySet="SalesCubeResults" Role="FromRole_assoc_Currency"/>
<End EntitySet="I_Currency" Role="ToRole_assoc_Currency"/>
</AssociationSet>
</EntityContainer>
<Annotations Target="ALP.SalesCubeResult/Currency" xmlns="http://docs.oasis-open.org/odata/ns/edm">
<Annotation Term="com.sap.vocabularies.Common.v1.ValueList"><Record>
<PropertyValue Property="CollectionPath" String="I_Currency"/>
<PropertyValue Property="Parameters"><Collection>
<Record Type="com.sap.vocabularies.Common.v1.ValueListParameterInOut">
<PropertyValue Property="LocalDataProperty" PropertyPath="Currency"/>
<PropertyValue Property="ValueListProperty" String="Currency"/>
</Record>
<Record Type="com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly">
<PropertyValue Property="ValueListProperty" String="Currency_Text"/>
</Record>
</Collection></PropertyValue>
</Record></Annotation>
</Annotations>
</Schema>
</edmx:DataServices>
</edmx:Edmx>`;

const request: MockDataServiceRequest = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/sap/opu/odata/sap/ALP_SRV/', odataVersion: '2.0' },
    targets: [
        { name: 'I_Currency', kind: 'entity-set' },
        { name: 'SalesCubeResults', kind: 'entity-set' }
    ],
    existingData: {}
};

const currencies: MockDataRow[] = [
    { Currency: 'AUD', Currency_Text: 'Australian Dollar' },
    { Currency: 'HKD', Currency_Text: 'Hong Kong Dollar' },
    { Currency: 'EUR', Currency_Text: 'Euro' }
];

function invalidTuples(results: MockDataRow[]): ReadonlyArray<string> {
    return validateTupleDomains(parseEdmx(metadata), { I_Currency: currencies, SalesCubeResults: results }, {})
        .filter(({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID')
        .map(({ target }) => target);
}

describe('value-list display text narrower than the value-help text', () => {
    it('accepts the value-help text fitted to the local text facet', () => {
        // Given a 15-character CurrencyT displaying the 17-character "Australian Dollar"
        const results = [
            { ID: '1', Currency: 'AUD', CurrencyT: 'Australian Doll' },
            { ID: '2', Currency: 'EUR', CurrencyT: 'Euro' }
        ];
        // When the final rows are validated against I_Currency
        const invalid = invalidTuples(results);
        // Then the fitted text is a member of the AUD tuple
        expect(invalid).toEqual([]);
    });

    it('still rejects a fitted text that belongs to a different value-help row', () => {
        // Given AUD paired with the fitted text of HKD (the stale value seen in BAS)
        const results = [{ ID: '1', Currency: 'AUD', CurrencyT: 'Hong Kong Dolla' }];
        // When validated
        const invalid = invalidTuples(results);
        // Then the tuple is still invalid
        expect(invalid).toEqual(['SalesCubeResults.Currency']);
    });

    it('still requires the exact value-help text when it fits the local facet', () => {
        // Given EUR whose full text fits, but with a shortened text
        const results = [{ ID: '1', Currency: 'EUR', CurrencyT: 'Eur' }];
        // When validated
        const invalid = invalidTuples(results);
        // Then a prefix of a text that fits is not accepted
        expect(invalid).toEqual(['SalesCubeResults.Currency']);
    });

    it('generates the service when a referenced currency name exceeds the local text facet', async () => {
        // Given ten currencies, which include AUD ("Australian Dollar", 17 characters)
        const options = { pipeline: 'semantic-v2', rowsPerEntity: 10, seed: 1 } as const;
        // When the service is generated
        const result = await generateService(request, options);
        // Then every result row displays its own currency text, fitted to 15 characters
        const cube = result.resources.SalesCubeResults;
        expect(cube.find(({ Currency }) => Currency === 'AUD')?.CurrencyT).toBe('Australian Doll');
        for (const row of cube) {
            const currency = result.resources.I_Currency.find(({ Currency }) => Currency === row.Currency);
            expect(row.CurrencyT).toBe(Array.from(String(currency?.Currency_Text)).slice(0, 15).join(''));
        }
        expect(() => validateGeneratedResult(request, result, options)).not.toThrow();
    });
});
