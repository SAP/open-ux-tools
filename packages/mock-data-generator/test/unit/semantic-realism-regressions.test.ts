import { generateServiceForTesting as generate } from '../../src/index.js';
import type { SftGenerator } from '../../src/types.js';
import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';

// These are explicitly authored fictional test domains, not default generator behavior.
const scenarioDomains: Readonly<Record<string, readonly (string | number | boolean)[]>> = {
    ChartOfAccounts: ['YCOA', 'INT', 'CAUS', 'IFRS'],
    BillableControl: ['01', '02', '03', '04'],
    Plant: ['1010', '1110', '1710', '3010'],
    DECertifiedDiversityStatus: [0, 1, 2, 3],
    GLAccount: ['0000113100', '0000400000'],
    HouseBank: ['DE01', 'US01', 'GB01', 'IE01'],
    ServiceDocumentItemStatus: ['O', 'I', 'A', 'C'],
    BankAccountType: ['Checking', 'Savings', 'Money Market', 'Current'],
    BankStatementFormat: ['MT'],
    PaymentTransactionTypeGroup: ['INBOUND', 'OUTBOUND', 'TRANSFER'],
    CompanyCode: ['1000', '1010', '1710', '3000'],
    SalesOrganization: ['1000', '1010', '1710', '3000'],
    DistributionChannel: ['10', '20', '30'],
    Division: ['00', '01', '10', '20'],
    OrganizationDivision: ['00', '01', '10', '20'],
    StorageLocation: ['0001', '0002', 'A001', 'B001'],
    PaymentTerms: ['0001', '0002', 'Z030', 'Z060'],
    SalesItemProposalType: ['OR', 'QT', 'SIP'],
    ServiceDocItemCategory: ['SRVP', 'SVCP', 'SVCT'],
    ServiceDocumentType: ['SRVO', 'SVC1', 'SVO1'],
    ObjectType: ['BUS2000116', 'BUS2000120'],
    ServiceDocumentItemObjectType: ['BUS2000116', 'BUS2000120'],
    ApprovalStatus: ['Approved', 'Pending', 'Rejected', 'Under Review'],
    // Track-length fields carry no general naming convention, so their domains are authored.
    TitleLength: [2.5, 3.75, 12],
    TitleLengthUnit: ['MIN', 'S']
};

function generateService(...[request, options, runtime]: Parameters<typeof generate>): ReturnType<typeof generate> {
    const graph =
        request.metadata.format === 'csn' ? parseCsn(request.metadata.content) : parseEdmx(request.metadata.content);
    const domains = Object.fromEntries(
        graph.entities.flatMap((entity) =>
            entity.properties.flatMap((property) =>
                scenarioDomains[property.name]
                    ? [[`${entity.entitySetName}.${property.name}`, scenarioDomains[property.name]]]
                    : []
            )
        )
    );
    const rules = [
        'temporal',
        'status',
        'units',
        'monetary',
        'balance',
        'conversion',
        'lifecycle',
        'processing-status',
        'country-phone'
    ] as const;
    return generate(
        request,
        {
            ...options,
            syntheticScenario: {
                id: 'authored-regression-scenario',
                version: '1',
                domains,
                coherence: Object.fromEntries(graph.entities.map(({ entitySetName }) => [entitySetName, rules]))
            }
        },
        runtime
    );
}
import { applySftGeneration } from '../../src/generation/sft.js';
import type { SchemaGraph } from '../../src/schema/graph.js';
import { packagedBanks } from '../../src/semantics/bank-store.js';

// Values must come from the governed banks; the patterns follow the banks as they grow.
const alternation = (values: ReadonlyArray<string>): RegExp => new RegExp(`^(?:${values.join('|')})$`, 'u');
const ORGANIZATION_PATTERN = alternation(packagedBanks().defaultSampleDataset.organizations);
const CITY_PATTERN = alternation(packagedBanks().locations.map(({ city }) => city));
const MOBILE_PATTERN = new RegExp(
    `^(?:${packagedBanks()
        .locations.map(
            ({ mobilePrefix, mobileSubscriberDigits }) =>
                `${mobilePrefix.replace('+', '\\+')} \\d{${mobileSubscriberDigits}}`
        )
        .join('|')})$`,
    'u'
);

describe('semantic realism regressions', () => {
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

    it('routes only bounded language and numeric values to the SFT request', async () => {
        const sft: SftGenerator = {
            fingerprint: 'structured-primitive-hostile-sft',
            generate: jest.fn(async () => ({
                rows: [
                    {
                        OpaqueText: 'Quarterly demand forecast',
                        OpaqueUnbounded: 'Preventive maintenance planning',
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
                            maxLength: 255,
                            annotations: []
                        },
                        {
                            name: 'OpaqueUnbounded',
                            primitiveType: 'string',
                            nullable: true,
                            isKey: false,
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

        await applySftGeneration({
            graph,
            resources: {
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
                        OpaqueUnbounded: 'Opaque Unbounded 1',
                        OpaqueInteger: 1,
                        OpaqueDecimal: 1.5
                    }
                ]
            },
            service: { urlPath: '/records', odataVersion: '4.0' },
            options: { seed: 31 },
            classifications: new Map(),
            sft,
            signal: new AbortController().signal
        });

        expect(sft.generate).toHaveBeenCalledWith(
            expect.objectContaining({
                fields: [
                    expect.objectContaining({ name: 'OpaqueText', primitiveType: 'string', maxLength: 80 }),
                    expect.objectContaining({ name: 'OpaqueUnbounded', primitiveType: 'string', maxLength: 80 }),
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

        expect(result.resources.Supplier?.[0]?.CommonSupplierName).toMatch(ORGANIZATION_PATTERN);
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
            { ID: 1, OpaqueText: 'OpaqueText_0' },
            { ID: 2, OpaqueText: 'Quarterly liquidity forecast' }
        ]);
        expect(result.statistics.sft).toMatchObject({
            eligibleSlots: 2,
            acceptedSlots: 1,
            assignments: [
                expect.objectContaining({
                    resource: 'Record',
                    outcome: 'partial',
                    fields: [{ name: 'OpaqueText', eligibleSlots: 2, acceptedSlots: 1, invalidSlots: 1 }]
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
            { ID: 1, OpaqueText: 'OpaqueText_0' },
            { ID: 2, OpaqueText: 'OpaqueText_1' }
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

    it('uses currency minor units and realistic price and duration domains', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Balance': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    Currency: { type: 'cds.String', length: 3, enum: { JPY: {} } },
                                    OpeningBalanceAmount: { type: 'cds.Decimal', precision: 12, scale: 3 },
                                    TotalDebitAmount: { type: 'cds.Decimal', precision: 12, scale: 3 },
                                    TotalCreditAmount: { type: 'cds.Decimal', precision: 12, scale: 3 },
                                    ClosingBalanceAmount: { type: 'cds.Decimal', precision: 12, scale: 3 },
                                    PublicationPrice: {
                                        type: 'cds.Decimal',
                                        precision: 13,
                                        '@Common.Label': 'Price',
                                        '@Measures.ISOCurrency': 'Currency'
                                    },
                                    TitleLength: {
                                        type: 'cds.Decimal',
                                        precision: 13,
                                        scale: 2,
                                        '@Common.Label': 'Title Length',
                                        '@Measures.Unit': 'TitleLengthUnit'
                                    },
                                    TitleLengthUnit: {
                                        type: 'cds.String',
                                        length: 3,
                                        '@Common.Label': 'Title Length Unit'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/balances', odataVersion: '4.0' },
                targets: [{ name: 'Balance', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 2, seed: 31 }
        );

        result.resources.Balance?.forEach((row) => {
            expect(Number.isInteger(row.OpeningBalanceAmount)).toBe(true);
            expect(Number.isInteger(row.TotalDebitAmount)).toBe(true);
            expect(Number.isInteger(row.TotalCreditAmount)).toBe(true);
            expect(Number.isInteger(row.ClosingBalanceAmount)).toBe(true);
            expect(row.ClosingBalanceAmount).toBe(
                Number(row.OpeningBalanceAmount) + Number(row.TotalCreditAmount) - Number(row.TotalDebitAmount)
            );
            expect(Number(row.PublicationPrice)).toBeGreaterThanOrEqual(5);
            expect(Number(row.PublicationPrice)).toBeLessThanOrEqual(500);
            expect(Number(row.TitleLength)).toBeGreaterThanOrEqual(1);
            expect(Number(row.TitleLength)).toBeLessThanOrEqual(15);
            expect(['MIN', 'S']).toContain(row.TitleLengthUnit);
        });
    });

    it('resolves a SAP WAERS annotation target and applies ISO 4217 minor units', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Invoice': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    WAERS: {
                                        type: 'cds.String',
                                        length: 3,
                                        enum: { JPY: {}, KWD: {}, CLF: {} }
                                    },
                                    GrossValue: {
                                        type: 'cds.Decimal',
                                        precision: 12,
                                        scale: 4,
                                        '@Measures.ISOCurrency': 'WAERS'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/invoices', odataVersion: '4.0' },
                targets: [{ name: 'Invoice', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 3, seed: 31 }
        );
        const allowedDigits = new Map([
            ['JPY', 0],
            ['KWD', 3],
            ['CLF', 4]
        ]);

        result.resources.Invoice.forEach((row) => {
            const digits = allowedDigits.get(String(row.WAERS));
            const scaled = Number(row.GrossValue) * 10 ** Number(digits);
            expect(Math.abs(scaled - Math.round(scaled))).toBeLessThan(1e-8);
        });
    });

    it('keeps a physical LengthUnit in a physical measurement domain', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.Dimension': {
                                kind: 'entity',
                                elements: {
                                    ID: { type: 'cds.Integer', key: true, notNull: true },
                                    Length: {
                                        type: 'cds.Decimal',
                                        precision: 8,
                                        scale: 2,
                                        '@Measures.Unit': 'LengthUnit'
                                    },
                                    LengthUnit: { type: 'cds.String', length: 3, '@Common.Label': 'Length Unit' }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/dimensions', odataVersion: '4.0' },
                targets: [{ name: 'Dimension', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 4, seed: 31 }
        );

        result.resources.Dimension.forEach((row) => {
            expect(['M', 'CM', 'MM', 'KM']).toContain(row.LengthUnit);
            expect(['MIN', 'S']).not.toContain(row.LengthUnit);
        });
    });

    it('keeps SAP sales-area keys and divisions in recognizable configured domains', async () => {
        const result = await generateService(
            {
                metadata: {
                    format: 'csn',
                    content: JSON.stringify({
                        definitions: {
                            'Demo.SalesArea': {
                                kind: 'entity',
                                elements: {
                                    Customer: { type: 'cds.String', length: 10, key: true, notNull: true },
                                    SalesOrganization: { type: 'cds.String', length: 4, key: true, notNull: true },
                                    DistributionChannel: { type: 'cds.String', length: 2, key: true, notNull: true },
                                    Division: { type: 'cds.String', length: 2, key: true, notNull: true },
                                    OrganizationDivision: {
                                        type: 'cds.String',
                                        length: 2,
                                        '@Common.Label': 'Division'
                                    }
                                }
                            },
                            'Demo.SalesProposalType': {
                                kind: 'entity',
                                elements: {
                                    SalesItemProposalType: {
                                        type: 'cds.String',
                                        length: 4,
                                        key: true,
                                        notNull: true,
                                        '@Common.Label': 'Sales Document Type'
                                    }
                                }
                            }
                        }
                    })
                },
                service: { urlPath: '/sales-areas', odataVersion: '4.0' },
                targets: [
                    { name: 'SalesArea', kind: 'entity-set' },
                    { name: 'SalesProposalType', kind: 'entity-set' }
                ],
                existingData: {}
            },
            { rowsPerEntity: 2, seed: 113 }
        );

        result.resources.SalesArea?.forEach((row) => {
            expect(['1000', '1010', '1710', '3000']).toContain(row.SalesOrganization);
            expect(['10', '20', '30']).toContain(row.DistributionChannel);
            expect(['00', '01', '10', '20']).toContain(row.Division);
            expect(['00', '01', '10', '20']).toContain(row.OrganizationDivision);
        });
        result.resources.SalesProposalType?.forEach((row) => {
            expect(['OR', 'QT', 'SIP']).toContain(row.SalesItemProposalType);
        });
    });
});
