import { jest } from '@jest/globals';

import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataServiceRequest, SftGenerator } from '../../src/types.js';

/**
 * Carriers and the routes they fly. A route's key starts with its carrier, which a value list on the
 * carriers declares; no navigation property links the two.
 *
 * @returns the generation request
 */
function routesService(): MockDataServiceRequest {
    return {
        metadata: {
            format: 'edmx',
            content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="CarrierType"><Key><PropertyRef Name="CarrierID"/></Key>
<Property Name="CarrierID" Type="Edm.String" MaxLength="3" Nullable="false"/>
<Property Name="CarrierName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="RouteType"><Key><PropertyRef Name="CarrierID"/><PropertyRef Name="RouteID"/></Key>
<Property Name="CarrierID" Type="Edm.String" MaxLength="3" Nullable="false"/>
<Property Name="RouteID" Type="Edm.String" MaxLength="4" Nullable="false"/>
<Property Name="CarrierTitle" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityContainer Name="Container">
<EntitySet Name="Carriers" EntityType="Demo.CarrierType"/>
<EntitySet Name="Routes" EntityType="Demo.RouteType"/>
</EntityContainer>
<Annotations Target="Demo.CarrierType/CarrierID">
<Annotation Term="Common.Text" Path="CarrierName"/>
</Annotations>
<Annotations Target="Demo.RouteType/CarrierID">
<Annotation Term="Common.Text" Path="CarrierTitle"/>
<Annotation Term="Common.ValueList"><Record>
<PropertyValue Property="CollectionPath" String="Carriers"/>
<PropertyValue Property="Parameters"><Collection>
<Record Type="Common.ValueListParameterInOut"><PropertyValue Property="LocalDataProperty" PropertyPath="CarrierID"/><PropertyValue Property="ValueListProperty" String="CarrierID"/></Record>
</Collection></PropertyValue>
</Record></Annotation>
</Annotations>
</Schema></edmx:DataServices></edmx:Edmx>`
        },
        service: { urlPath: '/routes', odataVersion: '4.0' },
        targets: [
            { name: 'Carriers', kind: 'entity-set' },
            { name: 'Routes', kind: 'entity-set' }
        ],
        existingData: {}
    };
}

describe('value-list key domains', () => {
    it('draws a key that a value list maps to another entity set key from that entity set', async () => {
        // Given routes keyed by a carrier whose value list is the carriers entity set, and a model whose
        // carrier names the relevance check accepts, which closes the carriers to codes it did not name
        const request = routesService();
        const generate = jest.fn<SftGenerator['generate']>(async (input) => ({
            rows: Array.from({ length: input.rowCount ?? 6 }, (_, index) =>
                Object.fromEntries(
                    input.fields.map(({ name }) => [name, `Carrier ${['North', 'South', 'East', 'West'][index % 4]}`])
                )
            )
        }));

        // When the service is generated with the model
        const result = await generateServiceForTesting(
            request,
            { mode: 'auto', seed: 3, rowsPerEntity: 6 },
            {
                sft: { fingerprint: 'naming-model', generate },
                candidateVerifier: {
                    fingerprint: 'accepts-everything',
                    verifyBatch: async (pairs) => pairs.map(() => true)
                }
            }
        );

        // Then every route's carrier is a generated carrier, its text is that carrier's name, and no
        // value-list conflict is reported
        const names = new Map(result.resources.Carriers.map((row) => [row.CarrierID, row.CarrierName]));
        expect(result.resources.Carriers).toHaveLength(6);
        expect(result.resources.Routes).toHaveLength(6);
        result.resources.Routes.forEach((row) => {
            expect(names.has(row.CarrierID)).toBe(true);
            expect(row.CarrierTitle).toBe(names.get(row.CarrierID));
        });
        expect(result.diagnostics.map(({ code }) => code)).not.toContain('SEMANTIC_DOMAIN_CONFLICT');
    });
});
