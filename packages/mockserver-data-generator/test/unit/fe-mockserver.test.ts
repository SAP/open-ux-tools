import FeMockserverDataGenerator from '../../src/fe-mockserver.cjs';
import type { LearnedRuntimeHandle } from '../../src/model/learned-runtime.js';
import { MAX_METADATA_INPUT_BYTES, createGenerationFingerprint, writeGeneratedDataCache } from '../../src/index.js';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('standard FE mockserver provider', () => {
    const originalActivation = process.env.SAP_UX_MOCKGEN_ENABLED;
    const originalModelManifest = process.env.SAP_UX_MOCKGEN_MODEL_MANIFEST;
    const originalModelCache = process.env.SAP_UX_MOCKGEN_MODEL_CACHE;
    const originalModelUnavailable = process.env.SAP_UX_MOCKGEN_MODEL_UNAVAILABLE;

    beforeEach(() => {
        process.env.SAP_UX_MOCKGEN_ENABLED = '1';
        delete process.env.SAP_UX_MOCKGEN_MODEL_MANIFEST;
        delete process.env.SAP_UX_MOCKGEN_MODEL_CACHE;
        delete process.env.SAP_UX_MOCKGEN_MODEL_UNAVAILABLE;
    });

    afterAll(() => {
        if (originalActivation === undefined) {
            delete process.env.SAP_UX_MOCKGEN_ENABLED;
        } else {
            process.env.SAP_UX_MOCKGEN_ENABLED = originalActivation;
        }
        if (originalModelManifest === undefined) {
            delete process.env.SAP_UX_MOCKGEN_MODEL_MANIFEST;
        } else {
            process.env.SAP_UX_MOCKGEN_MODEL_MANIFEST = originalModelManifest;
        }
        if (originalModelCache === undefined) {
            delete process.env.SAP_UX_MOCKGEN_MODEL_CACHE;
        } else {
            process.env.SAP_UX_MOCKGEN_MODEL_CACHE = originalModelCache;
        }
        if (originalModelUnavailable === undefined) {
            delete process.env.SAP_UX_MOCKGEN_MODEL_UNAVAILABLE;
        } else {
            process.env.SAP_UX_MOCKGEN_MODEL_UNAVAILABLE = originalModelUnavailable;
        }
    });

    it('does no generator work when the launcher has not enabled MockGen', async () => {
        delete process.env.SAP_UX_MOCKGEN_ENABLED;
        const generateService = jest.fn();
        const loadRuntime = jest.fn();
        const modelFingerprints = jest.fn();
        const defaultGeneratedDataCacheRoot = jest.fn();
        const readGeneratedDataCache = jest.fn();
        const writeGeneratedDataCache = jest.fn();
        const provider = new FeMockserverDataGenerator(
            {
                mode: 'learned',
                modelManifestPath: '/must-not-be-read/model-manifest.json',
                generatedDataCache: true
            },
            {
                generateService,
                loadRuntime,
                modelFingerprints,
                defaultGeneratedDataCacheRoot,
                readGeneratedDataCache,
                writeGeneratedDataCache
            }
        );
        const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };

        const result = await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/disabled', odataVersion: '4.0' },
            metadata: 'not metadata and deliberately invalid',
            targets: [{ name: 'Rows', kind: 'entity-set' }],
            existingData: {},
            logger,
            signal: new AbortController().signal
        });

        expect(result).toEqual({ resources: {} });
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.resources)).toBe(true);
        expect(generateService).not.toHaveBeenCalled();
        expect(loadRuntime).not.toHaveBeenCalled();
        expect(modelFingerprints).not.toHaveBeenCalled();
        expect(defaultGeneratedDataCacheRoot).not.toHaveBeenCalled();
        expect(readGeneratedDataCache).not.toHaveBeenCalled();
        expect(writeGeneratedDataCache).not.toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('rejects oversized metadata with a stable privacy-safe diagnostic before generation', async () => {
        const provider = new FeMockserverDataGenerator({ generatedDataCache: false });
        const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };

        await expect(
            provider.generate({
                contractVersion: 1,
                service: { urlPath: '/oversized', odataVersion: '4.0' },
                metadata: '€'.repeat(Math.floor(MAX_METADATA_INPUT_BYTES / 3) + 1),
                targets: [{ name: 'Rows', kind: 'entity-set' }],
                existingData: {},
                logger,
                signal: new AbortController().signal
            })
        ).rejects.toMatchObject({ code: 'METADATA_INPUT_TOO_LARGE' });

        expect(logger.warn).toHaveBeenCalledWith(
            `METADATA_INPUT_TOO_LARGE: Metadata input exceeds the ${MAX_METADATA_INPUT_BYTES}-byte limit ` +
                `(received ${MAX_METADATA_INPUT_BYTES + 1} bytes).`
        );
        expect(logger.debug).not.toHaveBeenCalled();
        expect(logger.info).not.toHaveBeenCalled();
    });

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

    it('uses only the launcher-prepared model cache when the app YAML has no model paths', async () => {
        process.env.SAP_UX_MOCKGEN_MODEL_MANIFEST = '/managed/model-manifest.json';
        process.env.SAP_UX_MOCKGEN_MODEL_CACHE = '/managed/model-cache';
        const loadRuntime = jest.fn(async (): Promise<LearnedRuntimeHandle> => ({
            runtime: {},
            diagnostics: [],
            dispose: async () => undefined
        }));
        const generateService = jest.fn(async () => ({
            resources: { Records: [{ ID: 1 }] },
            diagnostics: [],
            capabilities: {
                mode: 'deterministic' as const,
                classifier: 'unavailable' as const,
                sft: 'unavailable' as const
            },
            fingerprints: { request: 'a'.repeat(64) },
            statistics: {
                sft: { attempts: 0, parsedResponses: 0, eligibleSlots: 0, acceptedSlots: 0, assignments: [] }
            }
        }));
        const provider = new FeMockserverDataGenerator(
            { mode: 'learned', generatedDataCache: false },
            { generateService, loadRuntime }
        );

        await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/records', odataVersion: '4.0' },
            metadata: '<?xml version="1.0"?><edmx:Edmx />',
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        });

        expect(loadRuntime).toHaveBeenCalledWith(
            {
                manifestPath: '/managed/model-manifest.json',
                cacheDirectory: '/managed/model-cache',
                offline: true
            },
            expect.any(AbortSignal)
        );
    });

    it('gives launcher-prepared cache-only state precedence over legacy YAML model paths', async () => {
        process.env.SAP_UX_MOCKGEN_MODEL_MANIFEST = '/managed/model-manifest.json';
        process.env.SAP_UX_MOCKGEN_MODEL_CACHE = '/managed/model-cache';
        const loadRuntime = jest.fn(async (): Promise<LearnedRuntimeHandle> => ({
            runtime: {},
            diagnostics: [],
            dispose: async () => undefined
        }));
        const provider = new FeMockserverDataGenerator(
            {
                mode: 'learned',
                generatedDataCache: false,
                modelManifestPath: '/legacy/model-manifest.json',
                modelCacheDirectory: '/legacy/model-cache',
                modelOffline: false
            },
            {
                generateService: async () => ({
                    resources: { Records: [{ ID: 1 }] },
                    diagnostics: [],
                    capabilities: {
                        mode: 'deterministic' as const,
                        classifier: 'unavailable' as const,
                        sft: 'unavailable' as const
                    },
                    fingerprints: { request: 'a'.repeat(64) },
                    statistics: {
                        sft: {
                            attempts: 0,
                            parsedResponses: 0,
                            eligibleSlots: 0,
                            acceptedSlots: 0,
                            assignments: []
                        }
                    }
                }),
                loadRuntime
            }
        );

        await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/records', odataVersion: '4.0' },
            metadata: '<?xml version="1.0"?><edmx:Edmx />',
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        });

        expect(loadRuntime).toHaveBeenCalledWith(
            {
                manifestPath: '/managed/model-manifest.json',
                cacheDirectory: '/managed/model-cache',
                offline: true
            },
            expect.any(AbortSignal)
        );
    });

    it('suppresses legacy online YAML model paths after launcher acquisition fails', async () => {
        process.env.SAP_UX_MOCKGEN_MODEL_UNAVAILABLE = '1';
        const loadRuntime = jest.fn();
        const provider = new FeMockserverDataGenerator(
            {
                mode: 'learned',
                generatedDataCache: false,
                modelManifestPath: '/legacy/model-manifest.json',
                modelCacheDirectory: '/legacy/model-cache',
                modelOffline: false
            },
            { loadRuntime }
        );

        await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/records', odataVersion: '4.0' },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        });

        expect(loadRuntime).not.toHaveBeenCalled();
    });

    it('keeps host output narrow while delegating through the instrumentable production generator', async () => {
        const generateService = jest.fn(async () => ({
            resources: { Records: [{ ID: 1 }] },
            diagnostics: [],
            capabilities: {
                mode: 'deterministic' as const,
                classifier: 'unavailable' as const,
                sft: 'unavailable' as const
            },
            fingerprints: { request: 'a'.repeat(64) },
            statistics: {
                sft: { attempts: 0, parsedResponses: 0, eligibleSlots: 0, acceptedSlots: 0, assignments: [] }
            }
        }));
        const provider = new FeMockserverDataGenerator({ generatedDataCache: false }, { generateService });

        const result = await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/records', odataVersion: '4.0' },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer><EntityType Name="Record"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
            signal: new AbortController().signal
        });

        expect(generateService).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            resources: { Records: [{ ID: 1 }] },
            diagnostics: [],
            fingerprints: { request: 'a'.repeat(64) }
        });
        expect(result).not.toHaveProperty('capabilities');
        expect(result).not.toHaveProperty('statistics');
        await provider.dispose();
    });

    it('logs a privacy-safe support summary without metadata, values, or arbitrary fingerprints', async () => {
        const metadataCanary = 'TOP_SECRET_METADATA_SUMMARY_CANARY';
        const valueCanary = 'TOP_SECRET_GENERATED_VALUE_CANARY';
        const fingerprintCanary = 'TOP_SECRET_FINGERPRINT_CANARY';
        const generateService = jest.fn(async () => ({
            resources: { Records: [{ ID: 1, Opaque: valueCanary }] },
            diagnostics: [],
            capabilities: {
                mode: 'hybrid' as const,
                classifier: 'ready' as const,
                sft: 'ready' as const
            },
            fingerprints: {
                request: 'a'.repeat(64),
                classifier: fingerprintCanary,
                sft: 'b'.repeat(64)
            },
            statistics: {
                sft: {
                    attempts: 2,
                    parsedResponses: 1,
                    eligibleSlots: 4,
                    acceptedSlots: 3,
                    assignments: []
                }
            }
        }));
        const provider = new FeMockserverDataGenerator({ generatedDataCache: false }, { generateService });
        const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };

        await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/records', odataVersion: '4.0' },
            metadata: `<?xml version="1.0"?><metadata canary="${metadataCanary}" />`,
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {},
            logger,
            signal: new AbortController().signal
        });

        expect(logger.debug).toHaveBeenCalledWith(
            `MOCK_DATA_GENERATOR_SUMMARY: requestFingerprint=${'a'.repeat(
                64
            )} classifierFingerprint=invalid sftFingerprint=${'b'.repeat(
                64
            )} resources=1 rows=1 sftAttempts=2 sftParsedResponses=1 sftAcceptedSlots=3 sftEligibleSlots=4 sftShare=0.7500`
        );
        const supportLog = JSON.stringify(logger.debug.mock.calls);
        expect(supportLog).not.toContain(metadataCanary);
        expect(supportLog).not.toContain(valueCanary);
        expect(supportLog).not.toContain(fingerprintCanary);
        await provider.dispose();
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
        expect(first.diagnostics).toContainEqual(expect.objectContaining({ code: 'SFT_INFERENCE_TIMEOUT' }));
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
                ['MOCK_DATA_GENERATOR_CAPABILITIES: mode=hybrid classifier=ready sft=ready'],
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

    it('isolates promoted and rolled-back model fingerprints in the generated-data cache', async () => {
        const cacheRoot = await mkdtemp(join(tmpdir(), 'mockgen-provider-model-rollback-cache-'));
        const classifierA = 'a'.repeat(64);
        const sftA = 'b'.repeat(64);
        const classifierB = 'c'.repeat(64);
        const sftB = 'd'.repeat(64);
        const loadRuntimeA = jest.fn(async (): Promise<LearnedRuntimeHandle> => ({
            runtime: {
                classifier: {
                    fingerprint: classifierA,
                    classify: jest.fn(async () => ({ role: 'unknown', confidence: 0, source: 'classifier' }))
                },
                sft: {
                    fingerprint: sftA,
                    generate: jest.fn(async ({ rowCount }) => ({
                        rows: Array.from({ length: rowCount }, () => ({ OpaqueTitle: 'Model A title' }))
                    }))
                }
            },
            diagnostics: [],
            dispose: async () => undefined
        }));
        const loadRuntimeB = jest.fn(async (): Promise<LearnedRuntimeHandle> => ({
            runtime: {
                classifier: {
                    fingerprint: classifierB,
                    classify: jest.fn(async () => ({ role: 'unknown', confidence: 0, source: 'classifier' }))
                },
                sft: {
                    fingerprint: sftB,
                    generate: jest.fn(async ({ rowCount }) => ({
                        rows: Array.from({ length: rowCount }, () => ({ OpaqueTitle: 'Model B title' }))
                    }))
                }
            },
            diagnostics: [],
            dispose: async () => undefined
        }));
        const rollbackRuntime = jest.fn(async (): Promise<LearnedRuntimeHandle> => {
            throw new Error('The matching N-1 cache should avoid model initialization');
        });
        const options = {
            seed: 41,
            rowsPerEntity: 1,
            mode: 'learned' as const,
            modelManifestPath: '/channel/current/model-manifest.json',
            modelOffline: true,
            generatedDataCacheDirectory: cacheRoot
        };
        const context = {
            contractVersion: 1 as const,
            service: { urlPath: '/model-rollback', odataVersion: '4.0' as const },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Books" EntityType="Demo.Book" /></EntityContainer><EntityType Name="Book"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /><Property Name="OpaqueTitle" Type="Edm.String" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Books', kind: 'entity-set' as const }],
            existingData: {},
            logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn() }
        };
        const modelFingerprintsA = jest.fn(async () => ({ classifier: classifierA, sft: sftA }));
        const modelFingerprintsB = jest.fn(async () => ({ classifier: classifierB, sft: sftB }));
        const firstProvider = new FeMockserverDataGenerator(options, {
            loadRuntime: loadRuntimeA,
            modelFingerprints: modelFingerprintsA
        });
        const promotedProvider = new FeMockserverDataGenerator(options, {
            loadRuntime: loadRuntimeB,
            modelFingerprints: modelFingerprintsB
        });
        const rolledBackProvider = new FeMockserverDataGenerator(options, {
            loadRuntime: rollbackRuntime,
            modelFingerprints: modelFingerprintsA
        });

        try {
            const first = await firstProvider.generate({ ...context, signal: new AbortController().signal });
            await firstProvider.dispose();
            const promoted = await promotedProvider.generate({ ...context, signal: new AbortController().signal });
            await promotedProvider.dispose();
            const rolledBack = await rolledBackProvider.generate({ ...context, signal: new AbortController().signal });
            await rolledBackProvider.dispose();

            expect(first.resources.Books?.[0]?.OpaqueTitle).toBe('Model A title');
            expect(promoted.resources.Books?.[0]?.OpaqueTitle).toBe('Model B title');
            expect(promoted.diagnostics).not.toContainEqual(
                expect.objectContaining({ code: 'GENERATED_DATA_CACHE_HIT' })
            );
            expect(rolledBack.resources).toEqual(first.resources);
            expect(rolledBack.diagnostics).toContainEqual(
                expect.objectContaining({ code: 'GENERATED_DATA_CACHE_HIT' })
            );
            expect(loadRuntimeA).toHaveBeenCalledTimes(1);
            expect(loadRuntimeB).toHaveBeenCalledTimes(1);
            expect(rollbackRuntime).not.toHaveBeenCalled();
            expect((await readdir(cacheRoot)).filter((name) => name.endsWith('.json'))).toHaveLength(2);
        } finally {
            await firstProvider.dispose();
            await promotedProvider.dispose();
            await rolledBackProvider.dispose();
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

    it('keeps generated rows when generated-data cache publication fails', async () => {
        const readGeneratedDataCache = jest.fn(async () => undefined);
        const writeGeneratedDataCache = jest.fn(async () => Promise.reject(new Error('cache is read-only')));
        const provider = new FeMockserverDataGenerator(
            { rowsPerEntity: 1, generatedDataCacheDirectory: '/read-only/generated-cache' },
            { readGeneratedDataCache, writeGeneratedDataCache }
        );
        const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };

        const result = await provider.generate({
            contractVersion: 1,
            service: { urlPath: '/cache-write-failure', odataVersion: '4.0' },
            metadata: `<?xml version="1.0"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm"><EntityContainer Name="Container"><EntitySet Name="Rows" EntityType="Demo.Row" /></EntityContainer><EntityType Name="Row"><Key><PropertyRef Name="ID" /></Key><Property Name="ID" Type="Edm.Int32" Nullable="false" /></EntityType></Schema></edmx:DataServices></edmx:Edmx>`,
            targets: [{ name: 'Rows', kind: 'entity-set' }],
            existingData: {},
            logger,
            signal: new AbortController().signal
        });

        expect(result.resources.Rows).toEqual([{ ID: 1 }]);
        expect(result.diagnostics).toContainEqual(
            expect.objectContaining({ code: 'GENERATED_DATA_CACHE_WRITE_FAILED', severity: 'warning' })
        );
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('GENERATED_DATA_CACHE_WRITE_FAILED'));
        expect(writeGeneratedDataCache).toHaveBeenCalledTimes(1);
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
            fingerprints: { request: key },
            statistics: {
                sft: {
                    attempts: 0,
                    parsedResponses: 0,
                    eligibleSlots: 0,
                    acceptedSlots: 0,
                    assignments: []
                }
            }
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
