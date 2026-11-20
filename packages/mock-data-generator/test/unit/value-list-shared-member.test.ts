import { generateServiceForTesting } from '../../src/index.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import type { MockDataServiceRequest } from '../../src/types.js';

const valueList = (collection: string, parameters: string): string =>
    `<Annotation Term="com.sap.vocabularies.Common.v1.ValueList"><Record><PropertyValue Property="CollectionPath" String="${collection}"/><PropertyValue Property="Parameters"><Collection>${parameters}</Collection></PropertyValue></Record></Annotation>`;
const parameter = (direction: string, local: string, valueListProperty: string): string =>
    `<Record Type="com.sap.vocabularies.Common.v1.ValueListParameter${direction}"><PropertyValue Property="LocalDataProperty" PropertyPath="${local}"/><PropertyValue Property="ValueListProperty" String="${valueListProperty}"/></Record>`;

/**
 * Qobs whose Vat takes its values from Zels, and whose Ruk value list copies a Vat of its own from the Ruks: the Vat
 * column of the Ruks feeds a field that must hold a Zel.
 */
const METADATA = `<?xml version="1.0"?><edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="D">
<EntityType Name="Ruk"><Key><PropertyRef Name="Ruk"/></Key><Property Name="Ruk" Type="Edm.String" MaxLength="4" Nullable="false"/><Property Name="Vat" Type="Edm.String" MaxLength="4" Nullable="false"/></EntityType>
<EntityType Name="Zel"><Key><PropertyRef Name="Vat"/></Key><Property Name="Vat" Type="Edm.String" MaxLength="4" Nullable="false"/><Property Name="Wom" Type="Edm.String" MaxLength="40" Nullable="false"/></EntityType>
<EntityType Name="Qob"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Ruk" Type="Edm.String" MaxLength="4" Nullable="false">${valueList('Ruks', parameter('InOut', 'Ruk', 'Ruk') + parameter('Out', 'Vat', 'Vat'))}</Property>
<Property Name="Vat" Type="Edm.String" MaxLength="4" Nullable="false">${valueList('Zels', parameter('InOut', 'Vat', 'Vat') + parameter('Out', 'Wom', 'Wom'))}</Property>
<Property Name="Wom" Type="Edm.String" MaxLength="40" Nullable="false"/></EntityType>
<EntityContainer Name="C"><EntitySet Name="Ruks" EntityType="D.Ruk"/><EntitySet Name="Zels" EntityType="D.Zel"/><EntitySet Name="Qobs" EntityType="D.Qob"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const request: MockDataServiceRequest = {
    metadata: { format: 'edmx', content: METADATA },
    service: { urlPath: '/qobs', odataVersion: '4.0' },
    targets: ['Ruks', 'Zels', 'Qobs'].map((name) => ({ name, kind: 'entity-set' })),
    existingData: {}
};

describe('a field two value lists determine', () => {
    it('lets the value-help column that feeds the field take its values where the field does', () => {
        // Given the metadata
        // When it is parsed
        const graph = parseServiceMetadata(request.metadata);

        // Then the Vat column of the Ruks takes its values from the Zels, as the Vat of a Qob does
        const ruks = graph.entities.find(({ entitySetName }) => entitySetName === 'Ruks');
        expect(ruks?.properties.find(({ name }) => name === 'Vat')?.links).toEqual({
            valueListCollection: 'Zels',
            valueListParameters: [{ direction: 'InOut', localProperty: 'Vat', valueListProperty: 'Vat' }]
        });
    });

    it('fills the field and the columns it reads with values both lists agree on', async () => {
        // Given the service
        // When five rows of each entity set are generated
        const result = await generateServiceForTesting(request, { mode: 'deterministic', seed: 1, rowsPerEntity: 5 });

        // Then no Vat is empty, no Zel has an empty key, and each Qob agrees with its Ruk and its Zel
        const { Ruks: ruks, Zels: zels, Qobs: qobs } = result.resources;
        expect([...ruks, ...zels, ...qobs].filter(({ Vat }) => Vat === '')).toEqual([]);
        const zelByVat = new Map(zels.map((zel) => [zel.Vat, zel]));
        const rukByKey = new Map(ruks.map((ruk) => [ruk.Ruk, ruk]));
        expect(qobs).toHaveLength(5);
        for (const qob of qobs) {
            expect(rukByKey.get(qob.Ruk)?.Vat).toBe(qob.Vat);
            expect(zelByVat.get(qob.Vat)?.Wom).toBe(qob.Wom);
        }
    });
});
