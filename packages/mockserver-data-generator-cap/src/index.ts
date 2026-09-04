import { readFile } from 'node:fs/promises';
import type { MockDataGeneratorRuntime } from '@sap-ux/mockserver-data-generator';
import { resolveCapConfiguration, type CapGeneratorConfiguration } from './config.js';
import { seedCapDatabase, type CapDatabase, type CapQueryLanguage } from './seed.js';

interface CapLogger {
    info(message: string): void;
    warn(message: string): void;
}

interface CdsFacade {
    env?: unknown;
    model?: unknown;
    db?: CapDatabase;
    ql?: CapQueryLanguage;
    on(event: 'served', handler: () => Promise<void>): unknown;
    log?(component: string): CapLogger;
}

interface PluginDependencies {
    seed?(cds: CdsFacade, configuration: Extract<CapGeneratorConfiguration, { enabled: true }>): Promise<void>;
}

function logger(cds: CdsFacade): CapLogger {
    return (
        cds.log?.('mockserver-data-generator') ??
        Object.freeze({
            info: (_message: string) => undefined,
            warn: (_message: string) => undefined
        })
    );
}

async function runtime(
    configuration: Extract<CapGeneratorConfiguration, { enabled: true }>,
    log: CapLogger,
    signal: AbortSignal
): Promise<{ runtime: MockDataGeneratorRuntime; dispose(): Promise<void> }> {
    if (!configuration.model || configuration.generation.mode === 'deterministic') {
        return { runtime: Object.freeze({}), dispose: async () => undefined };
    }
    try {
        const generator = await import('@sap-ux/mockserver-data-generator');
        signal.throwIfAborted();
        const manifest = generator.parseModelManifest(
            JSON.parse(await readFile(configuration.model.manifestPath, 'utf8'))
        );
        const cacheDirectory = configuration.model.cacheDirectory ?? generator.defaultModelCacheRoot();
        const cache = configuration.model.offline
            ? await generator.verifyModelCache(cacheDirectory, manifest)
            : await generator.prepareModelCache(cacheDirectory, manifest, { signal });
        const handle = await generator.createLearnedRuntime(manifest, cache);
        handle.diagnostics.forEach((diagnostic) => log.warn(`${diagnostic.code}: ${diagnostic.message}`));
        return { runtime: handle.runtime, dispose: handle.dispose };
    } catch {
        log.warn('Learned CAP model initialization failed; deterministic generation remains available.');
        return { runtime: Object.freeze({}), dispose: async () => undefined };
    }
}

async function seedFromCds(
    cds: CdsFacade,
    configuration: Extract<CapGeneratorConfiguration, { enabled: true }>
): Promise<void> {
    if (!cds.model || !cds.db || !cds.ql) {
        throw new Error('CAP model, database, and query language must be available after served');
    }
    const log = logger(cds);
    const timeout = AbortSignal.timeout(60_000);
    const generator = await import('@sap-ux/mockserver-data-generator');
    const learned = await runtime(configuration, log, timeout);
    try {
        const result = await seedCapDatabase({
            csn: cds.model,
            database: cds.db,
            queryLanguage: cds.ql,
            generate: generator.generateService,
            options: configuration.generation,
            runtime: learned.runtime,
            signal: timeout
        });
        log.info(
            `Mock data generator seeded ${result.inserted.length} missing CAP entities and preserved ${result.preserved.length}.`
        );
    } finally {
        await learned.dispose();
    }
}

/**
 * Register the opt-in native CAP plugin on the awaited served lifecycle.
 *
 * @param cds CAP facade.
 * @param dependencies Test-only dependency injection.
 */
export function registerCapPlugin(cds: CdsFacade, dependencies: PluginDependencies = {}): void {
    cds.on('served', async () => {
        const configuration = resolveCapConfiguration(cds.env);
        if (!configuration.enabled) {
            return;
        }
        try {
            await (dependencies.seed ?? seedFromCds)(cds, configuration);
        } catch {
            logger(cds).warn('CAP seeding failed; deterministic generation remains available through normal CAP data.');
        }
    });
}

export { resolveCapConfiguration, seedCapDatabase };
export type { CapGeneratorConfiguration, CapModelConfiguration } from './config.js';
export type {
    CapDatabase,
    CapQueryLanguage,
    CapSeedResult,
    CapTransaction,
    GenerateService,
    SeedCapDatabaseOptions
} from './seed.js';
