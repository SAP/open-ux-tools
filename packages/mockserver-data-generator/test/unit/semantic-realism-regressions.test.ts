import { generateService, type SftGenerator } from '../../src/index.js';
import { applySftGeneration } from '../../src/generation/sft.js';
import type { SchemaGraph } from '../../src/schema/graph.js';

describe('semantic realism regressions', () => {
    it('routes audit principals to governed user identifiers before SFT', async () => {
        const sft: SftGenerator = {
            fingerprint: 'audit-principal-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [{ createdBy: '1', LastChangedByUser: '2345678901 2' }]
            }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    createdBy: { type: 'cds.String', length: 12 },
                                    LastChangedByUser: { type: 'cds.String', length: 12 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        expect(result.resources.Record?.[0]?.createdBy).toMatch(/^[A-Z][A-Z0-9_]{2,11}$/u);
        expect(result.resources.Record?.[0]?.LastChangedByUser).toMatch(/^[A-Z][A-Z0-9_]{2,11}$/u);
        expect(sft.generate).not.toHaveBeenCalled();
    });

    it('keeps deterministic boolean controls out of the SFT request', async () => {
        const activationProperty = 'Activation_ac';
        const sft: SftGenerator = {
            fingerprint: 'boolean-control-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [{ [activationProperty]: true, OpaqueText: 'Quarterly demand forecast' }]
            }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    [activationProperty]: { type: 'cds.Boolean' },
                                    OpaqueText: { type: 'cds.String', length: 80 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        expect(typeof result.resources.Record?.[0]?.[activationProperty]).toBe('boolean');
        expect(sft.generate).toHaveBeenCalledWith(
            expect.objectContaining({ fields: [expect.objectContaining({ name: 'OpaqueText' })] }),
            expect.any(AbortSignal)
        );
    });

    it('keeps machine-structured primitive values out of the SFT request', async () => {
        const sft: SftGenerator = {
            fingerprint: 'structured-primitive-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [
                    {
                        OpaqueText: 'Quarterly demand forecast',
                        OpaqueInteger: 23,
                        OpaqueDecimal: 42.5
                    }
                ]
            }))
        };
        const graph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Record',
                    entitySetName: 'Record',
                    properties: [
                        { name: 'ID', primitiveType: 'int', nullable: false, isKey: true, annotations: [] },
                        { name: 'OpaqueGuid', primitiveType: 'guid', nullable: true, isKey: false, annotations: [] },
                        { name: 'OpaqueDate', primitiveType: 'date', nullable: true, isKey: false, annotations: [] },
                        {
                            name: 'OpaqueDateTime',
                            primitiveType: 'datetime',
                            nullable: true,
                            isKey: false,
                            annotations: []
                        },
                        {
                            name: 'OpaqueTimestamp',
                            primitiveType: 'datetimeoffset',
                            nullable: true,
                            isKey: false,
                            annotations: []
                        },
                        { name: 'OpaqueTime', primitiveType: 'time', nullable: true, isKey: false, annotations: [] },
                        {
                            name: 'OpaqueBinary',
                            primitiveType: 'binary',
                            nullable: true,
                            isKey: false,
                            annotations: []
                        },
                        { name: 'OpaqueFlag', primitiveType: 'bool', nullable: true, isKey: false, annotations: [] },
                        {
                            name: 'OpaqueText',
                            primitiveType: 'string',
                            nullable: true,
                            isKey: false,
                            maxLength: 80,
                            annotations: []
                        },
                        { name: 'OpaqueInteger', primitiveType: 'int', nullable: true, isKey: false, annotations: [] },
                        {
                            name: 'OpaqueDecimal',
                            primitiveType: 'decimal',
                            nullable: true,
                            isKey: false,
                            annotations: []
                        }
                    ]
                }
            ],
            relationships: []
        } as const satisfies SchemaGraph;

        await applySftGeneration(
            graph,
            {
                Record: [
                    {
                        ID: 1,
                        OpaqueGuid: '142a6df8-6649-4aab-8ef3-773daec61ecf',
                        OpaqueDate: '2026-09-04',
                        OpaqueDateTime: '2026-09-04T12:00:00',
                        OpaqueTimestamp: '2026-09-04T12:00:00Z',
                        OpaqueTime: '12:00:00',
                        OpaqueBinary: 'bW9ja2dlbg==',
                        OpaqueFlag: true,
                        OpaqueText: 'Opaque Text 1',
                        OpaqueInteger: 1,
                        OpaqueDecimal: 1.5
                    }
                ]
            },
            { urlPath: '/records', odataVersion: '4.0' },
            { seed: 31 },
            new Map(),
            sft,
            new AbortController().signal
        );

        expect(sft.generate).toHaveBeenCalledWith(
            expect.objectContaining({
                fields: [
                    expect.objectContaining({ name: 'OpaqueText', primitiveType: 'string' }),
                    expect.objectContaining({ name: 'OpaqueInteger', primitiveType: 'int' }),
                    expect.objectContaining({ name: 'OpaqueDecimal', primitiveType: 'decimal' })
                ]
            }),
            expect.any(AbortSignal)
        );
    });

    it('uses a governed organization bank for supplier names before SFT', async () => {
        const sft: SftGenerator = {
            fingerprint: 'supplier-name-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [{ CommonSupplierName: 'More Information About the Product We Are Testing for' }]
            }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Supplier': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    CommonSupplierName: { type: 'cds.String', length: 255 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/suppliers', odataVersion: '4.0' },
                targets: [{ name: 'Supplier', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        expect(result.resources.Supplier?.[0]?.CommonSupplierName).toMatch(
            /^(?:Northwind Trading|Alpine Supply|Blue River Industries|Summit Services)$/u
        );
        expect(sft.generate).not.toHaveBeenCalled();
    });

    it('uses governed SAP identifiers for chart-of-accounts and equipment fields before SFT', async () => {
        const sft: SftGenerator = {
            fingerprint: 'sap-identifier-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [{ ChartOfAccounts: '[{', Equipment: '{', TechnicalObject: '03-24', OpaqueText: 'Forecast' }]
            }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    ChartOfAccounts: { type: 'cds.String', length: 4 },
                                    Equipment: { type: 'cds.String', length: 18 },
                                    TechnicalObject: { type: 'cds.String', length: 40, '@Common.Label': 'Equipment' },
                                    OpaqueText: { type: 'cds.String', length: 80 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        expect(result.resources.Record?.[0]?.ChartOfAccounts).toMatch(/^(?:YCOA|INT|CAUS|IFRS)$/u);
        expect(result.resources.Record?.[0]?.Equipment).toMatch(/^EQ\d{10}$/u);
        expect(result.resources.Record?.[0]?.TechnicalObject).toMatch(/^EQ\d{10}$/u);
        expect(sft.generate).toHaveBeenCalledWith(
            expect.objectContaining({ fields: [expect.objectContaining({ name: 'OpaqueText' })] }),
            expect.any(AbortSignal)
        );
    });

    it('uses a governed short code for SAP control indicators before SFT', async () => {
        const sft: SftGenerator = {
            fingerprint: 'control-code-hostile-sft',
            generate: jest.fn(async () => ({ rows: [{ BillableControl: '[{' }] }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    BillableControl: { type: 'cds.String', length: 2 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        expect(result.resources.Record?.[0]?.BillableControl).toMatch(/^(?:01|02|03|04)$/u);
        expect(sft.generate).not.toHaveBeenCalled();
    });

    it('uses governed SAP plant and stock-batch identifiers before SFT', async () => {
        const sft: SftGenerator = {
            fingerprint: 'maintenance-identifier-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [{ Plant: ')} {', MaterialSerialNumberStockBatch: '[{' }]
            }))
        };
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
                <edmx:DataServices>
                    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
                        <EntityType Name="Stock">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="Plant" Type="Edm.String" Nullable="false" MaxLength="4" />
                            <Property Name="MaterialSerialNumberStockBatch" Type="Edm.String"
                                Nullable="false" MaxLength="10" />
                        </EntityType>
                        <Annotations Target="Demo.Stock/Plant">
                            <Annotation Term="Common.DocumentationRef"
                                String="urn:sap-com:documentation:key?=type=DE&amp;id=WERKS_D" />
                        </Annotations>
                        <Annotations Target="Demo.Stock/MaterialSerialNumberStockBatch">
                            <Annotation Term="Common.DocumentationRef"
                                String="urn:sap-com:documentation:key?=type=DE&amp;id=B_CHARGE" />
                        </Annotations>
                        <EntityContainer Name="Container">
                            <EntitySet Name="Stocks" EntityType="Demo.Stock" />
                        </EntityContainer>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`;

        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/stocks', odataVersion: '4.0' },
                targets: [{ name: 'Stocks', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        expect(result.resources.Stocks?.[0]?.Plant).toMatch(/^(?:1010|1110|1710|3010)$/u);
        expect(result.resources.Stocks?.[0]?.MaterialSerialNumberStockBatch).toMatch(/^\d{10}$/u);
        expect(sft.generate).not.toHaveBeenCalled();
    });

    it('rejects symbol-only SFT strings without counting them as accepted fills', async () => {
        const sft: SftGenerator = {
            fingerprint: 'symbol-only-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [{ OpaqueText: '[{' }, { OpaqueText: 'Quarterly liquidity forecast' }]
            }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    OpaqueText: { type: 'cds.String', length: 80 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 2, seed: 31 },
            { sft }
        );

        expect(result.resources.Record).toEqual([
            { ID: 1, OpaqueText: 'Opaque Text 1' },
            { ID: 2, OpaqueText: 'Quarterly liquidity forecast' }
        ]);
        expect(result.statistics.sft).toMatchObject({
            eligibleSlots: 2,
            acceptedSlots: 1,
            assignments: [
                expect.objectContaining({
                    resource: 'Record',
                    fields: [{ name: 'OpaqueText', eligibleSlots: 2, acceptedSlots: 1 }]
                })
            ]
        });
    });

    it('keeps numeric status values inside a compact governed domain', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Supplier': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    DECertifiedDiversityStatus: { type: 'cds.Decimal', scale: 2 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/suppliers', odataVersion: '4.0' },
                targets: [{ name: 'Supplier', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 2, seed: 31 }
        );

        expect(result.resources.Supplier?.map(({ DECertifiedDiversityStatus }) => DECertifiedDiversityStatus)).toEqual(
            expect.arrayContaining([expect.any(Number)])
        );
        expect(
            result.resources.Supplier?.every(
                ({ DECertifiedDiversityStatus }) =>
                    typeof DECertifiedDiversityStatus === 'number' &&
                    DECertifiedDiversityStatus >= 0 &&
                    DECertifiedDiversityStatus <= 3
            )
        ).toBe(true);
    });

    it('prefers unambiguous business metadata over a conflicting learned role', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Supplier': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    DECertifiedEthnicity: { type: 'cds.String', length: 50 },
                                    DECity: { type: 'cds.String', length: 50 },
                                    DECountry: { type: 'cds.String', length: 2 },
                                    DECountryDescription: { type: 'cds.String', length: 40 },
                                    DERegionDescription: { type: 'cds.String', length: 40 },
                                    BillingPlanTimeZone: { type: 'cds.String', length: 40 },
                                    FoundingYear: { type: 'cds.String', length: 4 },
                                    CompanyCode_Text: {
                                        type: 'cds.String',
                                        length: 40,
                                        '@Common.Label': 'Company Name'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/suppliers', odataVersion: '4.0' },
                targets: [{ name: 'Supplier', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'conflicting-learned-role-v1',
                    classify: async () => ({
                        role: 'unit_of_measure',
                        confidence: 0.99,
                        routeThreshold: 0.5,
                        source: 'classifier'
                    })
                }
            }
        );

        const row = result.resources.Supplier?.[0];
        expect(row?.DECertifiedEthnicity).toMatch(
            /^(?:Asian|Black or African American|Hispanic or Latino|Native American|Not Specified)$/u
        );
        expect(row?.DECity).toMatch(/^(?:Berlin|Dublin|Milan|Prague)$/u);
        expect(row?.DECountry).toMatch(/^(?:DE|IE|IT|CZ)$/u);
        expect(row?.DECountryDescription).toMatch(/^(?:Germany|Ireland|Italy|Czechia)$/u);
        expect(row?.DERegionDescription).toMatch(/^(?:Berlin|Leinster|Lombardy|Prague)$/u);
        expect(row?.BillingPlanTimeZone).toMatch(/^(?:Europe\/Dublin|Europe\/Berlin|America\/New_York|Asia\/Tokyo)$/u);
        expect(row?.FoundingYear).toMatch(/^20\d{2}$/u);
        expect(row?.CompanyCode_Text).toMatch(
            /^(?:Northwind Trading|Alpine Supply|Blue River Industries|Summit Services)$/u
        );
    });

    it('does not treat descriptions and addresses containing business-object words as identifiers', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.ServiceItem': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    ServiceDocumentItemDescription: { type: 'cds.String', length: 80 },
                                    SalesOrderDescription: { type: 'cds.String', length: 80 },
                                    CustomerAddress: { type: 'cds.String', length: 80 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/service-items', odataVersion: '4.0' },
                targets: [{ name: 'ServiceItem', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'description-role-v1',
                    classify: async () => ({
                        role: 'description',
                        confidence: 0.99,
                        routeThreshold: 0.5,
                        source: 'classifier'
                    })
                }
            }
        );

        const row = result.resources.ServiceItem?.[0];
        expect(row?.ServiceDocumentItemDescription).toMatch(/\D/u);
        expect(row?.SalesOrderDescription).toMatch(/\D/u);
        expect(row?.CustomerAddress).toMatch(/^\d+ Market Street$/u);
    });

    it('defers contradictory lexical evidence to a confident learned classification', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Contact': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    EmailCode: {
                                        type: 'cds.String',
                                        length: 40,
                                        '@Common.Label': 'Phone Number'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contact', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            {
                classifier: {
                    fingerprint: 'city-role-v1',
                    classify: async () => ({
                        role: 'city',
                        confidence: 0.99,
                        routeThreshold: 0.5,
                        source: 'classifier'
                    })
                }
            }
        );

        expect(result.resources.Contact?.[0]?.EmailCode).toMatch(/^(?:Berlin|Dublin|Milan|Prague)$/u);
    });

    it('intersects governed numeric ranges with decimal facets and integer subtypes', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Measurement': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    NarrowPrice: {
                                        type: 'cds.Decimal',
                                        precision: 1,
                                        scale: 0,
                                        '@Common.Label': 'Price'
                                    },
                                    BytePrice: { type: 'cds.UInt8', '@Common.Label': 'Price' },
                                    ByteTemperature: { type: 'cds.UInt8', '@Common.Label': 'Temperature' },
                                    ByteExponent: { type: 'cds.UInt8', '@Common.Label': 'Exponent' },
                                    ByteCount: { type: 'cds.UInt8', '@Common.Label': 'Item Count' },
                                    ByteOpaque: { type: 'cds.UInt8' },
                                    Int16Opaque: { type: 'cds.Int16' },
                                    Int32Opaque: { type: 'cds.Int32' },
                                    Int64Opaque: { type: 'cds.Int64' }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/measurements', odataVersion: '4.0' },
                targets: [{ name: 'Measurement', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 20, seed: 31 }
        );

        result.resources.Measurement?.forEach((row) => {
            expect(Number(row.NarrowPrice)).toBeGreaterThanOrEqual(5);
            expect(Number(row.NarrowPrice)).toBeLessThanOrEqual(9);
            expect(Number(row.BytePrice)).toBeGreaterThanOrEqual(5);
            expect(Number(row.BytePrice)).toBeLessThanOrEqual(255);
            expect(Number(row.ByteTemperature)).toBeGreaterThanOrEqual(0);
            expect(Number(row.ByteTemperature)).toBeLessThanOrEqual(50);
            expect(Number(row.ByteExponent)).toBeGreaterThanOrEqual(0);
            expect(Number(row.ByteExponent)).toBeLessThanOrEqual(6);
            expect(Number(row.ByteCount)).toBeGreaterThanOrEqual(1);
            expect(Number(row.ByteCount)).toBeLessThanOrEqual(255);
            expect(Number(row.ByteOpaque)).toBeGreaterThanOrEqual(0);
            expect(Number(row.ByteOpaque)).toBeLessThanOrEqual(255);
            expect(typeof row.Int16Opaque).toBe('number');
            expect(Number(row.Int16Opaque)).toBeGreaterThanOrEqual(-32_768);
            expect(Number(row.Int16Opaque)).toBeLessThanOrEqual(32_767);
            expect(typeof row.Int32Opaque).toBe('number');
            expect(typeof row.Int64Opaque).toBe('number');
        });
    });

    it('uses compact business ranges for metadata-identified numeric fields', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Measurement': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    SalesOrganization_fc: {
                                        type: 'cds.Integer',
                                        '@Common.Label': 'Dyn. Field Control'
                                    },
                                    UnitOfMeasureDspNmbrOfDcmls: {
                                        type: 'cds.Integer',
                                        '@Common.Label': 'Decimal Places'
                                    },
                                    SIUnitCnvrsnRateExponent: {
                                        type: 'cds.Integer',
                                        '@Common.Label': 'Exponent'
                                    },
                                    NumberOfItems: { type: 'cds.Integer', '@Common.Label': 'Number of Items' },
                                    UnitOfMeasureTemperature: {
                                        type: 'cds.Decimal',
                                        precision: 9,
                                        scale: 2,
                                        '@Common.Label': 'Temperature'
                                    },
                                    UnitOfMeasurePressure: {
                                        type: 'cds.Decimal',
                                        precision: 9,
                                        scale: 2,
                                        '@Common.Label': 'Pressure Value'
                                    },
                                    PublicationPrice: {
                                        type: 'cds.Decimal',
                                        precision: 9,
                                        scale: 2,
                                        '@Common.Label': 'Price'
                                    },
                                    InterestRateInPercent: {
                                        type: 'cds.Decimal',
                                        precision: 5,
                                        scale: 2,
                                        '@Common.Label': 'Credit Interest Rate'
                                    },
                                    IntegerPrice: { type: 'cds.Integer', '@Common.Label': 'Price' },
                                    IntegerInterestRate: {
                                        type: 'cds.Integer',
                                        '@Common.Label': 'Credit Interest Rate'
                                    },
                                    IntegerTemperature: { type: 'cds.Integer', '@Common.Label': 'Temperature' },
                                    IntegerPressure: { type: 'cds.Integer', '@Common.Label': 'Pressure Value' },
                                    IntegerConversionOffset: {
                                        type: 'cds.Integer',
                                        '@Common.Label': 'Additive Constant'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/measurements', odataVersion: '4.0' },
                targets: [{ name: 'Measurement', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 4, seed: 31 }
        );

        result.resources.Measurement?.forEach((row) => {
            expect([0, 1, 3, 7]).toContain(row.SalesOrganization_fc);
            expect(Number(row.UnitOfMeasureDspNmbrOfDcmls)).toBeGreaterThanOrEqual(0);
            expect(Number(row.UnitOfMeasureDspNmbrOfDcmls)).toBeLessThanOrEqual(6);
            expect(Number(row.SIUnitCnvrsnRateExponent)).toBeGreaterThanOrEqual(-6);
            expect(Number(row.SIUnitCnvrsnRateExponent)).toBeLessThanOrEqual(6);
            expect(Number(row.NumberOfItems)).toBeGreaterThanOrEqual(1);
            expect(Number(row.NumberOfItems)).toBeLessThanOrEqual(500);
            expect(Number(row.UnitOfMeasureTemperature)).toBeGreaterThanOrEqual(-30);
            expect(Number(row.UnitOfMeasureTemperature)).toBeLessThanOrEqual(50);
            expect(Number(row.UnitOfMeasurePressure)).toBeGreaterThanOrEqual(0.5);
            expect(Number(row.UnitOfMeasurePressure)).toBeLessThanOrEqual(20);
            expect(Number(row.PublicationPrice)).toBeGreaterThanOrEqual(5);
            expect(Number(row.PublicationPrice)).toBeLessThanOrEqual(500);
            expect(Number(row.InterestRateInPercent)).toBeGreaterThanOrEqual(0);
            expect(Number(row.InterestRateInPercent)).toBeLessThanOrEqual(20);
            expect(Number(row.IntegerPrice)).toBeGreaterThanOrEqual(5);
            expect(Number(row.IntegerPrice)).toBeLessThanOrEqual(500);
            expect(Number(row.IntegerInterestRate)).toBeGreaterThanOrEqual(0);
            expect(Number(row.IntegerInterestRate)).toBeLessThanOrEqual(20);
            expect(Number(row.IntegerTemperature)).toBeGreaterThanOrEqual(-30);
            expect(Number(row.IntegerTemperature)).toBeLessThanOrEqual(50);
            expect(Number(row.IntegerPressure)).toBeGreaterThanOrEqual(0.5);
            expect(Number(row.IntegerPressure)).toBeLessThanOrEqual(20);
            expect(Number(row.IntegerConversionOffset)).toBeGreaterThanOrEqual(-10);
            expect(Number(row.IntegerConversionOffset)).toBeLessThanOrEqual(10);
        });
    });

    it('rejects structured-output debris returned as SFT text', async () => {
        const sft: SftGenerator = {
            fingerprint: 'structured-debris-hostile-sft',
            generate: jest.fn(async () => ({ rows: [{ OpaqueText: '[] [08/12/' }, { OpaqueText: '[[0, 31275' }] }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Record': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    OpaqueText: { type: 'cds.String', length: 80 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Record', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 2, seed: 31 },
            { sft }
        );

        expect(result.resources.Record).toEqual([
            { ID: 1, OpaqueText: 'Opaque Text 1' },
            { ID: 2, OpaqueText: 'Opaque Text 2' }
        ]);
        expect(result.statistics.sft.acceptedSlots).toBe(0);
    });

    it('keeps generated phone prefixes consistent with the row country', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Contact': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    City: { type: 'cds.String', length: 40 },
                                    SoldToPartyCountry: { type: 'cds.String', length: 2, enum: { DE: {} } },
                                    PhoneNumber: { type: 'cds.String', length: 30 }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/contacts', odataVersion: '4.0' },
                targets: [{ name: 'Contact', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 4, seed: 31 }
        );

        const prefixes: Readonly<Record<string, string>> = { DE: '+49 ', IE: '+353 ', IT: '+39 ', CZ: '+420 ' };
        result.resources.Contact?.forEach((row) => {
            expect(String(row.PhoneNumber).startsWith(prefixes[String(row.SoldToPartyCountry)])).toBe(true);
        });
    });

    it('keeps common business identifiers deterministic and out of residual SFT generation', async () => {
        const sft: SftGenerator = {
            fingerprint: 'identifier-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [
                    {
                        BankAccount: 'Mr. 123456',
                        GLAccount: 'GLAccount ',
                        SalesOrder: '[] [08/12/',
                        ServiceDocumentItem: 'SEM028',
                        Customer: 'PERSON_426',
                        ServiceDocumentItemCharUUID: 'C819',
                        MaterialBatch: '[[0, 31275'
                    }
                ]
            }))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Document': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    BankAccount: {
                                        type: 'cds.String',
                                        length: 18,
                                        '@Common.Label': 'Account Number'
                                    },
                                    GLAccount: { type: 'cds.String', length: 10, '@Common.Label': 'G/L Account' },
                                    SalesOrder: { type: 'cds.String', length: 10 },
                                    ServiceDocumentItem: {
                                        type: 'cds.String',
                                        length: 6,
                                        '@Common.Label': 'Item Number in Doc.'
                                    },
                                    Customer: { type: 'cds.String', length: 10 },
                                    ServiceDocumentItemCharUUID: {
                                        type: 'cds.String',
                                        length: 32,
                                        '@Common.Label': 'Object GUID'
                                    },
                                    MaterialBatch: { type: 'cds.String', length: 10, '@Common.Label': 'Batch' }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/documents', odataVersion: '4.0' },
                targets: [{ name: 'Document', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1, seed: 31 },
            { sft }
        );

        const row = result.resources.Document?.[0];
        expect(row?.BankAccount).toMatch(/^\d{18}$/u);
        expect(row?.GLAccount).toMatch(/^\d{10}$/u);
        expect(row?.SalesOrder).toMatch(/^\d{10}$/u);
        expect(row?.ServiceDocumentItem).toMatch(/^\d{6}$/u);
        expect(row?.Customer).toMatch(/^\d{10}$/u);
        expect(row?.ServiceDocumentItemCharUUID).toMatch(/^[A-F0-9]{32}$/u);
        expect(row?.MaterialBatch).toMatch(/^\d{10}$/u);
        expect(sft.generate).not.toHaveBeenCalled();
    });

    it('uses meaningful unit metadata and compact conversion values', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Unit': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    UnitOfMeasureDimension: {
                                        type: 'cds.String',
                                        length: 8,
                                        '@Common.Label': 'Dimension'
                                    },
                                    UnitOfMeasureTemperatureUnit: {
                                        type: 'cds.String',
                                        length: 3,
                                        '@Common.Label': 'Temperature Unit',
                                        '@sap:semantics': 'unit-of-measure'
                                    },
                                    UnitOfMeasurePressureUnit: {
                                        type: 'cds.String',
                                        length: 3,
                                        '@Common.Label': 'Unit of Pressure',
                                        '@sap:semantics': 'unit-of-measure'
                                    },
                                    TemperatureUnit: {
                                        type: 'cds.String',
                                        length: 3,
                                        '@Common.Label': 'Temperature',
                                        '@sap:semantics': 'unit-of-measure'
                                    },
                                    PressureUnit: {
                                        type: 'cds.String',
                                        length: 3,
                                        '@Common.Label': 'Pressure',
                                        '@sap:semantics': 'unit-of-measure'
                                    },
                                    SIUnitCnvrsnAdditiveValue: {
                                        type: 'cds.Decimal',
                                        precision: 9,
                                        scale: 4,
                                        '@Common.Label': 'Additive Constant'
                                    },
                                    SIUnitCnvrsnRateNumerator: {
                                        type: 'cds.Decimal',
                                        precision: 5,
                                        scale: 0,
                                        '@Common.Label': 'Conversion Numerator'
                                    },
                                    SIUnitCnvrsnRateDenominator: {
                                        type: 'cds.Decimal',
                                        precision: 5,
                                        scale: 0,
                                        '@Common.Label': 'Conversion Denominator'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/units', odataVersion: '4.0' },
                targets: [{ name: 'Unit', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 4, seed: 31 }
        );

        result.resources.Unit?.forEach((row) => {
            expect(['TIME', 'LENGTH', 'MASS', 'TEMP', 'PRESSURE']).toContain(row.UnitOfMeasureDimension);
            expect(['C', 'F', 'K']).toContain(row.UnitOfMeasureTemperatureUnit);
            expect(['BAR', 'PSI', 'PA', 'KPA']).toContain(row.UnitOfMeasurePressureUnit);
            expect(['C', 'F', 'K']).toContain(row.TemperatureUnit);
            expect(['BAR', 'PSI', 'PA', 'KPA']).toContain(row.PressureUnit);
            expect(Number(row.SIUnitCnvrsnAdditiveValue)).toBeGreaterThanOrEqual(-10);
            expect(Number(row.SIUnitCnvrsnAdditiveValue)).toBeLessThanOrEqual(10);
            expect(Number(row.SIUnitCnvrsnRateNumerator)).toBeGreaterThanOrEqual(1);
            expect(Number(row.SIUnitCnvrsnRateNumerator)).toBeLessThanOrEqual(100);
            expect(Number(row.SIUnitCnvrsnRateDenominator)).toBeGreaterThanOrEqual(1);
            expect(Number(row.SIUnitCnvrsnRateDenominator)).toBeLessThanOrEqual(100);
        });
    });

    it('uses compact status codes and business-facing companion descriptions', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.ServiceItem': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    ServiceDocumentItemStatus: {
                                        type: 'cds.String',
                                        length: 4,
                                        '@Common.Label': 'Life Cycle Status'
                                    },
                                    ServiceDocumentItemHasError: {
                                        type: 'cds.String',
                                        length: 1,
                                        '@Common.Label': 'Error Status'
                                    },
                                    BillingPriceSourceName: {
                                        type: 'cds.String',
                                        length: 20,
                                        '@Common.Label': 'Price Source'
                                    },
                                    HouseBankAccount_Text: {
                                        type: 'cds.String',
                                        length: 40,
                                        '@Common.Label': 'Description'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/service-items', odataVersion: '4.0' },
                targets: [{ name: 'ServiceItem', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 4, seed: 31 }
        );

        result.resources.ServiceItem?.forEach((row) => {
            expect(['O', 'I', 'A', 'C']).toContain(row.ServiceDocumentItemStatus);
            expect(['', 'X']).toContain(row.ServiceDocumentItemHasError);
            expect(['Contract', 'Price List', 'Service Agreement', 'Manual']).toContain(row.BillingPriceSourceName);
            expect(['Operating Account', 'Payroll Account', 'Clearing Account', 'Collections Account']).toContain(
                row.HouseBankAccount_Text
            );
        });
    });

    it('uses non-placeholder seeded values for generated string and GUID keys', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Proposal': {
                                kind: 'entity',
                                elements: {
                                    SalesItemProposal: { type: 'cds.String', length: 10, key: true, notNull: true },
                                    ArtistUUID: { type: 'cds.UUID', key: true, notNull: true }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/proposals', odataVersion: '4.0' },
                targets: [{ name: 'Proposal', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 2, seed: 31 }
        );

        expect(result.resources.Proposal).toHaveLength(2);
        expect(new Set(result.resources.Proposal?.map((row) => row.SalesItemProposal)).size).toBe(2);
        expect(new Set(result.resources.Proposal?.map((row) => row.ArtistUUID)).size).toBe(2);
        result.resources.Proposal?.forEach((row) => {
            expect(row.SalesItemProposal).not.toMatch(/^0{8,}/u);
            expect(row.ArtistUUID).not.toMatch(/-0{12}$/u);
        });
    });
});
