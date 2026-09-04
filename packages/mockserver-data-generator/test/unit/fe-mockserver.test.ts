import FeMockserverDataGenerator from '../../src/fe-mockserver.cjs';
import type { LearnedRuntimeHandle } from '../../src/model/learned-runtime.js';
import { createGenerationFingerprint, writeGeneratedDataCache } from '../../src/index.js';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('standard FE mockserver provider', () => {
    it('implements host API v1 and maps the host context to whole-service generation', async () => {
        const provider = new FeMockserverDataGenerator({ seed: 31, rowsPerEntity: 1, generatedDataCache: false });
        const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };
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
            logger,
            signal: new AbortController().signal
        });

        expect(provider.apiVersion).toBe(1);
        expect(result.resources.Products).toEqual([{ ID: 1, Name: 'Product 1' }]);
        expect(result.fingerprints?.request).toMatch(/^[a-f0-9]{64}$/);
        expect(result).not.toHaveProperty('capabilities');
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringMatching(/^MOCK_DATA_GENERATOR_TIMING: phase=whole-service durationMs=\d+\.\d{3}$/u)
        );
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
                modelOffline: true,
                generatedDataCache: false
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
        expect(context.logger.debug).toHaveBeenCalledWith(
            'MOCK_DATA_GENERATOR_CAPABILITIES: mode=hybrid classifier=ready sft=ready'
        );
        expect(context.logger.debug).toHaveBeenCalledWith(
            expect.stringMatching(/^MOCK_DATA_GENERATOR_TIMING: phase=runtime-initialization durationMs=\d+\.\d{3}$/u)
        );
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
                modelOffline: true,
                generatedDataCache: false
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

    it('does not permanently open learned-component circuits when a generation is cancelled', async () => {
        const classify = jest.fn(async (_input, signal: AbortSignal) => {
            signal.throwIfAborted();
            return { role: 'unknown', confidence: 0, source: 'classifier' as const };
        });
        const generate = jest.fn(async ({ rowCount }: { rowCount: number }, signal: AbortSignal) => {
            signal.throwIfAborted();
            return {
                rows: Array.from({ length: rowCount }, () => ({ Opaque: 'Recovered learned value' }))
            };
        });
        const provider = new FeMockserverDataGenerator(
            {
                rowsPerEntity: 1,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true,
                generatedDataCache: false
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
            service: { urlPath: '/cancelled-records', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Opaque" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() }
        };
        const warm = await provider.generate({ ...context, signal: new AbortController().signal });
        expect(warm.resources.Records?.[0]?.Opaque).toBe('Recovered learned value');
        classify.mockClear();
        generate.mockClear();
        const cancelled = new AbortController();
        cancelled.abort(new Error('Reload superseded'));

        const first = await provider.generate({ ...context, signal: cancelled.signal });
        const second = await provider.generate({ ...context, signal: new AbortController().signal });

        expect(first.resources.Records?.[0]?.Opaque).toBe('Opaque 1');
        expect(second.resources.Records?.[0]?.Opaque).toBe('Recovered learned value');
        expect(second.diagnostics.filter(({ code }) => code.endsWith('_INFERENCE_FAILED'))).toHaveLength(0);
        expect(classify).toHaveBeenCalledTimes(3);
        expect(generate).toHaveBeenCalledTimes(1);
        await provider.dispose();
    });

    it('opens the classifier circuit when a runtime failure races with host cancellation', async () => {
        const cancelled = new AbortController();
        const classify = jest.fn(async () => {
            cancelled.abort(new Error('Reload superseded'));
            throw Object.assign(new Error('classifier failed independently'), { name: 'AbortError' });
        });
        const provider = new FeMockserverDataGenerator(
            {
                rowsPerEntity: 1,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true,
                generatedDataCache: false
            },
            {
                loadRuntime: async () => ({
                    runtime: { classifier: { fingerprint: 'classifier', classify } },
                    diagnostics: [],
                    dispose: async () => undefined
                })
            }
        );
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/raced-cancellation', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edm"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Opaque" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() }
        };

        await provider.generate({ ...context, signal: cancelled.signal });
        await provider.generate({ ...context, signal: new AbortController().signal });

        expect(classify).toHaveBeenCalledTimes(1);
        await provider.dispose();
    });

    it('retries first-use learned-runtime initialization after host cancellation', async () => {
        let firstAttemptStarted!: () => void;
        const firstAttempt = new Promise<void>((resolve) => {
            firstAttemptStarted = resolve;
        });
        let attempt = 0;
        const loadRuntime = jest.fn(async (_options: unknown, signal: AbortSignal): Promise<LearnedRuntimeHandle> => {
            attempt += 1;
            if (attempt === 1) {
                firstAttemptStarted();
                return new Promise<LearnedRuntimeHandle>((_resolve, reject) => {
                    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
                });
            }
            return {
                runtime: {
                    sft: {
                        fingerprint: 'sft',
                        generate: async ({ rowCount }) => ({
                            rows: Array.from({ length: rowCount }, () => ({ Opaque: 'Recovered after reload' }))
                        })
                    }
                },
                diagnostics: [],
                dispose: async () => undefined
            };
        });
        const provider = new FeMockserverDataGenerator(
            {
                rowsPerEntity: 1,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true,
                generatedDataCache: false
            },
            { loadRuntime }
        );
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/initialization-cancelled', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Opaque" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() }
        };
        const cancelled = new AbortController();
        const staleGeneration = provider.generate({ ...context, signal: cancelled.signal });
        await firstAttempt;
        cancelled.abort(new Error('Reload superseded'));

        await expect(staleGeneration).rejects.toThrow('Reload superseded');
        const recovered = await provider.generate({ ...context, signal: new AbortController().signal });

        expect(recovered.resources.Records?.[0]?.Opaque).toBe('Recovered after reload');
        expect(loadRuntime).toHaveBeenCalledTimes(2);
        await provider.dispose();
    });

    it('keeps the SFT circuit open after an inference timeout', async () => {
        const generate = jest.fn(
            async (_input: unknown, signal: AbortSignal) =>
                new Promise<never>((_resolve, reject) => {
                    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
                })
        );
        const provider = new FeMockserverDataGenerator(
            {
                rowsPerEntity: 1,
                sftTimeoutMs: 5,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true,
                generatedDataCache: false
            },
            {
                loadRuntime: async () => ({
                    runtime: { sft: { fingerprint: 'sft', generate } },
                    diagnostics: [],
                    dispose: async () => undefined
                })
            }
        );
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/timed-out-records', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Opaque" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() }
        };

        const first = await provider.generate({ ...context, signal: new AbortController().signal });
        const second = await provider.generate({ ...context, signal: new AbortController().signal });

        expect(first.resources.Records?.[0]?.Opaque).toBe('Opaque 1');
        expect(second.resources.Records?.[0]?.Opaque).toBe('Opaque 1');
        expect(first.diagnostics).toContainEqual(expect.objectContaining({ code: 'SFT_INFERENCE_FAILED' }));
        expect(second.diagnostics).toContainEqual(expect.objectContaining({ code: 'SFT_INFERENCE_FAILED' }));
        expect(generate).toHaveBeenCalledTimes(1);
        await provider.dispose();
    });

    it('opens the SFT circuit when a non-cooperative delegate outlives its inference timeout', async () => {
        let resolveDelegate!: (value: { rows: Array<{ Opaque: string }> }) => void;
        const generate = jest.fn(
            async () =>
                new Promise<{ rows: Array<{ Opaque: string }> }>((resolve) => {
                    resolveDelegate = resolve;
                })
        );
        const provider = new FeMockserverDataGenerator(
            {
                rowsPerEntity: 1,
                sftTimeoutMs: 5,
                mode: 'learned',
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true,
                generatedDataCache: false
            },
            {
                loadRuntime: async () => ({
                    runtime: { sft: { fingerprint: 'sft', generate } },
                    diagnostics: [],
                    dispose: async () => undefined
                })
            }
        );
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/non-cooperative-sft', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Opaque" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        };

        const first = await provider.generate(context);
        resolveDelegate({ rows: [{ Opaque: 'Too late' }] });
        await new Promise<void>((resolve) => setImmediate(resolve));
        const second = await provider.generate(context);

        expect(first.resources.Records?.[0]?.Opaque).toBe('Opaque 1');
        expect(second.resources.Records?.[0]?.Opaque).toBe('Opaque 1');
        expect(generate).toHaveBeenCalledTimes(1);
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
        const provider = new FeMockserverDataGenerator({ rowsPerEntity: 5, generatedDataCache: false });
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

    it('serves a warm whole-service cache hit without loading model sessions', async () => {
        const cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-provider-cache-'));
        const loadRuntime = jest.fn(async (): Promise<LearnedRuntimeHandle> => ({
            runtime: {
                classifier: {
                    fingerprint: 'classifier-runtime',
                    classify: jest.fn(async () => ({ role: 'unknown', confidence: 0, source: 'classifier' }))
                },
                sft: {
                    fingerprint: 'sft-runtime',
                    generate: jest.fn(async ({ rowCount }) => ({
                        rows: Array.from({ length: rowCount }, () => ({ OpaqueTitle: 'Treasury Operations' }))
                    }))
                }
            },
            diagnostics: [],
            dispose: async () => undefined
        }));
        const modelFingerprints = jest.fn(async () => ({
            classifier: 'classifier-runtime',
            sft: 'sft-runtime'
        }));
        const options = {
            seed: 31,
            rowsPerEntity: 1,
            mode: 'learned' as const,
            modelManifestPath: '/verified/manifest.json',
            modelOffline: true,
            generatedDataCacheDirectory: cacheRoot
        };
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/warm-books', odataVersion: '4.0' as const },
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
        try {
            const coldProvider = new FeMockserverDataGenerator(options, { loadRuntime, modelFingerprints });
            const cold = await coldProvider.generate(context);
            await coldProvider.dispose();
            const warmProvider = new FeMockserverDataGenerator(options, { loadRuntime, modelFingerprints });
            const warm = await warmProvider.generate({ ...context, signal: new AbortController().signal });
            await warmProvider.dispose();

            expect(cold.resources.Books?.[0]?.OpaqueTitle).toBe('Treasury Operations');
            expect(warm.resources).toEqual(cold.resources);
            expect(warm.diagnostics).toContainEqual(expect.objectContaining({ code: 'GENERATED_DATA_CACHE_HIT' }));
            expect(loadRuntime).toHaveBeenCalledTimes(1);
            expect(modelFingerprints).toHaveBeenCalledTimes(2);
            const capabilityLogs = context.logger.debug.mock.calls.filter(([message]) =>
                String(message).startsWith('MOCK_DATA_GENERATOR_CAPABILITIES:')
            );
            expect(capabilityLogs).toEqual([
                ['MOCK_DATA_GENERATOR_CAPABILITIES: mode=hybrid classifier=ready sft=ready']
            ]);
            expect(context.logger.debug).toHaveBeenCalledWith(
                expect.stringMatching(
                    /^MOCK_DATA_GENERATOR_TIMING: phase=generated-data-cache-hit durationMs=\d+\.\d{3}$/u
                )
            );
        } finally {
            await rm(cacheRoot, { recursive: true, force: true });
        }
    });

    it('reports a cache-read failure and continues with deterministic generation', async () => {
        const readGeneratedDataCache = jest.fn(async () => Promise.reject(new Error('cache unavailable')));
        const provider = new FeMockserverDataGenerator(
            { rowsPerEntity: 1, generatedDataCacheDirectory: '/unavailable/generated-cache' },
            { readGeneratedDataCache }
        );
        const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };

        const result = await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/cache-failure', odataVersion: '4.0' },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Rows" EntityType="Demo.Row" /></EntityContainer><EntityType Name="Row"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Rows', kind: 'entity-set' }],
            existingData: {},
            logger,
            signal: new AbortController().signal
        });

        expect(result.resources.Rows).toEqual([{ ID: 1 }]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'GENERATED_DATA_CACHE_UNAVAILABLE', severity: 'warning' })
        );
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('GENERATED_DATA_CACHE_UNAVAILABLE'));
        await provider.dispose();
    });

    it('quarantines a structurally stale cache entry before serving data', async () => {
        const cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-provider-stale-cache-'));
        const metadata = `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Rows" EntityType="Demo.Row" /></EntityContainer><EntityType Name="Row"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="Title" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`;
        const request = {
            metadata: { format: 'edmx' as const, content: metadata },
            service: { urlPath: '/stale-cache', odataVersion: '4.0' as const },
            targets: [{ name: 'Rows', kind: 'entity-set' as const }],
            existingData: {}
        };
        const generation = { seed: 17, rowsPerEntity: 1 };
        const key = createGenerationFingerprint(request, generation);
        await writeGeneratedDataCache(cacheRoot, key, {
            resources: { Rows: [{ ID: 1, Rogue: 'obsolete schema field' }] },
            diagnostics: [],
            capabilities: { mode: 'deterministic', classifier: 'unavailable', sft: 'unavailable' },
            fingerprints: { request: key }
        });
        const provider = new FeMockserverDataGenerator({
            ...generation,
            generatedDataCacheDirectory: cacheRoot
        });

        try {
            const generated = await provider.generate({
                contractVersion: 1,
                service: request.service,
                metadata,
                targets: request.targets,
                existingData: {},
                logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
                signal: new AbortController().signal
            });

            expect(generated.resources.Rows).toEqual([{ ID: 1, Title: 'Title 1' }]);
            expect(generated.diagnostics).not.toContainEqual(
                expect.objectContaining({ code: 'GENERATED_DATA_CACHE_HIT' })
            );
            expect((await readdir(cacheRoot)).some((name) => name.startsWith(`${key}.corrupt-`))).toBe(true);
        } finally {
            await provider.dispose();
            await rm(cacheRoot, { recursive: true, force: true });
        }
    });
});
