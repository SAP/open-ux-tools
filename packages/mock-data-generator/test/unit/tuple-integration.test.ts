import { readFileSync } from 'node:fs';
import { generateService, inspectService, validateGeneratedResult } from '../../src/index.js';
import { createMockDataGenerator } from '../../src/standalone.js';
import { finalizeSemanticServiceWorld } from '../../src/generation/service-world.js';
import { validateTupleDomains } from '../../src/generation/tuple-domain.js';
import type { MockDataServiceRequest } from '../../src/types.js';
import type { SchemaGraph } from '../../src/schema/graph.js';
import { travelAuthoredValueHelpEvidence } from './travel-authored-value-helps.js';

const metadata = JSON.stringify({
    definitions: {
        'Demo.Items': {
            kind: 'entity',
            elements: {
                ID: { type: 'cds.Integer', key: true },
                Code: {
                    type: 'cds.String',
                    '@Common.ValueList': {
                        CollectionPath: 'Codes',
                        Parameters: [
                            {
                                $Type: 'Common.ValueListParameterInOut',
                                LocalDataProperty: { '=': 'Code' },
                                ValueListProperty: 'Code'
                            },
                            {
                                $Type: 'Common.ValueListParameterOut',
                                LocalDataProperty: { '=': 'Caption' },
                                ValueListProperty: 'Caption'
                            }
                        ]
                    }
                },
                Caption: { type: 'cds.String' }
            }
        },
        'Demo.Codes': {
            kind: 'entity',
            elements: {
                Code: { type: 'cds.String', key: true, length: 8 },
                Caption: { type: 'cds.String', length: 80 }
            }
        }
    }
});
const request: MockDataServiceRequest = {
    metadata: { format: 'csn', content: metadata },
    service: { urlPath: '/tuple', odataVersion: '4.0' },
    targets: [{ name: 'Items', kind: 'entity-set' }],
    existingData: {
        Codes: {
            contributor: { present: false },
            initialRows: {
                source: 'json',
                present: true,
                rows: [
                    { Code: 'A', Caption: 'Alpha' },
                    { Code: 'B', Caption: 'Beta' }
                ]
            }
        }
    }
};

describe('tuple constraints through generation and cache validation', () => {
    it('preserves authored status codes and captions through a relationship-bound value help', async () => {
        const content = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Evidence">
<EntityType Name="Status"><Key><PropertyRef Name="Code"/></Key>
<Property Name="Code" Type="Edm.String" MaxLength="1" Nullable="false"><Annotation Term="Common.Text" Path="Caption"/></Property>
<Property Name="Caption" Type="Edm.String" MaxLength="40" Nullable="false"/></EntityType>
<EntityType Name="Item"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="StatusCode" Type="Edm.String" MaxLength="1" Nullable="false">
<Annotation Term="Common.Text" Path="StatusText"/>
<Annotation Term="Common.ValueList"><Record><PropertyValue Property="CollectionPath" String="Statuses"/>
<PropertyValue Property="Parameters"><Collection><Record Type="Common.ValueListParameterInOut">
<PropertyValue Property="LocalDataProperty" PropertyPath="StatusCode"/>
<PropertyValue Property="ValueListProperty" String="Code"/></Record></Collection></PropertyValue>
</Record></Annotation></Property>
<Property Name="StatusText" Type="Edm.String" MaxLength="40"/>
<NavigationProperty Name="Status" Type="Evidence.Status" Nullable="false">
<ReferentialConstraint Property="StatusCode" ReferencedProperty="Code"/></NavigationProperty></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Statuses" EntityType="Evidence.Status"/>
<EntitySet Name="Items" EntityType="Evidence.Item"><NavigationPropertyBinding Path="Status" Target="Statuses"/>
</EntitySet></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`;
        const evidenceRequest: MockDataServiceRequest = {
            metadata: { format: 'edmx', content },
            service: { urlPath: '/evidence', odataVersion: '4.0' },
            targets: [{ name: 'Items', kind: 'entity-set' }],
            existingData: {
                Statuses: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [{ Code: 'O', Caption: 'Open' }] }
                }
            }
        };
        const generationOptions = { pipeline: 'semantic-v2', rowsPerEntity: 3, seed: 7 } as const;
        const classifier = {
            fingerprint: 'status-evidence-regression',
            classify: async (field: { propertyName: string }) => ({
                role: field.propertyName === 'StatusCode' ? 'status' : 'description',
                source: 'classifier' as const,
                confidence: 0.99
            })
        };
        const result = await generateService(evidenceRequest, generationOptions, { classifier });
        const report = await inspectService(evidenceRequest, generationOptions, { classifier });
        expect(result.resources.Items).toHaveLength(3);
        expect(result.resources.Items.every((row) => row.StatusCode === 'O' && row.StatusText === 'Open')).toBe(true);
        expect(() => validateGeneratedResult(evidenceRequest, result, generationOptions)).not.toThrow();
        expect(report.fieldDecisions.find(({ property }) => property === 'StatusCode')?.detectedRole).toBe('status');
        expect(report.fieldDecisions.find(({ property }) => property === 'StatusCode')?.acceptedRole).toBe('status');
        const session = await createMockDataGenerator();
        try {
            const standalone = await session.generateService(evidenceRequest, {
                mode: 'deterministic',
                rowsPerEntity: 3,
                seed: 7
            });
            expect(standalone.semanticCoverage.evidenceVerifiedFields).toBe(2);
        } finally {
            await session.dispose();
        }
    });

    it('preserves authored owner fields when value-help output disagrees', () => {
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
                            links: {
                                valueListCollection: 'Codes',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'Code' },
                                    { direction: 'Out', localProperty: 'Caption', valueListProperty: 'Caption' }
                                ]
                            },
                            annotations: []
                        },
                        { name: 'Caption', primitiveType: 'string', nullable: false, isKey: false, annotations: [] }
                    ]
                },
                {
                    name: 'Code',
                    entitySetName: 'Codes',
                    properties: [
                        { name: 'Code', primitiveType: 'string', nullable: false, isKey: true, annotations: [] },
                        { name: 'Caption', primitiveType: 'string', nullable: false, isKey: false, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const authored = { ID: 1, Code: 'A', Caption: 'AUTHORED' };
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];

        const result = finalizeSemanticServiceWorld(
            graph,
            { Items: [authored], Codes: [{ Code: 'A', Caption: 'ALPHA' }] },
            {
                Items: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [authored] }
                }
            },
            1,
            new Map(),
            diagnostics
        );

        expect(result.Items).toEqual([authored]);
        expect(diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(true);
    });

    it('varies initially unbound generated value-help tuples despite a coincidental scalar match', () => {
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
                            links: {
                                valueListCollection: 'Codes',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'Code' },
                                    { direction: 'Out', localProperty: 'Caption', valueListProperty: 'Caption' }
                                ]
                            },
                            annotations: []
                        },
                        { name: 'Caption', primitiveType: 'string', nullable: false, isKey: false, annotations: [] }
                    ]
                },
                {
                    name: 'Code',
                    entitySetName: 'Codes',
                    properties: [
                        { name: 'Code', primitiveType: 'string', nullable: false, isKey: true, annotations: [] },
                        { name: 'Caption', primitiveType: 'string', nullable: false, isKey: false, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const result = finalizeSemanticServiceWorld(
            graph,
            {
                Items: [
                    { ID: 1, Code: 'O', Caption: 'placeholder' },
                    { ID: 2, Code: 'O', Caption: 'placeholder' },
                    { ID: 3, Code: 'O', Caption: 'placeholder' }
                ],
                Codes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'O'].map((Code) => ({
                    Code,
                    Caption: `Caption ${Code}`
                }))
            },
            {},
            1
        );

        expect(result.Items).toEqual([
            { ID: 1, Code: 'A', Caption: 'Caption A' },
            { ID: 2, Code: 'B', Caption: 'Caption B' },
            { ID: 3, Code: 'C', Caption: 'Caption C' }
        ]);
    });

    it('revisits generated domains after a cross-entity extension', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Code',
                    entitySetName: 'Codes',
                    properties: [
                        {
                            name: 'ID',
                            primitiveType: 'int',
                            nullable: false,
                            isKey: true,
                            links: {
                                valueListCollection: 'References',
                                valueListParameters: [
                                    { direction: 'In', localProperty: 'ID', valueListProperty: 'ID' },
                                    { direction: 'Out', localProperty: 'Flag', valueListProperty: 'Flag' }
                                ]
                            },
                            annotations: []
                        },
                        { name: 'Flag', primitiveType: 'int', nullable: false, isKey: false, annotations: [] }
                    ]
                },
                {
                    name: 'Owner',
                    entitySetName: 'Owners',
                    properties: [
                        {
                            name: 'Code',
                            primitiveType: 'int',
                            nullable: false,
                            isKey: true,
                            links: {
                                valueListCollection: 'Codes',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'ID' }
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
                        { name: 'ID', primitiveType: 'int', nullable: false, isKey: true, annotations: [] },
                        { name: 'Flag', primitiveType: 'int', nullable: false, isKey: false, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];
        const result = finalizeSemanticServiceWorld(
            graph,
            {
                Codes: [{ ID: 0, Flag: 0 }],
                Owners: [{ Code: 1 }],
                References: [
                    { ID: 0, Flag: 0 },
                    { ID: 1, Flag: 1 }
                ]
            },
            {},
            1,
            new Map(),
            diagnostics,
            {},
            new Map([
                ['Codes', 'entity-set'],
                ['Owners', 'entity-set'],
                ['References', 'entity-set']
            ])
        );

        expect(result.Codes).toEqual([
            { ID: 0, Flag: 0 },
            { ID: 1, Flag: 1 }
        ]);
        expect(
            validateTupleDomains(graph, result, {}).some(({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID')
        ).toBe(false);
    });

    it('caps generated value-list extension and reports protected tuples that cannot fit', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Owner',
                    entitySetName: 'Owners',
                    properties: [
                        {
                            name: 'Code',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: true,
                            links: {
                                valueListCollection: 'Codes',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'Code' }
                                ]
                            },
                            annotations: []
                        }
                    ]
                },
                {
                    name: 'Code',
                    entitySetName: 'Codes',
                    properties: [
                        { name: 'Code', primitiveType: 'string', nullable: false, isKey: true, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const ownerRows = Array.from({ length: 1_001 }, (_unused, index) => ({ Code: `owner-${index}` }));
        const domainRows = Array.from({ length: 1_000 }, (_unused, index) => ({ Code: `domain-${index}` }));
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];
        const result = finalizeSemanticServiceWorld(
            graph,
            { Owners: ownerRows, Codes: domainRows },
            {},
            1,
            new Map(),
            diagnostics,
            {},
            new Map([
                ['Owners', 'entity-set'],
                ['Codes', 'entity-set']
            ])
        );

        expect(result.Codes).toHaveLength(1_000);
        expect(
            diagnostics.some(({ code, message }) => code === 'SEMANTIC_DOMAIN_CONFLICT' && /capacity/iu.test(message))
        ).toBe(true);
    });

    it('honors singleton value-list capacity when extending generated domains', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Owner',
                    entitySetName: 'Owners',
                    properties: [
                        {
                            name: 'Code',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: true,
                            links: {
                                valueListCollection: 'Codes',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'Code' }
                                ]
                            },
                            annotations: []
                        }
                    ]
                },
                {
                    name: 'Code',
                    entitySetName: 'Codes',
                    properties: [
                        { name: 'Code', primitiveType: 'string', nullable: false, isKey: true, annotations: [] }
                    ]
                }
            ],
            relationships: []
        };
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];
        const result = finalizeSemanticServiceWorld(
            graph,
            { Owners: [{ Code: 'owner-1' }, { Code: 'owner-2' }], Codes: [{ Code: 'singleton' }] },
            {},
            1,
            new Map(),
            diagnostics,
            {},
            new Map([
                ['Owners', 'entity-set'],
                ['Codes', 'singleton']
            ])
        );

        expect(result.Codes).toHaveLength(1);
        expect(diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(true);
    });

    it('does not extend generated domains with values that violate semantic facets', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Owner',
                    entitySetName: 'Owners',
                    properties: [
                        {
                            name: 'ExternalID',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: true,
                            links: {
                                valueListCollection: 'Banks',
                                valueListParameters: [
                                    {
                                        direction: 'InOut',
                                        localProperty: 'ExternalID',
                                        valueListProperty: 'SWIFTCode'
                                    }
                                ]
                            },
                            annotations: []
                        }
                    ]
                },
                {
                    name: 'Bank',
                    entitySetName: 'Banks',
                    properties: [
                        {
                            name: 'SWIFTCode',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: true,
                            maxLength: 11,
                            annotations: []
                        }
                    ]
                }
            ],
            relationships: []
        };
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];
        const result = finalizeSemanticServiceWorld(
            graph,
            { Owners: [{ ExternalID: 'X' }], Banks: [{ SWIFTCode: 'DEUTDEFF' }] },
            {},
            1,
            new Map([['Banks.SWIFTCode', { role: 'bic', confidence: 1, source: 'metadata' as const }]]),
            diagnostics,
            {},
            new Map([
                ['Owners', 'entity-set'],
                ['Banks', 'entity-set']
            ])
        );

        expect(result.Banks).toEqual([{ SWIFTCode: 'DEUTDEFF' }]);
        expect(diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(true);
    });

    it('does not extend generated domains with rows that break outgoing relationships', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Owner',
                    entitySetName: 'Owners',
                    properties: [
                        {
                            name: 'Code',
                            primitiveType: 'int',
                            nullable: false,
                            isKey: true,
                            links: {
                                valueListCollection: 'Codes',
                                valueListParameters: [
                                    { direction: 'InOut', localProperty: 'Code', valueListProperty: 'ID' },
                                    {
                                        direction: 'InOut',
                                        localProperty: 'ParentID',
                                        valueListProperty: 'ParentID'
                                    }
                                ]
                            },
                            annotations: []
                        },
                        { name: 'ParentID', primitiveType: 'string', nullable: false, isKey: true, annotations: [] }
                    ]
                },
                {
                    name: 'Code',
                    entitySetName: 'Codes',
                    properties: [
                        { name: 'ID', primitiveType: 'int', nullable: false, isKey: true, annotations: [] },
                        { name: 'ParentID', primitiveType: 'string', nullable: false, isKey: false, annotations: [] }
                    ]
                },
                {
                    name: 'Parent',
                    entitySetName: 'Parents',
                    properties: [{ name: 'ID', primitiveType: 'string', nullable: false, isKey: true, annotations: [] }]
                }
            ],
            relationships: [
                {
                    name: 'CodeParent',
                    fromEntitySet: 'Codes',
                    toEntitySet: 'Parents',
                    mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }],
                    targetCardinality: 'one'
                }
            ]
        };
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[6] = [];
        const result = finalizeSemanticServiceWorld(
            graph,
            { Owners: [{ Code: 1, ParentID: 'P1' }], Codes: [{ ID: 0, ParentID: 'P0' }], Parents: [{ ID: 'P0' }] },
            {},
            1,
            new Map(),
            diagnostics,
            {},
            new Map([
                ['Owners', 'entity-set'],
                ['Codes', 'entity-set'],
                ['Parents', 'entity-set']
            ])
        );

        expect(result.Codes).toEqual([{ ID: 0, ParentID: 'P0' }]);
        expect(diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(true);
    });

    it('keeps generated Travel value-help tuples coherent across generated key domains', async () => {
        const travelMetadata = readFileSync(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
        const travelRequest: MockDataServiceRequest = {
            metadata: { format: 'edmx', content: travelMetadata },
            service: { urlPath: '/travel', odataVersion: '2.0' },
            targets: [...travelMetadata.matchAll(/<EntitySet Name="([^"]+)"/gu)].map((match) => ({
                name: match[1],
                kind: 'entity-set' as const
            })),
            existingData: travelAuthoredValueHelpEvidence
        };
        const options = {
            pipeline: 'semantic-v2' as const,
            mode: 'deterministic' as const,
            seed: 42,
            rowsPerEntity: 10
        };
        const result = await generateService(travelRequest, options);

        expect(result.resources.Booking).toHaveLength(10);
        expect(result.resources.BookingStatus).toEqual([
            { BookingStatus: 'Q', BookingStatus_Text: 'Fixture workflow state' }
        ]);
        expect(result.diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(false);
        expect(() => validateGeneratedResult(travelRequest, result, options)).not.toThrow();
    });

    it.each([1, 2, 3, 4])(
        'keeps generated Travel value-help tuples coherent when %i rows are requested',
        async (rowsPerEntity) => {
            const travelMetadata = readFileSync(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
            const travelRequest: MockDataServiceRequest = {
                metadata: { format: 'edmx', content: travelMetadata },
                service: { urlPath: '/travel', odataVersion: '2.0' },
                targets: [...travelMetadata.matchAll(/<EntitySet Name="([^"]+)"/gu)].map((match) => ({
                    name: match[1],
                    kind: 'entity-set' as const
                })),
                existingData: travelAuthoredValueHelpEvidence
            };
            const options = {
                pipeline: 'semantic-v2' as const,
                mode: 'deterministic' as const,
                seed: 42,
                rowsPerEntity
            };

            const result = await generateService(travelRequest, options);

            expect(result.resources.Booking).toHaveLength(rowsPerEntity);
            expect(result.diagnostics.some(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT')).toBe(false);
            expect(() => validateGeneratedResult(travelRequest, result, options)).not.toThrow();
        }
    );

    it('recomputes derived display values when a generated value-help domain expands', async () => {
        const travelMetadata = readFileSync(new URL('./travel-v2.metadata.xml', import.meta.url), 'utf8');
        const travelRequest: MockDataServiceRequest = {
            metadata: { format: 'edmx', content: travelMetadata },
            service: { urlPath: '/travel', odataVersion: '2.0' },
            targets: [...travelMetadata.matchAll(/<EntitySet Name="([^"]+)"/gu)].map((match) => ({
                name: match[1],
                kind: 'entity-set' as const
            })),
            existingData: travelAuthoredValueHelpEvidence
        };

        const result = await generateService(travelRequest, {
            pipeline: 'semantic-v2',
            mode: 'deterministic',
            seed: 42,
            rowsPerEntity: 1
        });
        const names = new Intl.DisplayNames('en', { type: 'currency' });

        for (const row of result.resources.Currency) {
            expect(row.Currency_Text).toBe(names.of(String(row.Currency)));
        }
        const regions = new Intl.DisplayNames('en', { type: 'region' });
        for (const row of result.resources.Country) {
            expect(row.Country_Text).toBe(regions.of(String(row.Country)));
        }
    });

    it('uses generated value-help resources as generated tuple domains when authored context is missing', async () => {
        const generatedParentRequest: MockDataServiceRequest = {
            metadata: {
                format: 'csn',
                content: JSON.stringify({
                    definitions: {
                        'Demo.Items': {
                            kind: 'entity',
                            elements: {
                                ID: { type: 'cds.Integer', key: true },
                                Code: {
                                    type: 'cds.String',
                                    '@Common.ValueList': {
                                        CollectionPath: 'Codes',
                                        Parameters: [
                                            {
                                                $Type: 'Common.ValueListParameterInOut',
                                                LocalDataProperty: { '=': 'Code' },
                                                ValueListProperty: 'Code'
                                            },
                                            {
                                                $Type: 'Common.ValueListParameterOut',
                                                LocalDataProperty: { '=': 'Caption' },
                                                ValueListProperty: 'Caption'
                                            }
                                        ]
                                    }
                                },
                                Caption: { type: 'cds.String' }
                            }
                        },
                        'Demo.Codes': {
                            kind: 'entity',
                            elements: {
                                Code: { type: 'cds.String', key: true, length: 8 },
                                Caption: { type: 'cds.String', length: 80 }
                            }
                        }
                    }
                })
            },
            service: { urlPath: '/generated-tuples', odataVersion: '4.0' },
            targets: [
                { name: 'Items', kind: 'entity-set' },
                { name: 'Codes', kind: 'entity-set' }
            ],
            existingData: {}
        };
        const result = await generateService(generatedParentRequest, {
            pipeline: 'semantic-v2',
            rowsPerEntity: 2,
            seed: 17,
            mode: 'deterministic'
        });
        const parentRows = result.resources.Codes ?? [];
        expect(parentRows.length).toBeGreaterThan(0);
        expect(
            result.resources.Items?.every((row) =>
                parentRows.some((candidate) => candidate.Code === row.Code && candidate.Caption === row.Caption)
            )
        ).toBe(true);
        expect(result.diagnostics.some(({ code }) => code === 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE')).toBe(false);
    });

    it('does not use generated rows when a contributor is present but non-enumerable', async () => {
        const generatedParentRequest = {
            ...request,
            targets: [{ name: 'Items', kind: 'entity-set' as const }],
            existingData: {
                Codes: {
                    contributor: { present: true, hasInitialData: true },
                    initialRows: { source: 'contributor' as const, present: true, enumerable: false }
                }
            }
        };
        const result = await generateService(generatedParentRequest, {
            pipeline: 'semantic-v2',
            rowsPerEntity: 1,
            seed: 3,
            mode: 'deterministic'
        });
        expect(result.resources.Items?.[0]?.Code).not.toBe('A');
        expect(result.diagnostics.some(({ code }) => code === 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE')).toBe(true);
    });

    it('distinguishes the loaded classifier input contract from the selected pipeline', async () => {
        const report = await inspectService(
            request,
            { pipeline: 'semantic-v2', rowsPerEntity: 1 },
            {
                classifier: {
                    fingerprint: 'loaded-v2-artifact',
                    inputFormat: 'v2',
                    classify: async () => ({ role: 'unknown', confidence: 1, source: 'unknown' })
                }
            }
        );
        expect(report.artifactIdentity?.classifier).toEqual({ fingerprint: 'loaded-v2-artifact', inputFormat: 'v2' });
    });
    it('rejects cached combinations even when every scalar belongs to its authored domain', async () => {
        const options = { pipeline: 'semantic-v2' as const, rowsPerEntity: 2 };
        const result = await generateService(request, options);
        expect(result.resources.Items).toHaveLength(2);
        expect(() =>
            validateGeneratedResult(
                request,
                {
                    ...result,
                    resources: {
                        Items: result.resources.Items.map((row) => ({
                            ...row,
                            Caption: row.Code === 'A' ? 'Beta' : 'Alpha'
                        }))
                    }
                },
                options
            )
        ).toThrow(/tuple/iu);
    });

    it('reports unavailable tuple context as unverified, not a validated domain', async () => {
        const report = await inspectService(
            { ...request, existingData: {} },
            { pipeline: 'semantic-v2', rowsPerEntity: 1 }
        );
        expect(report.invariants.find(({ name }) => name === 'semantic-domains')).toEqual(
            expect.objectContaining({ passed: false, status: 'unverified' })
        );
    });
});
