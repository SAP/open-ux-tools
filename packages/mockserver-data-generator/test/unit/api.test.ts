import {
    createGenerationFingerprint,
    generateService,
    validateGeneratedResult,
    type MockDataGeneratorRuntime,
    type MockDataServiceRequest,
    type SemanticClassifier,
    type SftGenerator
} from '../../src/index.js';

describe('mockserver data generator public API', () => {
    it('rejects cached snapshots that no longer conform to the requested service schema', () => {
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Records" EntityType="Demo.Record" />
                                </EntityContainer>
                                <EntityType Name="Record">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="Description" Type="Edm.String" Nullable="false" MaxLength="40" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/records', odataVersion: '4.0' },
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {}
        };
        const base = {
            resources: { Records: [{ ID: 1, Description: 'First record' }] },
            diagnostics: [],
            capabilities: { mode: 'deterministic', classifier: 'unavailable', sft: 'unavailable' },
            fingerprints: { request: 'request-fingerprint' }
        } as const;

        expect(() => validateGeneratedResult(request, base)).not.toThrow();
        expect(() =>
            validateGeneratedResult(request, {
                ...base,
                resources: { Records: [{ ID: 1, Description: 'First record', Rogue: 'stale field' }] }
            })
        ).toThrow(/unknown property/i);
        expect(() =>
            validateGeneratedResult(request, {
                ...base,
                resources: {
                    Records: [
                        { ID: 1, Description: 'First record' },
                        { ID: 1, Description: 'Duplicate key' }
                    ]
                }
            })
        ).toThrow(/duplicate key/i);
    });

    it('fingerprints material inputs and learned components but not abort-signal identity', () => {
        const request: MockDataServiceRequest = {
            metadata: { format: 'edmx', content: '<metadata />' },
            service: { urlPath: '/fingerprint', odataVersion: '4.0' },
            targets: [{ name: 'Rows', kind: 'entity-set' }],
            existingData: {},
            signal: new AbortController().signal
        };
        const first = createGenerationFingerprint(
            request,
            { seed: 7 },
            {
                classifier: 'classifier-a',
                sft: 'sft-a'
            }
        );
        const second = createGenerationFingerprint(
            { ...request, signal: new AbortController().signal },
            { seed: 7 },
            { classifier: 'classifier-a', sft: 'sft-a' }
        );
        const changed = createGenerationFingerprint(
            request,
            { seed: 7 },
            {
                classifier: 'classifier-a',
                sft: 'sft-b'
            }
        );

        expect(first).toBe(second);
        expect(first).toMatch(/^[a-f0-9]{64}$/);
        expect(changed).not.toBe(first);
    });

    it('exposes deterministic generation with explicit classifier and SFT runtime contracts', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'classifier-test-v1',
            classify: jest.fn()
        };
        const sft: SftGenerator = {
            fingerprint: 'sft-test-q4',
            generate: jest.fn()
        };
        const runtime: MockDataGeneratorRuntime = { classifier, sft };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: '<edmx:Edmx Version="4.0" />'
            },
            service: {
                urlPath: '/sap/opu/odata/example',
                odataVersion: '4.0'
            },
            targets: [],
            existingData: {}
        };

        const result = await generateService(request, { seed: 42, rowsPerEntity: 5 }, runtime);

        expect(result.resources).toEqual({});
        expect(result.diagnostics).toEqual([]);
        expect(result.capabilities).toEqual({
            mode: 'hybrid',
            classifier: 'ready',
            sft: 'ready'
        });
        expect(result.fingerprints.request).toMatch(/^[a-f0-9]{64}$/);
        expect(result.fingerprints.classifier).toBe('classifier-test-v1');
        expect(result.fingerprints.sft).toBe('sft-test-q4');
        expect(classifier.classify).not.toHaveBeenCalled();
        expect(sft.generate).not.toHaveBeenCalled();
    });

    it('generates deterministic, type-correct rows from EDMX without a learned runtime', async () => {
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Products" EntityType="Demo.Product" />
                                </EntityContainer>
                                <EntityType Name="Product">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="Name" Type="Edm.String" Nullable="false" MaxLength="40">
                                        <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Product Name" />
                                    </Property>
                                    <Property Name="Price" Type="Edm.Decimal" Precision="10" Scale="2" />
                                    <Property Name="CurrencyCode" Type="Edm.String" MaxLength="3" />
                                    <Property Name="Available" Type="Edm.Boolean" Nullable="false" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: {
                urlPath: '/sap/opu/odata/products',
                odataVersion: '4.0'
            },
            targets: [{ name: 'Products', kind: 'entity-set' }],
            existingData: {
                Products: {
                    contributor: { present: false },
                    initialRows: { source: 'none', present: false }
                }
            }
        };

        const first = await generateService(request, { seed: 7, rowsPerEntity: 3 });
        const second = await generateService(request, { seed: 7, rowsPerEntity: 3 });

        expect(first).toEqual(second);
        expect(first.capabilities).toEqual({
            mode: 'deterministic',
            classifier: 'unavailable',
            sft: 'unavailable'
        });
        expect(first.resources.Products).toHaveLength(3);
        expect(first.resources.Products.map((row) => row.ID)).toEqual([1, 2, 3]);
        expect(first.resources.Products).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    Name: expect.stringMatching(/^Product /),
                    Price: expect.any(Number),
                    CurrencyCode: expect.stringMatching(/^[A-Z]{3}$/),
                    Available: expect.any(Boolean)
                })
            ])
        );
    });

    it('uses the trained-classifier contract once per property to drive semantic values', async () => {
        const roleForProperty = (propertyName: string): 'person_first_name' | 'person_last_name' | 'unknown' => {
            if (propertyName === 'OpaqueGiven') {
                return 'person_first_name';
            }
            if (propertyName === 'OpaqueFamily') {
                return 'person_last_name';
            }
            return 'unknown';
        };
        const classifier: SemanticClassifier = {
            fingerprint: 'classifier-candidate-sha256',
            classify: jest.fn(async (input) => ({
                role: roleForProperty(input.propertyName),
                confidence: input.propertyName === 'ID' ? 0.1 : 0.98,
                source: 'classifier'
            }))
        };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Contacts" EntityType="Demo.Contact" />
                                </EntityContainer>
                                <EntityType Name="Contact">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpaqueGiven" Type="Edm.String" Nullable="false" MaxLength="40" />
                                    <Property Name="OpaqueFamily" Type="Edm.String" Nullable="false" MaxLength="40" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/contacts', odataVersion: '4.0' },
            targets: [{ name: 'Contacts', kind: 'entity-set' }],
            existingData: {}
        };

        const result = await generateService(request, { seed: 19, rowsPerEntity: 2 }, { classifier });

        expect(classifier.classify).toHaveBeenCalledTimes(3);
        expect(result.resources.Contacts).toEqual([
            expect.objectContaining({ ID: 1, OpaqueGiven: expect.stringMatching(/^[A-Z][a-z]+$/) }),
            expect.objectContaining({ ID: 2, OpaqueFamily: expect.stringMatching(/^[A-Z][a-z]+$/) })
        ]);
        expect(result.capabilities).toEqual({
            mode: 'semantic',
            classifier: 'ready',
            sft: 'unavailable'
        });
    });

    it('opens the classifier circuit after one failure and emits one diagnostic', async () => {
        const properties = Array.from(
            { length: 102 },
            (_unused, index) => `<Property Name="Field${index}" Type="Edm.String" Nullable="false" />`
        ).join('');
        const classifier: SemanticClassifier = {
            fingerprint: 'always-failing-classifier',
            classify: jest.fn(async () => Promise.reject(new Error('runtime failed')))
        };
        const result = await generateService(
            {
                metadata: {
                    format: 'edmx',
                    content: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" />${properties}</EntityType></Schema></edmx:DataServices></edmx:Edmx>`
                },
                service: { urlPath: '/records', odataVersion: '4.0' },
                targets: [{ name: 'Records', kind: 'entity-set' }],
                existingData: {}
            },
            { rowsPerEntity: 1 },
            { classifier }
        );

        expect(classifier.classify).toHaveBeenCalledTimes(1);
        expect(result.diagnostics).toEqual([
            expect.objectContaining({ code: 'CLASSIFIER_INFERENCE_FAILED', target: 'Records.ID' })
        ]);
        expect(result.resources.Records).toHaveLength(1);
    });

    it('uses the fine-tuned generator only for classifier residuals and preserves structural fields', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'classifier-candidate-sha256',
            classify: jest.fn(async () => ({
                role: 'unknown',
                confidence: 0.2,
                source: 'classifier'
            }))
        };
        const sft: SftGenerator = {
            fingerprint: 'sft-int8-candidate-sha256',
            generate: jest.fn(async () => ({
                rows: [
                    { ID: 999, OpaqueText: 'Quarterly liquidity forecast', Hallucinated: 'discard me' },
                    { ID: 999, OpaqueText: 'Bank account reconciliation' }
                ]
            }))
        };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Records" EntityType="Demo.Record" />
                                </EntityContainer>
                                <EntityType Name="Record">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpaqueText" Type="Edm.String" Nullable="false" MaxLength="40" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/records', odataVersion: '4.0' },
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {}
        };

        const result = await generateService(request, { seed: 23, rowsPerEntity: 2 }, { classifier, sft });

        expect(sft.generate).toHaveBeenCalledTimes(1);
        expect(sft.generate).toHaveBeenCalledWith(
            expect.objectContaining({
                entityName: 'Record',
                rowCount: 2,
                fields: [
                    expect.objectContaining({
                        name: 'OpaqueText',
                        primitiveType: 'string',
                        semanticRole: 'unknown'
                    })
                ]
            }),
            expect.any(AbortSignal)
        );
        expect(result.resources.Records).toEqual([
            { ID: 1, OpaqueText: 'Quarterly liquidity forecast' },
            { ID: 2, OpaqueText: 'Bank account reconciliation' }
        ]);
        expect(result.statistics.sft).toEqual({
            attempts: 1,
            parsedResponses: 1,
            eligibleSlots: 2,
            acceptedSlots: 2,
            assignments: [
                {
                    resource: 'Records',
                    entity: 'Record',
                    rowCount: 2,
                    parsed: true,
                    fields: [{ name: 'OpaqueText', eligibleSlots: 2, acceptedSlots: 2 }]
                }
            ]
        });
    });

    it('degrades both learned tiers independently and still returns usable fallback rows', async () => {
        const classifier: SemanticClassifier = {
            fingerprint: 'classifier-candidate-sha256',
            classify: jest.fn(async (input) => {
                if (input.propertyName === 'OpaqueText') {
                    throw new Error('classifier session failed');
                }
                return { role: 'unknown', confidence: 0, source: 'classifier' };
            })
        };
        const sft: SftGenerator = {
            fingerprint: 'sft-int8-candidate-sha256',
            generate: jest.fn(async () => {
                throw new Error('causal LM timed out');
            })
        };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container">
                                    <EntitySet Name="Records" EntityType="Demo.Record" />
                                </EntityContainer>
                                <EntityType Name="Record">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpaqueText" Type="Edm.String" Nullable="false" MaxLength="40" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/records', odataVersion: '4.0' },
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {}
        };

        const result = await generateService(request, { seed: 23, rowsPerEntity: 1 }, { classifier, sft });

        expect(result.resources.Records).toEqual([{ ID: 1, OpaqueText: 'Opaque Text 1' }]);
        expect(result.capabilities).toEqual({ mode: 'deterministic', classifier: 'degraded', sft: 'degraded' });
        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'CLASSIFIER_INFERENCE_FAILED', target: 'Records.OpaqueText' }),
                expect.objectContaining({ code: 'SFT_INFERENCE_FAILED', target: 'Records' })
            ])
        );
        expect(result.statistics.sft).toMatchObject({
            attempts: 1,
            parsedResponses: 0,
            eligibleSlots: 1,
            acceptedSlots: 0,
            assignments: [expect.objectContaining({ resource: 'Records', parsed: false })]
        });
    });

    it('opens the SFT circuit after one entity failure instead of retrying every entity', async () => {
        const sft: SftGenerator = {
            fingerprint: 'sft-failing-candidate',
            generate: jest.fn(async () => {
                throw new Error('SFT runtime failed');
            })
        };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container">
                                    <EntitySet Name="First" EntityType="Demo.FirstRecord" />
                                    <EntitySet Name="Second" EntityType="Demo.SecondRecord" />
                                </EntityContainer>
                                <EntityType Name="FirstRecord">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpaqueValue" Type="Edm.String" Nullable="false" />
                                </EntityType>
                                <EntityType Name="SecondRecord">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpaqueValue" Type="Edm.String" Nullable="false" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/records', odataVersion: '4.0' },
            targets: [
                { name: 'First', kind: 'entity-set' },
                { name: 'Second', kind: 'entity-set' }
            ],
            existingData: {}
        };

        const result = await generateService(request, { rowsPerEntity: 1 }, { sft });

        expect(sft.generate).toHaveBeenCalledTimes(1);
        expect(result.resources.First).toHaveLength(1);
        expect(result.resources.Second).toHaveLength(1);
        expect(result.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'SFT_INFERENCE_FAILED', target: 'First' }),
                expect.objectContaining({ code: 'SFT_SKIPPED_AFTER_FAILURE', target: 'Second' })
            ])
        );
    });

    it('bounds one SFT entity inference and returns deterministic fallback on timeout', async () => {
        const sft: SftGenerator = {
            fingerprint: 'sft-stalled-candidate',
            generate: jest.fn(
                async (_input, signal) =>
                    new Promise((_resolve, reject) => {
                        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
                    })
            )
        };
        const request: MockDataServiceRequest = {
            metadata: {
                format: 'edmx',
                content: `<?xml version="1.0" encoding="utf-8"?>
                    <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                        <edmx:DataServices>
                            <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                                <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer>
                                <EntityType Name="Record">
                                    <Key><PropertyRef Name="ID" /></Key>
                                    <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                    <Property Name="OpaqueValue" Type="Edm.String" Nullable="false" />
                                </EntityType>
                            </Schema>
                        </edmx:DataServices>
                    </edmx:Edmx>`
            },
            service: { urlPath: '/records', odataVersion: '4.0' },
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {}
        };

        const result = await generateService(request, { rowsPerEntity: 1, sftTimeoutMs: 5 }, { sft });

        expect(result.resources.Records).toEqual([{ ID: 1, OpaqueValue: 'Opaque Value 1' }]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'SFT_INFERENCE_TIMEOUT', target: 'Records' })
        );
    });
});
