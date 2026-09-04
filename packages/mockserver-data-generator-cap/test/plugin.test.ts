import { registerCapPlugin } from '../src/index.js';

function emptyProductDatabase(
    mockserverDataGenerator: Record<string, unknown>,
    log: { info: jest.Mock; warn: jest.Mock }
) {
    let served: (() => Promise<void>) | undefined;
    const transaction = {
        run: jest.fn(async (query: { kind: string }) => (query.kind === 'select' ? [] : undefined))
    };
    const cds = {
        env: { profiles: ['test'], mockserverDataGenerator: { enabled: true, ...mockserverDataGenerator } },
        model: {
            definitions: {
                'demo.Product': {
                    kind: 'entity',
                    elements: { ID: { key: true, type: 'cds.UUID', notNull: true } }
                }
            }
        },
        db: { tx: jest.fn(async (handler: (tx: typeof transaction) => Promise<void>) => handler(transaction)) },
        ql: {
            SELECT: {
                from: () => ({
                    columns() {
                        return this;
                    },
                    limit: () => ({ kind: 'select' })
                })
            },
            INSERT: { into: () => ({ entries: () => ({ kind: 'insert' }) }) }
        },
        log: () => log,
        on: jest.fn((_event: string, handler: () => Promise<void>) => {
            served = handler;
        })
    };
    return {
        cds,
        transaction,
        serve: async (): Promise<void> => {
            await served?.();
        }
    };
}

describe('native CAP plugin lifecycle', () => {
    test('awaits seeding on served and degrades without blocking CAP startup', async () => {
        let served: (() => Promise<void>) | undefined;
        const warn = jest.fn();
        const cds = {
            env: { profiles: ['development'], mockserverDataGenerator: { enabled: true } },
            model: { definitions: {} },
            db: {},
            ql: {},
            log: () => ({ info: jest.fn(), warn }),
            on: jest.fn((event: string, handler: () => Promise<void>) => {
                if (event === 'served') {
                    served = handler;
                }
            })
        };
        const seed = jest.fn(async () => {
            throw new Error('database unavailable');
        });

        registerCapPlugin(cds, { seed });
        await expect(served?.()).resolves.toBeUndefined();

        expect(seed).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(expect.stringMatching(/deterministic generation remains available/i));
    });

    test('does no work when the opt-in is absent', async () => {
        let served: (() => Promise<void>) | undefined;
        const cds = {
            env: { profiles: ['development'] },
            on: jest.fn((_event: string, handler: () => Promise<void>) => {
                served = handler;
            })
        };
        const seed = jest.fn();

        registerCapPlugin(cds, { seed });
        await served?.();

        expect(seed).not.toHaveBeenCalled();
    });

    test('publishes a cold learned snapshot with a fresh generation budget and disposes the runtime', async () => {
        let served: (() => Promise<void>) | undefined;
        const scanSignal = new AbortController().signal;
        const learnedSignal = new AbortController().signal;
        const generationSignal = new AbortController().signal;
        const signals = [scanSignal, learnedSignal, generationSignal];
        const createSignal = jest.fn((_timeoutMs: number): AbortSignal => signals.shift() ?? generationSignal);
        const transaction = {
            run: jest.fn(async (query: { kind: string }) => (query.kind === 'select' ? [] : undefined))
        };
        const learnedRuntime = {
            classifier: { fingerprint: 'classifier', classify: jest.fn() },
            sft: { fingerprint: 'sft', generate: jest.fn() }
        };
        const dispose = jest.fn(async () => undefined);
        const createRuntime = jest.fn(async () => ({ runtime: learnedRuntime, dispose }));
        let cacheKey = '';
        const readGeneratedDataCache = jest.fn(async (_directory: string, key: string) => {
            cacheKey = key;
            return undefined;
        });
        const writeGeneratedDataCache = jest.fn(async () => undefined);
        const generate = jest.fn(async () => ({
            resources: { Product: [{ ID: 'product-1', Name: 'Treasury Monitor' }] },
            diagnostics: [],
            capabilities: { mode: 'hybrid', classifier: 'ready', sft: 'ready' },
            fingerprints: { request: cacheKey, classifier: 'classifier', sft: 'sft' }
        }));
        const cds = {
            env: {
                profiles: ['development'],
                mockserverDataGenerator: {
                    enabled: true,
                    mode: 'learned',
                    modelManifestPath: '/models/manifest.json',
                    generatedDataCacheDirectory: '/generated-cache'
                }
            },
            model: {
                definitions: {
                    'demo.Product': {
                        kind: 'entity',
                        elements: {
                            ID: { key: true, type: 'cds.UUID', notNull: true },
                            Name: { type: 'cds.String' }
                        }
                    }
                }
            },
            db: { tx: jest.fn(async (handler: (tx: typeof transaction) => Promise<void>) => handler(transaction)) },
            ql: {
                SELECT: {
                    from: () => ({
                        columns() {
                            return this;
                        },
                        limit: () => ({ kind: 'select' })
                    })
                },
                INSERT: {
                    into: () => ({ entries: () => ({ kind: 'insert' }) })
                }
            },
            log: () => ({ info: jest.fn(), warn: jest.fn() }),
            on: jest.fn((_event: string, handler: () => Promise<void>) => {
                served = handler;
            })
        };

        registerCapPlugin(cds, {
            createRuntime,
            createSignal,
            generate,
            modelFingerprints: jest.fn(async () => ({ classifier: 'classifier', sft: 'sft' })),
            readGeneratedDataCache,
            writeGeneratedDataCache
        });
        await served?.();

        expect(createSignal.mock.calls).toEqual([[60_000], [30_000], [60_000]]);
        expect(createRuntime).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), learnedSignal);
        expect(generate).toHaveBeenCalledWith(
            expect.objectContaining({
                targets: [{ name: 'Product', kind: 'entity-set' }],
                signal: generationSignal
            }),
            expect.objectContaining({ mode: 'learned' }),
            learnedRuntime
        );
        expect(writeGeneratedDataCache).toHaveBeenCalledWith('/generated-cache', cacheKey, expect.any(Object));
        expect(dispose).toHaveBeenCalledTimes(1);
    });

    test('reuses a verified generated-data cache entry without loading the classifier or SFT', async () => {
        let served: (() => Promise<void>) | undefined;
        const transaction = {
            run: jest.fn(async (query: { kind: string }) => (query.kind === 'select' ? [] : undefined))
        };
        const cached = {
            resources: { Product: [{ ID: 'cached-product', Name: 'Cached Treasury Monitor' }] },
            diagnostics: [],
            capabilities: { mode: 'hybrid' as const, classifier: 'ready' as const, sft: 'ready' as const },
            fingerprints: { request: 'a'.repeat(64), classifier: 'classifier', sft: 'sft' }
        };
        const readGeneratedDataCache = jest.fn(async () => cached);
        const createRuntime = jest.fn();
        const generate = jest.fn();
        const info = jest.fn();
        const cds = {
            env: {
                profiles: ['development'],
                mockserverDataGenerator: {
                    enabled: true,
                    mode: 'learned',
                    modelManifestPath: '/models/manifest.json',
                    generatedDataCacheDirectory: '/generated-cache'
                }
            },
            model: {
                definitions: {
                    'demo.Product': {
                        kind: 'entity',
                        elements: {
                            ID: { key: true, type: 'cds.UUID', notNull: true },
                            Name: { type: 'cds.String' }
                        }
                    }
                }
            },
            db: { tx: jest.fn(async (handler: (tx: typeof transaction) => Promise<void>) => handler(transaction)) },
            ql: {
                SELECT: {
                    from: () => ({
                        columns() {
                            return this;
                        },
                        limit: () => ({ kind: 'select' })
                    })
                },
                INSERT: { into: () => ({ entries: () => ({ kind: 'insert' }) }) }
            },
            log: () => ({ info, warn: jest.fn() }),
            on: jest.fn((_event: string, handler: () => Promise<void>) => {
                served = handler;
            })
        };

        registerCapPlugin(cds, {
            createRuntime,
            generate,
            modelFingerprints: jest.fn(async () => ({ classifier: 'classifier', sft: 'sft' })),
            readGeneratedDataCache
        });
        await served?.();

        expect(readGeneratedDataCache).toHaveBeenCalledWith(
            '/generated-cache',
            expect.stringMatching(/^[a-f0-9]{64}$/),
            expect.objectContaining({ validate: expect.any(Function) })
        );
        expect(createRuntime).not.toHaveBeenCalled();
        expect(generate).not.toHaveBeenCalled();
        expect(transaction.run).toHaveBeenCalledWith(expect.objectContaining({ kind: 'insert' }));
        expect(info).toHaveBeenCalledWith(expect.stringMatching(/GENERATED_DATA_CACHE_HIT/));
    });

    test('continues generation when the generated-data cache lookup fails', async () => {
        const log = { info: jest.fn(), warn: jest.fn() };
        const fixture = emptyProductDatabase({ generatedDataCacheDirectory: '/generated-cache' }, log);
        const generate = jest.fn(async () => ({
            resources: { Product: [{ ID: 'fallback-product' }] },
            diagnostics: [],
            capabilities: {
                mode: 'deterministic' as const,
                classifier: 'unavailable' as const,
                sft: 'unavailable' as const
            },
            fingerprints: { request: 'request' }
        }));

        registerCapPlugin(fixture.cds, {
            generate,
            readGeneratedDataCache: jest.fn(async () => Promise.reject(new Error('cache unavailable')))
        });
        await fixture.serve();

        expect(generate).toHaveBeenCalledTimes(1);
        expect(fixture.transaction.run).toHaveBeenCalledWith(expect.objectContaining({ kind: 'insert' }));
        expect(log.warn).toHaveBeenCalledWith(expect.stringMatching(/GENERATED_DATA_CACHE_UNAVAILABLE/));
    });

    test('keeps generated rows when generated-data cache publication fails', async () => {
        const log = { info: jest.fn(), warn: jest.fn() };
        const fixture = emptyProductDatabase({ generatedDataCacheDirectory: '/generated-cache' }, log);
        let cacheKey = '';
        const generate = jest.fn(async () => ({
            resources: { Product: [{ ID: 'uncached-product' }] },
            diagnostics: [],
            capabilities: {
                mode: 'deterministic' as const,
                classifier: 'unavailable' as const,
                sft: 'unavailable' as const
            },
            fingerprints: { request: cacheKey }
        }));

        registerCapPlugin(fixture.cds, {
            generate,
            readGeneratedDataCache: jest.fn(async (_directory: string, key: string) => {
                cacheKey = key;
                return undefined;
            }),
            writeGeneratedDataCache: jest.fn(async () => Promise.reject(new Error('cache is read-only')))
        });
        await fixture.serve();

        expect(generate).toHaveBeenCalledTimes(1);
        expect(fixture.transaction.run).toHaveBeenCalledWith(expect.objectContaining({ kind: 'insert' }));
        expect(log.warn).toHaveBeenCalledWith(expect.stringMatching(/GENERATED_DATA_CACHE_WRITE_FAILED/));
    });

    test('continues with deterministic CAP generation when learned model initialization fails', async () => {
        let served: (() => Promise<void>) | undefined;
        const warn = jest.fn();
        const transaction = {
            run: jest.fn(async (query: { kind: string }) => (query.kind === 'select' ? [] : undefined))
        };
        const generate = jest.fn(async () => ({
            resources: { Product: [{ ID: 'product-1' }] },
            diagnostics: [],
            capabilities: { mode: 'deterministic', classifier: 'unavailable', sft: 'unavailable' },
            fingerprints: { request: 'request' }
        }));
        const cds = {
            env: {
                profiles: ['test'],
                mockserverDataGenerator: {
                    enabled: true,
                    mode: 'learned',
                    modelManifestPath: '/models/does-not-exist.json',
                    modelOffline: true
                }
            },
            model: {
                definitions: {
                    'demo.Product': {
                        kind: 'entity',
                        elements: { ID: { key: true, type: 'cds.UUID', notNull: true } }
                    }
                }
            },
            db: { tx: jest.fn(async (handler: (tx: typeof transaction) => Promise<void>) => handler(transaction)) },
            ql: {
                SELECT: {
                    from: () => ({
                        columns() {
                            return this;
                        },
                        limit: () => ({ kind: 'select' })
                    })
                },
                INSERT: { into: () => ({ entries: () => ({ kind: 'insert' }) }) }
            },
            log: () => ({ info: jest.fn(), warn }),
            on: jest.fn((_event: string, handler: () => Promise<void>) => {
                served = handler;
            })
        };

        registerCapPlugin(cds, { generate });
        await served?.();

        expect(generate).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ mode: 'learned' }), {});
        expect(transaction.run).toHaveBeenCalledWith(expect.objectContaining({ kind: 'insert' }));
        expect(warn).toHaveBeenCalledWith(expect.stringMatching(/initialization failed/i));
    });
});
