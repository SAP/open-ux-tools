/* eslint-disable jsdoc/require-jsdoc, @typescript-eslint/explicit-function-return-type */
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface ProviderResult {
    resources: Readonly<Record<string, ReadonlyArray<Readonly<Record<string, unknown>>>>>;
    diagnostics: ReadonlyArray<Readonly<{ code: string; severity: string; message: string; target?: string }>>;
}

interface LearnedRuntimeHandle {
    runtime: Readonly<{
        sft?: Readonly<{
            fingerprint: string;
            generate(input: Readonly<{ rowCount: number }>): Promise<Readonly<{ rows: ReadonlyArray<object> }>>;
        }>;
    }>;
    diagnostics: ReadonlyArray<Readonly<{ code: string; componentId?: string; message: string }>>;
    dispose(): Promise<void>;
}

interface ProviderInstance {
    generate(context: ReturnType<typeof hostContext>['context']): Promise<ProviderResult>;
    dispose(): Promise<void>;
}

interface ProviderConstructor {
    new (
        options?: Readonly<Record<string, unknown>>,
        dependencies?: Readonly<{ loadRuntime?: () => Promise<LearnedRuntimeHandle> }>
    ): ProviderInstance;
}

const require = createRequire(import.meta.url);
const FeMockserverDataGenerator =
    require('../../../../../packages/mockserver-data-generator/dist/fe-mockserver.cjs') as ProviderConstructor;

const metadataCanary = 'TOP_SECRET_METADATA_CANARY';
const failureCanary = 'TOP_SECRET_RUNTIME_FAILURE_CANARY';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer>
            <EntityType Name="Record">
                <Key><PropertyRef Name="ID" /></Key>
                <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                <Property Name="Opaque" Type="Edm.String" Nullable="false">
                    <Annotation Term="Common.Label" String="${metadataCanary}" />
                </Property>
            </EntityType>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

function hostContext() {
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn() };
    return {
        logger,
        context: {
            contractVersion: 1 as const,
            service: { urlPath: '/records', odataVersion: '4.0' as const },
            metadata,
            targets: [{ name: 'Records', kind: 'entity-set' as const }],
            existingData: {},
            logger,
            signal: new AbortController().signal
        }
    };
}

function supportSurface(result: ProviderResult, logger: ReturnType<typeof hostContext>['logger']): string {
    return JSON.stringify({
        diagnostics: result.diagnostics,
        debug: logger.debug.mock.calls,
        info: logger.info.mock.calls,
        warn: logger.warn.mock.calls
    });
}

describe('FE provider degradation behavior', () => {
    const originalActivation = process.env.SAP_UX_MOCKGEN_ENABLED;

    beforeEach(() => {
        process.env.SAP_UX_MOCKGEN_ENABLED = '1';
    });

    afterAll(() => {
        if (originalActivation === undefined) {
            delete process.env.SAP_UX_MOCKGEN_ENABLED;
        } else {
            process.env.SAP_UX_MOCKGEN_ENABLED = originalActivation;
        }
    });

    test('serves deterministic rows on offline first use without network access or sensitive diagnostics', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-offline-first-use-'));
        const manifestPath = join(root, 'manifest.json');
        const modelCacheDirectory = join(root, 'cache');
        await writeFile(
            manifestPath,
            JSON.stringify({
                formatVersion: 1,
                bundleId: 'offline-first-use',
                revision: '1'.repeat(40),
                lifecycle: 'development',
                components: [
                    {
                        id: 'classifier',
                        kind: 'classifier',
                        version: '1.0.0',
                        fingerprint: 'a'.repeat(64),
                        files: [
                            {
                                role: 'encoder',
                                path: 'classifier/model.onnx',
                                bytes: 1,
                                sha256: 'b'.repeat(64),
                                url: 'https://models.example.invalid/classifier/model.onnx'
                            }
                        ],
                        runtime: {
                            backend: 'onnx',
                            package: 'onnxruntime-node',
                            version: '1.24.3',
                            inputs: ['input_ids'],
                            outputs: ['last_hidden_state'],
                            outputFormat: 'embedding-classifier-v2'
                        },
                        license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                        modelCardUrl: 'https://example.invalid/model-card'
                    }
                ]
            })
        );
        const originalFetch = globalThis.fetch;
        const fetch = jest.fn(async () => Promise.reject(new Error('offline test must not use the network')));
        globalThis.fetch = fetch as unknown as typeof globalThis.fetch;
        const provider = new FeMockserverDataGenerator({
            mode: 'learned',
            rowsPerEntity: 1,
            modelManifestPath: manifestPath,
            modelCacheDirectory,
            modelOffline: true,
            generatedDataCache: false
        });
        const { context, logger } = hostContext();

        try {
            const result = await provider.generate(context);

            expect(result.resources.Records).toEqual([{ ID: 1, Opaque: 'Opaque 1' }]);
            expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'MODEL_CACHE_UNAVAILABLE' }));
            expect(fetch).not.toHaveBeenCalled();
            expect(supportSurface(result, logger)).not.toContain(metadataCanary);
            expect(supportSurface(result, logger)).not.toContain('Opaque 1');
        } finally {
            globalThis.fetch = originalFetch;
            await provider.dispose();
            await rm(root, { recursive: true, force: true });
        }
    });

    test('keeps a failed runtime attempt open for one provider and retries on a fresh provider lifecycle', async () => {
        let attempts = 0;
        const learnedRuntime: LearnedRuntimeHandle['runtime'] = {
            sft: {
                fingerprint: 'c'.repeat(64),
                generate: async ({ rowCount }) => ({
                    rows: Array.from({ length: rowCount }, () => ({ Opaque: 'Recovered learned value' }))
                })
            }
        };
        const loadRuntime = jest.fn(async () => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error(`${failureCanary}: /private/model/path`);
            }
            return {
                runtime: learnedRuntime,
                diagnostics: [],
                dispose: async () => undefined
            };
        });
        const options = {
            mode: 'learned',
            rowsPerEntity: 1,
            modelManifestPath: '/verified/manifest.json',
            modelOffline: true,
            generatedDataCache: false
        } as const;
        const firstProvider = new FeMockserverDataGenerator(options, { loadRuntime });
        const firstHost = hostContext();

        const first = await firstProvider.generate(firstHost.context);
        const repeated = await firstProvider.generate(firstHost.context);

        expect(first.resources.Records).toEqual([{ ID: 1, Opaque: 'Opaque 1' }]);
        expect(repeated.resources.Records).toEqual(first.resources.Records);
        expect(loadRuntime).toHaveBeenCalledTimes(1);
        expect(first.diagnostics).toContainEqual(expect.objectContaining({ code: 'MODEL_CACHE_UNAVAILABLE' }));
        expect(supportSurface(first, firstHost.logger)).not.toContain(failureCanary);
        expect(supportSurface(first, firstHost.logger)).not.toContain('/private/model/path');
        await firstProvider.dispose();

        const nextProvider = new FeMockserverDataGenerator(options, { loadRuntime });
        const nextHost = hostContext();
        try {
            const recovered = await nextProvider.generate(nextHost.context);

            expect(recovered.resources.Records?.[0]?.Opaque).toBe('Recovered learned value');
            expect(loadRuntime).toHaveBeenCalledTimes(2);
        } finally {
            await nextProvider.dispose();
        }
    });

    test('surfaces a stable optional-runtime diagnostic while lower tiers fill every required field', async () => {
        const provider = new FeMockserverDataGenerator(
            {
                mode: 'learned',
                rowsPerEntity: 1,
                modelManifestPath: '/verified/manifest.json',
                modelOffline: true,
                generatedDataCache: false
            },
            {
                loadRuntime: async () => ({
                    runtime: {},
                    diagnostics: [
                        {
                            code: 'CLASSIFIER_RUNTIME_UNAVAILABLE',
                            componentId: 'classifier',
                            message: 'The classifier runtime is unavailable; lower tiers remain active.'
                        }
                    ],
                    dispose: async () => undefined
                })
            }
        );
        const { context, logger } = hostContext();

        try {
            const result = await provider.generate(context);

            expect(result.resources.Records).toEqual([{ ID: 1, Opaque: 'Opaque 1' }]);
            expect(result.diagnostics).toContainEqual(
                expect.objectContaining({ code: 'CLASSIFIER_RUNTIME_UNAVAILABLE', target: 'classifier' })
            );
            expect(Object.values(result.resources.Records?.[0] ?? {})).not.toContain(undefined);
            expect(supportSurface(result, logger)).not.toContain(metadataCanary);
            expect(supportSurface(result, logger)).not.toContain('Opaque 1');
        } finally {
            await provider.dispose();
        }
    });
});
