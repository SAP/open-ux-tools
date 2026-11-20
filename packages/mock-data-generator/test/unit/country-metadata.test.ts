import { parseEdmx } from '../../src/schema/edmx.js';
import { applyCountryMetadata } from '../../src/generation/country-metadata.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" Version="1.0"><edmx:DataServices><Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" xmlns:sap="http://www.sap.com/Protocols/SAPData" Namespace="Test"><EntityType Name="RegionType"><Key><PropertyRef Name="MarketRegionKey"/></Key><Property Name="MarketRegionKey" Type="Edm.String" Nullable="false" MaxLength="2" sap:semantics="country" sap:text="MarketRegionLabel"/><Property Name="MarketRegionLabel" Type="Edm.String" MaxLength="50" sap:label="Market region name"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Regions" EntityType="Test.RegionType"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;

describe('country metadata generation', () => {
    it('derives linked country labels from each generated country code', () => {
        const graph = parseEdmx(metadata);
        const rows = {
            Regions: [
                { MarketRegionKey: 'IT', MarketRegionLabel: 'Germany' },
                { MarketRegionKey: 'IE', MarketRegionLabel: 'Germany' }
            ]
        };

        const result = applyCountryMetadata(graph, rows, []);

        expect(result.Regions).toEqual([
            { MarketRegionKey: 'IT', MarketRegionLabel: 'Italy' },
            { MarketRegionKey: 'IE', MarketRegionLabel: 'Ireland' }
        ]);
    });

    it('does not overwrite an enum-backed text companion', () => {
        const graph = {
            namespace: 'Test',
            entities: [
                {
                    name: 'Region',
                    entitySetName: 'Regions',
                    properties: [
                        {
                            name: 'RegionKey',
                            primitiveType: 'string' as const,
                            nullable: false,
                            isKey: false,
                            links: { text: 'RegionLabel' },
                            annotations: [{ term: 'sap:semantics', value: 'country' }]
                        },
                        {
                            name: 'RegionLabel',
                            primitiveType: 'string' as const,
                            nullable: false,
                            isKey: false,
                            enumValues: ['Authoritative label'],
                            annotations: []
                        }
                    ]
                }
            ],
            relationships: []
        };
        const rows = { Regions: [{ RegionKey: 'IT', RegionLabel: 'Authoritative label' }] };

        expect(applyCountryMetadata(graph, rows, []).Regions).toEqual(rows.Regions);
    });

    it('uses the accepted country role for renamed linked fields without country annotations', () => {
        const graph = {
            namespace: 'Test',
            entities: [
                {
                    name: 'Region',
                    entitySetName: 'Regions',
                    properties: [
                        {
                            name: 'MarketKey',
                            primitiveType: 'string' as const,
                            nullable: false,
                            isKey: false,
                            links: { text: 'MarketLabel' },
                            annotations: []
                        },
                        {
                            name: 'MarketLabel',
                            primitiveType: 'string' as const,
                            nullable: false,
                            isKey: false,
                            annotations: []
                        }
                    ]
                }
            ],
            relationships: []
        };
        const rows = { Regions: [{ MarketKey: 'IT', MarketLabel: 'Germany' }] };

        expect(
            applyCountryMetadata(
                graph,
                rows,
                [],
                'en',
                new Map([['Regions.MarketKey', { role: 'country', confidence: 1, source: 'metadata' as const }]])
            ).Regions
        ).toEqual([{ MarketKey: 'IT', MarketLabel: 'Italy' }]);
    });

    it('preserves relationship-bound and value-help-bound text assignments', () => {
        const graph = {
            namespace: 'Test',
            entities: [
                {
                    name: 'Region',
                    entitySetName: 'Regions',
                    properties: [
                        {
                            name: 'RegionKey',
                            primitiveType: 'string' as const,
                            nullable: false,
                            isKey: false,
                            links: {
                                text: 'RegionLabel',
                                valueListParameters: [
                                    {
                                        direction: 'InOut' as const,
                                        localProperty: 'RegionLabel',
                                        valueListProperty: 'Name'
                                    }
                                ]
                            },
                            annotations: [{ term: 'sap:semantics', value: 'country' }]
                        },
                        {
                            name: 'RegionLabel',
                            primitiveType: 'string' as const,
                            nullable: false,
                            isKey: false,
                            annotations: []
                        }
                    ]
                }
            ],
            relationships: [
                {
                    name: 'region-label',
                    fromEntitySet: 'Regions',
                    toEntitySet: 'Regions',
                    mappings: [{ sourceProperty: 'RegionLabel', targetProperty: 'RegionLabel' }]
                }
            ]
        };
        const rows = { Regions: [{ RegionKey: 'IT', RegionLabel: 'Authored label' }] };

        expect(applyCountryMetadata(graph, rows, []).Regions).toEqual(rows.Regions);
    });
});
