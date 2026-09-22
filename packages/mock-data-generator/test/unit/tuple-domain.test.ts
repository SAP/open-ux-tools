import { parseEdmx } from '../../src/schema/edmx.js';
import { parseCsn } from '../../src/schema/csn.js';
import { finalizeSemanticServiceWorld } from '../../src/generation/service-world.js';
import { validateTupleDomains } from '../../src/generation/tuple-domain.js';
import { resolveValueListContext } from '../../src/generation/value-list-context.js';
import type { SchemaGraph } from '../../src/schema/graph.js';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Country"><Key><PropertyRef Name="Code"/></Key><Property Name="Code" Type="Edm.String" Nullable="false"/><Property Name="Name" Type="Edm.String" Nullable="false"/><Property Name="Tenant" Type="Edm.String" Nullable="false"/></EntityType>
    <EntityType Name="Product"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="CountryCode" Type="Edm.String" Nullable="false"><Annotation Term="com.sap.vocabularies.Common.v1.ValueList"><Record><PropertyValue Property="CollectionPath" String="Countries"/><PropertyValue Property="Parameters"><Collection>
      <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterInOut"><PropertyValue Property="LocalDataProperty" PropertyPath="CountryCode"/><PropertyValue Property="ValueListProperty" String="Code"/></Record>
      <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterOut"><PropertyValue Property="LocalDataProperty" PropertyPath="CountryName"/><PropertyValue Property="ValueListProperty" String="Name"/></Record>
      <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly"><PropertyValue Property="ValueListProperty" String="Name"/></Record>
      <Record Type="com.sap.vocabularies.Common.v1.ValueListParameterIn"><PropertyValue Property="LocalDataProperty" PropertyPath="Tenant"/><PropertyValue Property="ValueListProperty" String="Tenant"/><PropertyValue Property="Constant" String="A"/></Record>
    </Collection></PropertyValue></Record></Annotation></Property><Property Name="CountryName" Type="Edm.String" Nullable="false"/><Property Name="Tenant" Type="Edm.String" Nullable="false"/></EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Countries" EntityType="Demo.Country"/><EntitySet Name="Products" EntityType="Demo.Product"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;

describe('tuple-domain semantics', () => {
    it('uses authored empty rows and non-enumerable precedence over generated rows', () => {
        const graph = parseCsn(JSON.stringify({ definitions: {} }));
        const generatedRows = [{ Code: 'GEN', Caption: 'Generated' }];
        const authoredEmpty = resolveValueListContext(
            graph,
            'References',
            { References: generatedRows },
            {
                References: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [] }
                }
            }
        );
        expect(authoredEmpty.source).toBe('authored');
        expect(authoredEmpty.rows).toEqual([]);
        const nonEnumerable = resolveValueListContext(
            graph,
            'References',
            { References: generatedRows },
            {
                References: {
                    contributor: { present: true, hasInitialData: true },
                    initialRows: { source: 'contributor', present: true, enumerable: false }
                }
            }
        );
        expect(nonEnumerable.source).toBe('unavailable');
        expect(nonEnumerable.rows).toEqual([]);
    });

    it('propagates explicit target-key text links and validates differently named keys', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Item',
                    entitySetName: 'Items',
                    properties: [
                        { name: 'ID', primitiveType: 'int', nullable: false, isKey: true, annotations: [] },
                        {
                            name: 'ExternalCode',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: false,
                            links: {
                                text: 'ExternalName',
                                valueListCollection: 'References',
                                valueListParameters: [
                                    {
                                        direction: 'InOut',
                                        localProperty: 'ExternalCode',
                                        valueListProperty: 'ReferenceKey'
                                    },
                                    { direction: 'Out', localProperty: 'ExternalName', valueListProperty: 'Label' }
                                ],
                                valueListMappings: [
                                    { localProperty: 'ExternalCode', valueListProperty: 'ReferenceKey' }
                                ]
                            },
                            annotations: []
                        },
                        {
                            name: 'ExternalName',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: false,
                            annotations: []
                        }
                    ]
                },
                {
                    name: 'Reference',
                    entitySetName: 'References',
                    properties: [
                        {
                            name: 'ReferenceKey',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: true,
                            links: { text: 'Label' },
                            annotations: []
                        },
                        { name: 'Label', primitiveType: 'string', nullable: false, isKey: false, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const generated = finalizeSemanticServiceWorld(
            graph,
            {
                Items: [{ ID: 1, ExternalCode: 'unbound', ExternalName: 'stale' }],
                References: [{ ReferenceKey: 'R1', Label: 'Reference one' }]
            },
            {},
            1
        );
        expect(generated.Items).toEqual([{ ID: 1, ExternalCode: 'R1', ExternalName: 'Reference one' }]);
        expect(validateTupleDomains(graph, generated, {}).filter(({ code }) => code.includes('TUPLE'))).toEqual([]);
        const invalid = validateTupleDomains(
            graph,
            { Items: [{ ID: 1, ExternalCode: 'R1', ExternalName: 'wrong' }], References: generated.References ?? [] },
            {}
        );
        expect(invalid.some(({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID')).toBe(true);
    });

    it('preserves protected enum assignments when generated tuples disagree', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Item',
                    entitySetName: 'Items',
                    properties: [
                        { name: 'ID', primitiveType: 'int', nullable: false, isKey: true, annotations: [] },
                        {
                            name: 'Code',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: false,
                            enumValues: ['AUTH'],
                            links: {
                                valueListCollection: 'References',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'Key' }
                                ]
                            },
                            annotations: []
                        }
                    ]
                },
                {
                    name: 'Reference',
                    entitySetName: 'References',
                    properties: [
                        { name: 'Key', primitiveType: 'string', nullable: false, isKey: true, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];
        const result = finalizeSemanticServiceWorld(
            graph,
            { Items: [{ ID: 1, Code: 'AUTH' }], References: [{ Key: 'GEN' }] },
            {},
            1,
            new Map(),
            diagnostics
        );
        expect(result.Items).toEqual([{ ID: 1, Code: 'AUTH' }]);
        expect(diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(true);
    });

    it('preserves CSN value-list parameter direction and constants', () => {
        const graph = parseCsn(
            JSON.stringify({
                definitions: {
                    'Demo.Product': {
                        kind: 'entity',
                        elements: {
                            CountryCode: {
                                type: 'cds.String',
                                '@Common.ValueList': {
                                    CollectionPath: 'Countries',
                                    Parameters: [
                                        {
                                            $Type: 'com.sap.vocabularies.Common.v1.ValueListParameterInOut',
                                            LocalDataProperty: { '=': 'CountryCode' },
                                            ValueListProperty: 'Code'
                                        },
                                        {
                                            $Type: 'com.sap.vocabularies.Common.v1.ValueListParameterIn',
                                            LocalDataProperty: { '=': 'Tenant' },
                                            ValueListProperty: 'Tenant',
                                            Constant: 'A'
                                        }
                                    ]
                                }
                            },
                            Tenant: { type: 'cds.String' }
                        }
                    }
                }
            })
        );
        expect(graph.entities[0]?.properties[0]?.links?.valueListParameters).toEqual([
            { direction: 'InOut', localProperty: 'CountryCode', valueListProperty: 'Code' },
            { direction: 'In', localProperty: 'Tenant', valueListProperty: 'Tenant', constant: 'A' }
        ]);
    });

    it('preserves value-list parameter direction and constants', () => {
        const product = parseEdmx(metadata).entities.find(({ entitySetName }) => entitySetName === 'Products');
        const parameters = product?.properties.find(({ name }) => name === 'CountryCode')?.links?.valueListParameters;
        expect(parameters).toEqual([
            { direction: 'InOut', localProperty: 'CountryCode', valueListProperty: 'Code' },
            { direction: 'Out', localProperty: 'CountryName', valueListProperty: 'Name' },
            { direction: 'DisplayOnly', valueListProperty: 'Name' },
            { direction: 'In', localProperty: 'Tenant', valueListProperty: 'Tenant', constant: 'A' }
        ]);
    });

    it('reports authored tuple membership failures without claiming success', () => {
        const graph = parseEdmx(metadata);
        const diagnostics = validateTupleDomains(
            graph,
            {
                Products: [{ ID: 1, CountryCode: 'DE', CountryName: 'Deutschland', Tenant: 'A' }],
                Countries: [{ Code: 'IE', Name: 'Ireland', Tenant: 'A' }]
            },
            {
                Countries: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [{ Code: 'IE', Name: 'Ireland', Tenant: 'A' }] }
                }
            }
        );
        expect(diagnostics.some(({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID')).toBe(true);
    });
});
