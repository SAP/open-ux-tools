import { applySftGeneration } from '../../src/generation/sft.js';
import { finalizeSemanticServiceWorld } from '../../src/generation/service-world.js';
import { compileSemanticPlan } from '../../src/generation/semantic-plan.js';
import { applyApplicationDomains } from '../../src/generation/scenario.js';
import type { ExistingMockData, MockDataGeneratorOptions, SftGenerator } from '../../src/types.js';
import type { SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';

function stringProperty(name: string, isKey = false, links?: SchemaProperty['links']): SchemaProperty {
    return {
        name,
        primitiveType: 'string',
        nullable: false,
        isKey,
        annotations: [],
        ...(links === undefined ? {} : { links })
    };
}

function graphWithCodeDomain(includeStructuralMasterProperty = false): SchemaGraph {
    const codeProperties = [
        stringProperty('Code', true, { text: 'Caption' }),
        stringProperty('Caption'),
        ...(includeStructuralMasterProperty ? [stringProperty('ParentID')] : [])
    ];
    return {
        namespace: 'Demo',
        entities: [
            {
                name: 'Item',
                entitySetName: 'Items',
                properties: [
                    stringProperty('ID', true),
                    stringProperty('Code', false, {
                        valueListCollection: 'Codes',
                        valueListMappings: [{ localProperty: 'Code', valueListProperty: 'Code' }]
                    })
                ]
            },
            { name: 'Code', entitySetName: 'Codes', properties: codeProperties },
            ...(includeStructuralMasterProperty
                ? [{ name: 'Parent', entitySetName: 'Parents', properties: [stringProperty('ID', true)] }]
                : [])
        ],
        relationships: includeStructuralMasterProperty
            ? [
                  {
                      name: 'CodeParent',
                      fromEntitySet: 'Codes',
                      toEntitySet: 'Parents',
                      mappings: [{ sourceProperty: 'ParentID', targetProperty: 'ID' }],
                      provenance: 'explicit'
                  }
              ]
            : []
    };
}

function options(): MockDataGeneratorOptions {
    return { pipeline: 'semantic-v2', seed: 7, rowsPerEntity: 1 };
}

function resources(includeStructuralMasterProperty = false) {
    return {
        Items: [{ ID: 'I1', Code: 'fallback' }],
        Codes: [
            includeStructuralMasterProperty
                ? { Code: 'K0', Caption: 'Fallback', ParentID: 'P0' }
                : { Code: 'K0', Caption: 'Fallback' }
        ],
        ...(includeStructuralMasterProperty ? { Parents: [{ ID: 'P0' }] } : {})
    };
}

const absentOwnership: ExistingMockData = {
    contributor: { present: false },
    initialRows: { source: 'none', present: false }
};

function generator(calls: string[][]): SftGenerator {
    return {
        fingerprint: 'synthetic-domain-ownership-test',
        generate: async (input) => {
            calls.push(input.fields.map(({ name }) => name));
            return {
                rows: [
                    Object.fromEntries(
                        input.fields.map(({ name }) => [name, name === 'Code' ? 'K1' : 'Generated caption'])
                    )
                ]
            };
        }
    };
}

/**
 * The domain keeps its deterministic rows, the model is not asked, and the result says why.
 *
 * @param run the fine-tuned tier's result
 * @param calls model calls made
 */
function expectUnverifiedDomainKept(run: Awaited<ReturnType<typeof applySftGeneration>>, calls: string[][]): void {
    expect(calls).toEqual([]);
    expect(run.resources.Codes).toEqual(resources().Codes);
    expect(run.diagnostics).toEqual(
        expect.arrayContaining([
            expect.objectContaining({ code: 'SFT_CANDIDATE_VERIFIER_UNAVAILABLE', target: 'Codes' })
        ])
    );
}

describe('synthetic reference-domain ownership', () => {
    it('does not let generic classifier roles bypass an unevidenced linked code/text domain', async () => {
        const graph = graphWithCodeDomain();
        const detections = new Map([
            ['Codes.Code', { role: 'business_identifier', source: 'classifier' as const, confidence: 0.99 }],
            ['Codes.Caption', { role: 'description', source: 'classifier' as const, confidence: 0.99 }]
        ]);
        const diagnostics: Parameters<typeof compileSemanticPlan>[2] = [];
        const planned = compileSemanticPlan(graph, detections, diagnostics);
        expect(planned.get('Codes.Code')?.role).toBe('unknown');
        expect(planned.get('Codes.Caption')?.role).toBe('unknown');
        expect(diagnostics).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'SEMANTIC_DOMAIN_UNAVAILABLE' })])
        );
        const calls: string[][] = [];
        const run = await applySftGeneration(
            graph,
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            planned,
            generator(calls),
            new AbortController().signal,
            { Codes: absentOwnership }
        );
        expectUnverifiedDomainKept(run, calls);
    });

    it('retains an authored relationship-bound status code and its linked text as application evidence', () => {
        const original = graphWithCodeDomain();
        const item = original.entities[0];
        const graph: SchemaGraph = {
            ...original,
            entities: [
                {
                    ...item,
                    properties: [
                        ...item.properties.map((field) =>
                            field.name === 'Code' ? { ...field, links: { ...field.links, text: 'StatusText' } } : field
                        ),
                        stringProperty('StatusText')
                    ]
                },
                original.entities[1]
            ],
            relationships: [
                {
                    name: 'ItemStatus',
                    fromEntitySet: 'Items',
                    toEntitySet: 'Codes',
                    mappings: [{ sourceProperty: 'Code', targetProperty: 'Code' }],
                    provenance: 'explicit'
                }
            ]
        };
        const evidence: Readonly<Record<string, ExistingMockData>> = {
            Codes: {
                contributor: { present: false },
                initialRows: { source: 'json', present: true, rows: [{ Code: 'O', Caption: 'Open' }] }
            }
        };
        const diagnostics: Parameters<typeof compileSemanticPlan>[2] = [];
        const bound = applyApplicationDomains(graph, evidence, diagnostics);
        expect(bound.entities[0].properties.find(({ name }) => name === 'Code')?.enumValues).toBeUndefined();
        const decisions = new Map([
            ['Items.Code', { role: 'status', source: 'classifier' as const, confidence: 0.99 }],
            ['Items.StatusText', { role: 'description', source: 'classifier' as const, confidence: 0.99 }]
        ]);
        const planned = compileSemanticPlan(bound, decisions, diagnostics, undefined, evidence);
        expect(planned.get('Items.Code')?.role).toBe('status');
        expect(planned.get('Items.StatusText')?.role).toBe('description');
    });

    it('does not treat every ordinary identifier caption as an unevidenced business domain', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Document',
                    entitySetName: 'Documents',
                    properties: [stringProperty('ID', true, { text: 'Caption' }), stringProperty('Caption')]
                }
            ],
            relationships: []
        };
        const decisions = new Map([
            ['Documents.ID', { role: 'business_identifier', source: 'classifier' as const, confidence: 0.99 }],
            ['Documents.Caption', { role: 'description', source: 'classifier' as const, confidence: 0.99 }]
        ]);
        const planned = compileSemanticPlan(graph, decisions, []);
        expect(planned.get('Documents.ID')?.role).toBe('business_identifier');
        expect(planned.get('Documents.Caption')?.role).toBe('description');
    });

    it('keeps the deterministic rows of an evidence-poor linked domain without an independent relevance verifier', async () => {
        const calls: string[][] = [];
        const run = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            generator(calls),
            new AbortController().signal,
            { Codes: absentOwnership }
        );
        expectUnverifiedDomainKept(run, calls);
    });

    it('does not treat an empty authored value help as a domain', async () => {
        const calls: string[][] = [];
        const run = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            generator(calls),
            new AbortController().signal,
            {
                Codes: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [] }
                }
            }
        );
        expectUnverifiedDomainKept(run, calls);
    });

    it('keeps deterministic rows for a malformed linked code/text group without a second model call', async () => {
        let generations = 0;
        const sft: SftGenerator = {
            fingerprint: 'candidate-structural-retry-test',
            generate: async () => {
                generations++;
                return {
                    rows: [generations === 1 ? { Code: 'K1', Caption: 'K1' } : { Code: 'K2', Caption: 'Approved' }]
                };
            }
        };
        const verifier = {
            fingerprint: 'candidate-relevance-test',
            verifyBatch: jest.fn(async (pairs: ReadonlyArray<{ value: string }>) => pairs.map(() => true))
        };
        const result = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            sft,
            new AbortController().signal,
            { Codes: absentOwnership },
            undefined,
            verifier
        );
        expect(generations).toBe(1);
        expect(verifier.verifyBatch).not.toHaveBeenCalled();
        expect(result.resources.Codes).toEqual([{ Code: 'K0', Caption: 'Fallback' }]);
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
    });

    it('keeps deterministic rows when a separate relevance check rejects a synthetic caption', async () => {
        let generations = 0;
        const sft: SftGenerator = {
            fingerprint: 'candidate-retry-test',
            generate: async () => {
                generations++;
                return { rows: [{ Code: `K${generations}`, Caption: generations === 1 ? 'Bus' : 'Approved' }] };
            }
        };
        const verifier = {
            fingerprint: 'candidate-relevance-test',
            verifyBatch: jest.fn(async (pairs: ReadonlyArray<{ value: string }>) =>
                pairs.map(({ value }) => value !== 'Bus')
            )
        };

        const result = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            sft,
            new AbortController().signal,
            { Codes: absentOwnership },
            undefined,
            verifier
        );

        expect(generations).toBe(1);
        expect(result.resources.Codes).toEqual([{ Code: 'K0', Caption: 'Fallback' }]);
        expect(verifier.verifyBatch).toHaveBeenCalledTimes(1);
        expect(verifier.verifyBatch).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    service: { urlPath: '/ownership', odataVersion: '4.0' },
                    linkedCode: expect.objectContaining({ property: 'Code', value: 'K1' }),
                    relatedResources: ['Items']
                })
            ],
            expect.any(AbortSignal)
        );
        expect(result.statistics).toMatchObject({
            eligibleSlots: 2,
            acceptedSlots: 0,
            rejectedSlots: 2,
            fallbackSlots: 2
        });
    });

    it('checks a residual caption even when the linked key has a classifier role', async () => {
        let generations = 0;
        const verifier = {
            fingerprint: 'caption-relevance-test',
            verifyBatch: jest.fn(async (pairs: ReadonlyArray<{ value: string }>) =>
                pairs.map(({ value }) => value !== 'Bus')
            )
        };
        const result = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map([
                [
                    'Codes.Code',
                    {
                        role: 'identifier' as const,
                        confidence: 0.99,
                        routeThreshold: 0.5,
                        source: 'classifier' as const
                    }
                ]
            ]),
            {
                fingerprint: 'caption-candidate-test',
                generate: async () => {
                    generations++;
                    return { rows: [{ Caption: generations === 1 ? 'Bus' : 'Approved' }] };
                }
            },
            new AbortController().signal,
            { Codes: absentOwnership },
            undefined,
            verifier
        );
        // The off-topic caption is checked and declined, so the deterministic caption stands.
        expect(generations).toBe(1);
        expect(verifier.verifyBatch).toHaveBeenCalledTimes(1);
        expect(result.resources.Codes).toEqual([{ Code: 'K0', Caption: 'Fallback' }]);
    });

    it('keeps deterministic captions when the proposal is off-topic', async () => {
        let generations = 0;
        const sft: SftGenerator = {
            fingerprint: 'candidate-retry-exhausted-test',
            generate: async () => {
                generations++;
                return { rows: [{ Code: `K${generations}`, Caption: 'Bus' }] };
            }
        };
        const verifier = {
            fingerprint: 'candidate-relevance-test',
            verifyBatch: async (pairs: ReadonlyArray<{ value: string }>) => pairs.map(() => false)
        };

        const result = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            sft,
            new AbortController().signal,
            { Codes: absentOwnership },
            undefined,
            verifier
        );
        // The proposal is rejected, so the deterministic rows stand and the caller is told.
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
        expect(generations).toBe(1);
    });

    it('does not accept a relevance decision that arrives after the entity budget', async () => {
        // The late decision is discarded: the deterministic rows stand and the caller is told.
        const sft: SftGenerator = {
            fingerprint: 'slow-verifier-test',
            generate: async () => ({ rows: [{ Code: 'K1', Caption: 'Approved' }] })
        };
        const verifier = {
            fingerprint: 'slow-relevance-test',
            verifyBatch: async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return [true];
            }
        };
        const result = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            { ...options(), sftBudgetMs: 10 },
            new Map(),
            sft,
            new AbortController().signal,
            { Codes: absentOwnership },
            undefined,
            verifier
        );
        expect(result.diagnostics.some(({ code }) => code === 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED')).toBe(true);
    });

    it('propagates parent cancellation while a relevance verifier is stalled', async () => {
        const controller = new AbortController();
        const sft: SftGenerator = {
            fingerprint: 'cancellation-test',
            generate: async () => ({ rows: [{ Code: 'K1', Caption: 'Proposed caption' }] })
        };
        let resolveStarted: () => void = () => undefined;
        const verificationStarted = new Promise<void>((resolve) => {
            resolveStarted = resolve;
        });
        const verifier = {
            fingerprint: 'stalled-relevance-test',
            verifyBatch: async () => {
                resolveStarted();
                return new Promise<ReadonlyArray<boolean>>(() => undefined);
            }
        };
        const generation = applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            sft,
            controller.signal,
            { Codes: absentOwnership },
            undefined,
            verifier
        );
        await verificationStarted;
        controller.abort(new Error('cancelled'));
        await expect(generation).rejects.toThrow('cancelled');
    });

    it('allows a hook-only contributor without initial data to generate a synthetic code/text domain', async () => {
        const calls: string[][] = [];
        const result = await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            generator(calls),
            new AbortController().signal,
            {
                Codes: {
                    contributor: { present: true, hasInitialData: false },
                    initialRows: { source: 'none', present: false }
                }
            },
            undefined,
            { fingerprint: 'reviewed-candidate-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        );

        expect(calls).toEqual(expect.arrayContaining([expect.arrayContaining(['Code', 'Caption'])]));
        expect(result.diagnostics).toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'SYNTHETIC_REFERENCE_DOMAIN', target: 'Codes' })])
        );
    });

    it('does not offer an authored domain identity to SFT', async () => {
        const calls: string[][] = [];
        await applySftGeneration(
            graphWithCodeDomain(),
            resources(),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            generator(calls),
            new AbortController().signal,
            {
                Codes: {
                    contributor: { present: true, hasInitialData: true },
                    initialRows: {
                        source: 'contributor',
                        present: true,
                        enumerable: true,
                        rows: [{ Code: 'Q', Caption: 'Authored phase' }]
                    }
                }
            }
        );

        expect(calls.some((fields) => fields.includes('Code'))).toBe(false);
    });

    it('rejects synthetic domains when any master property participates in a relationship', async () => {
        const calls: string[][] = [];
        const result = await applySftGeneration(
            graphWithCodeDomain(true),
            resources(true),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            generator(calls),
            new AbortController().signal,
            { Codes: absentOwnership },
            undefined,
            { fingerprint: 'structural-caption-relevance-test', verifyBatch: async (pairs) => pairs.map(() => true) }
        );

        expect(calls.some((fields) => fields.includes('Code'))).toBe(false);
        expect(result.diagnostics).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ code: 'SYNTHETIC_REFERENCE_DOMAIN', target: 'Codes' })])
        );
    });

    it('keeps the fallback caption when the linked master has a structural relationship and no verifier', async () => {
        const calls: string[][] = [];
        const run = await applySftGeneration(
            graphWithCodeDomain(true),
            resources(true),
            { urlPath: '/ownership', odataVersion: '4.0' },
            options(),
            new Map(),
            generator(calls),
            new AbortController().signal,
            { Codes: absentOwnership }
        );
        expect(calls.flat()).not.toContain('Caption');
        expect(run.resources.Codes).toEqual(resources(true).Codes);
        expect(run.diagnostics).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: 'SFT_CANDIDATE_VERIFIER_UNAVAILABLE', target: 'Codes' })
            ])
        );
    });

    it('does not clone a verified caption onto a protected owner code during finalization', () => {
        const diagnostics: Parameters<typeof finalizeSemanticServiceWorld>[5] = [];
        const original = graphWithCodeDomain();
        const item = original.entities[0];
        const graph: SchemaGraph = {
            ...original,
            entities: [
                {
                    ...item,
                    properties: item.properties.map((property) =>
                        property.name === 'Code' ? { ...property, isKey: true } : property
                    )
                },
                original.entities[1]
            ]
        };
        const world = finalizeSemanticServiceWorld(
            graph,
            { Items: [{ ID: 'I1', Code: 'K1' }], Codes: [{ Code: 'K0', Caption: 'Approved' }] },
            {},
            7,
            new Map(),
            diagnostics,
            {},
            new Map(),
            [],
            new Set(['Codes'])
        );
        // The verified caption stays with its own code; the unmatched tuple is reported, not invented.
        expect(world.Codes).not.toContainEqual(expect.objectContaining({ Code: 'K1', Caption: 'Approved' }));
        expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('preserves every property of an enumerable authored row during post-projection coherence', () => {
        const graph: SchemaGraph = {
            namespace: 'Demo',
            entities: [
                {
                    name: 'Invoice',
                    entitySetName: 'Invoices',
                    properties: [
                        { name: 'ID', primitiveType: 'int', nullable: false, isKey: true, annotations: [] },
                        {
                            name: 'Currency',
                            primitiveType: 'string',
                            nullable: false,
                            isKey: false,
                            annotations: [{ term: 'sap:semantics', value: 'currency-code' }]
                        },
                        {
                            name: 'Amount',
                            primitiveType: 'decimal',
                            nullable: false,
                            isKey: false,
                            links: { currency: 'Currency' },
                            annotations: []
                        }
                    ]
                }
            ],
            relationships: []
        };
        const authoredRow = { ID: 1, Currency: 'JPY', Amount: 1.234 };
        const result = finalizeSemanticServiceWorld(
            graph,
            { Invoices: [authoredRow] },
            {
                Invoices: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [authoredRow] }
                }
            },
            7
        );

        expect(result.Invoices).toEqual([authoredRow]);
    });
});
