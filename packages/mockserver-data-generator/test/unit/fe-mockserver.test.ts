import FeMockserverDataGenerator from '../../src/fe-mockserver.cjs';
import type { LearnedRuntimeHandle } from '../../src/model/learned-runtime.js';

describe('standard FE mockserver provider', () => {
    it('implements host API v1 and maps the host context to whole-service generation', async () => {
        const provider = new FeMockserverDataGenerator({ seed: 31, rowsPerEntity: 1 });
        const result = await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/products', odataVersion: '4.0' },
            metadata: `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container">
                                <EntitySet Name="Products" EntityType="Demo.Product" />
                            </EntityContainer>
                            <EntityType Name="Product">
                                <Key><PropertyRef Name="ID" /></Key>
                                <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                <Property Name="Name" Type="Edm.String" Nullable="false" />
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`,
            targets: [{ name: 'Products', kind: 'entity-set' }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        });

        expect(provider.apiVersion).toBe(1);
        expect(result.resources.Products).toEqual([{ ID: 1, Name: 'Product 1' }]);
        expect(result.fingerprints?.request).toMatch(/^[a-f0-9]{64}$/);
        expect(result).not.toHaveProperty('capabilities');
        await expect(provider.dispose()).resolves.toBeUndefined();
    });

    it('loads the classifier and SFT runtime lazily once and disposes it', async () => {
        const dispose = jest.fn(async () => undefined);
        const handle: LearnedRuntimeHandle = {
            runtime: {
                classifier: {
                    fingerprint: 'classifier-runtime',
                    classify: jest.fn(async (input) => ({
                        role: input.propertyName === 'OpaqueTitle' ? 'unknown' : 'unknown',
                        confidence: 0,
                        source: 'classifier'
                    }))
                },
                sft: {
                    fingerprint: 'sft-runtime',
                    generate: jest.fn(async ({ rowCount }) => ({
                        rows: Array.from({ length: rowCount }, () => ({ OpaqueTitle: 'Treasury Operations' }))
                    }))
                }
            },
            diagnostics: [],
            dispose
        };
        const loadRuntime = jest.fn(async () => handle);
        const provider = new FeMockserverDataGenerator(
            {
                seed: 31,
                rowsPerEntity: 1,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelCacheDirectory: '/verified/cache',
                modelOffline: true
            },
            { loadRuntime }
        );
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/books', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0" encoding="utf-8"?>
                <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices>
                        <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                            <EntityContainer Name="Container"><EntitySet Name="Books" EntityType="Demo.Book" /></EntityContainer>
                            <EntityType Name="Book">
                                <Key><PropertyRef Name="ID" /></Key>
                                <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                                <Property Name="OpaqueTitle" Type="Edm.String" Nullable="false" />
                            </EntityType>
                        </Schema>
                    </edmx:DataServices>
                </edmx:Edmx>`,
            targets: [{ name: 'Books', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        };

        const first = await provider.generate(context);
        const second = await provider.generate(context);

        expect(loadRuntime).toHaveBeenCalledTimes(1);
        expect(loadRuntime).toHaveBeenCalledWith(
            expect.objectContaining({
                manifestPath: '/verified/manifest.json',
                cacheDirectory: '/verified/cache',
                offline: true
            }),
            expect.any(AbortSignal)
        );
        expect(first.resources.Books?.[0]?.OpaqueTitle).toBe('Treasury Operations');
        expect(second).not.toHaveProperty('capabilities');
        await provider.dispose();
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    it('keeps failed learned-component circuits open across provider generations', async () => {
        const classify = jest.fn(async () => Promise.reject(new Error('classifier failed')));
        const generate = jest.fn(async () => Promise.reject(new Error('sft failed')));
        const provider = new FeMockserverDataGenerator(
            {
                rowsPerEntity: 1,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true
            },
            {
                loadRuntime: async () => ({
                    runtime: {
                        classifier: { fingerprint: 'classifier', classify },
                        sft: { fingerprint: 'sft', generate }
                    },
                    diagnostics: [],
                    dispose: async () => undefined
                })
            }
        );
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/records', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Opaque" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        };

        const first = await provider.generate(context);
        const second = await provider.generate(context);

        expect(classify).toHaveBeenCalledTimes(1);
        expect(generate).toHaveBeenCalledTimes(1);
        expect(first.resources.Records).toHaveLength(1);
        expect(second.resources.Records).toHaveLength(1);
        expect(second.diagnostics.filter(({ code }) => code.endsWith('_INFERENCE_FAILED'))).toHaveLength(2);
        await provider.dispose();
    });

    it('caps internal diagnostics at the host contract boundary', async () => {
        const entities = Array.from(
            { length: 101 },
            (_unused, index) => `
            <EntitySet Name="Rows${index}" EntityType="Demo.Row${index}" />`
        );
        const entityTypes = Array.from(
            { length: 101 },
            (_unused, index) => `
            <EntityType Name="Row${index}">
                <Key><PropertyRef Name="ID" /></Key>
                <Property Name="ID" Type="Edm.Boolean" Nullable="false" />
            </EntityType>`
        );
        const provider = new FeMockserverDataGenerator({ rowsPerEntity: 5 });
        const result = await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/bounded-diagnostics', odataVersion: '4.0' },
            metadata: `<?xml version="1.0"?>
                <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                    <edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                        <EntityContainer Name="Container">${entities.join('')}</EntityContainer>
                        ${entityTypes.join('')}
                    </Schema></edmx:DataServices>
                </edmx:Edmx>`,
            targets: Array.from({ length: 101 }, (_unused, index) => ({
                name: `Rows${index}`,
                kind: 'entity-set' as const
            })),
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        });

        expect(result.diagnostics).toHaveLength(100);
        expect(result.diagnostics.at(-1)).toEqual(
            expect.objectContaining({ code: 'DIAGNOSTICS_TRUNCATED', severity: 'warning' })
        );
        expect(result.resources.Rows0).toHaveLength(2);
        await provider.dispose();
    });
});
