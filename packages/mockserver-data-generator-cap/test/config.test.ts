import { resolveCapConfiguration } from '../src/config.js';

describe('native CAP generator configuration', () => {
    test('is disabled unless explicitly enabled in development or test', () => {
        expect(resolveCapConfiguration({ profiles: ['development'] })).toEqual({ enabled: false });
        expect(
            resolveCapConfiguration({
                profiles: ['production'],
                mockserverDataGenerator: { enabled: true, rowsPerEntity: 8 }
            })
        ).toEqual({ enabled: false });
        expect(
            resolveCapConfiguration({
                profiles: ['production', 'development'],
                mockserverDataGenerator: { enabled: true, rowsPerEntity: 8 }
            })
        ).toEqual({ enabled: false });
    });

    test('accepts bounded generation and model options in a development profile', () => {
        expect(
            resolveCapConfiguration({
                profiles: ['development'],
                mockserverDataGenerator: {
                    enabled: true,
                    rowsPerEntity: 8,
                    seed: 42,
                    sftTimeoutMs: 25_000,
                    locale: 'en',
                    mode: 'learned',
                    modelManifestPath: '/models/manifest.json',
                    modelCacheDirectory: '/models/cache',
                    modelOffline: true
                }
            })
        ).toEqual({
            enabled: true,
            generation: { rowsPerEntity: 8, seed: 42, sftTimeoutMs: 25_000, locale: 'en', mode: 'learned' },
            model: {
                manifestPath: '/models/manifest.json',
                cacheDirectory: '/models/cache',
                offline: true
            }
        });
    });

    test('rejects unsafe row counts and unknown modes', () => {
        expect(() =>
            resolveCapConfiguration({
                profiles: ['test'],
                mockserverDataGenerator: { enabled: true, rowsPerEntity: 1001 }
            })
        ).toThrow(/rowsPerEntity/i);
        expect(() =>
            resolveCapConfiguration({
                profiles: ['test'],
                mockserverDataGenerator: { enabled: true, mode: 'unbounded' }
            })
        ).toThrow(/mode/i);
        expect(() =>
            resolveCapConfiguration({
                profiles: ['test'],
                mockserverDataGenerator: { enabled: true, sftTimeoutMs: 0 }
            })
        ).toThrow(/sftTimeoutMs/i);
    });
});
