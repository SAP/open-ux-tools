import { registerCapPlugin } from '../src/index.js';

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

    test('passes the learned classifier and SFT runtime through shared CAP generation and disposes it', async () => {
        let served: (() => Promise<void>) | undefined;
        const transaction = {
            run: jest.fn(async (query: { kind: string }) => (query.kind === 'select' ? [] : undefined))
        };
        const learnedRuntime = {
            classifier: { fingerprint: 'classifier', classify: jest.fn() },
            sft: { fingerprint: 'sft', generate: jest.fn() }
        };
        const dispose = jest.fn(async () => undefined);
        const createRuntime = jest.fn(async () => ({ runtime: learnedRuntime, dispose }));
        const generate = jest.fn(async () => ({
            resources: { Product: [{ ID: 'product-1', Name: 'Treasury Monitor' }] },
            diagnostics: [],
            capabilities: { mode: 'hybrid', classifier: 'ready', sft: 'ready' },
            fingerprints: { request: 'request', classifier: 'classifier', sft: 'sft' }
        }));
        const cds = {
            env: {
                profiles: ['development'],
                mockserverDataGenerator: {
                    enabled: true,
                    mode: 'learned',
                    modelManifestPath: '/models/manifest.json'
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

        registerCapPlugin(cds, { createRuntime, generate });
        await served?.();

        expect(createRuntime).toHaveBeenCalledTimes(1);
        expect(generate).toHaveBeenCalledWith(
            expect.objectContaining({ targets: [{ name: 'Product', kind: 'entity-set' }] }),
            expect.objectContaining({ mode: 'learned' }),
            learnedRuntime
        );
        expect(dispose).toHaveBeenCalledTimes(1);
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
