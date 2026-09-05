import { generateService, type SftGenerator } from '../../src/index.js';

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
});
