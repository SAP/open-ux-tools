import { readFile } from 'node:fs/promises';
import type {
    MockDataGeneratorFingerprints,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime
} from '@sap-ux/mockserver-data-generator';
import { resolveCapConfiguration, type CapGeneratorConfiguration } from './config.js';
import { seedCapDatabase, type CapDatabase, type CapQueryLanguage, type GenerateService } from './seed.js';

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
    createRuntime?(
        configuration: Extract<CapGeneratorConfiguration, { enabled: true }>,
        log: CapLogger,
        signal: AbortSignal
    ): Promise<{ runtime: MockDataGeneratorRuntime; dispose(): Promise<void> }>;
    createSignal?(timeoutMs: number): AbortSignal;
    generate?: GenerateService;
    modelFingerprints?(
        configuration: Extract<CapGeneratorConfiguration, { enabled: true }>,
        signal: AbortSignal
    ): Promise<Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft'>>;
    readGeneratedDataCache?(
        directory: string,
        key: string,
        options: Readonly<{ validate(result: MockDataGeneratorResult): void }>
    ): Promise<MockDataGeneratorResult | undefined>;
    writeGeneratedDataCache?(directory: string, key: string, result: MockDataGeneratorResult): Promise<void>;
}

const LEARNED_SETUP_TIMEOUT_MS = 30_000;
const GENERATION_TIMEOUT_MS = 60_000;

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

async function modelFingerprints(
    configuration: Extract<CapGeneratorConfiguration, { enabled: true }>,
    signal: AbortSignal
): Promise<Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft'>> {
    if (!configuration.model || configuration.generation.mode === 'deterministic') {
        return Object.freeze({});
    }
    const generator = await import('@sap-ux/mockserver-data-generator');
    signal.throwIfAborted();
    const manifest = generator.parseModelManifest(JSON.parse(await readFile(configuration.model.manifestPath, 'utf8')));
    return Object.freeze(
        Object.fromEntries(manifest.components.map((component) => [component.kind, component.fingerprint]))
    );
}

async function seedFromCds(
    cds: CdsFacade,
    configuration: Extract<CapGeneratorConfiguration, { enabled: true }>,
    dependencies: PluginDependencies
): Promise<void> {
    if (!cds.model || !cds.db || !cds.ql) {
        throw new Error('CAP model, database, and query language must be available after served');
    }
    const log = logger(cds);
    const createSignal =
        dependencies.createSignal ?? ((timeoutMs: number): AbortSignal => AbortSignal.timeout(timeoutMs));
    const generator = await import('@sap-ux/mockserver-data-generator');
    const generate = dependencies.generate ?? generator.generateService;
    let learned: Awaited<ReturnType<typeof runtime>> | undefined;
    const generateForCap: GenerateService = async (request, options) => {
        let cacheTarget: Readonly<{ directory: string; key: string }> | undefined;
        if (configuration.generatedDataCache) {
            try {
                const fingerprints = await (dependencies.modelFingerprints ?? modelFingerprints)(
                    configuration,
                    request.signal ?? new AbortController().signal
                );
                const directory =
                    configuration.generatedDataCache.directory ?? generator.defaultGeneratedDataCacheRoot();
                const key = generator.createGenerationFingerprint(request, options, fingerprints);
                const cached = await (dependencies.readGeneratedDataCache ?? generator.readGeneratedDataCache)(
                    directory,
                    key,
                    { validate: (result) => generator.validateGeneratedResult(request, result) }
                );
                if (cached) {
                    log.info('GENERATED_DATA_CACHE_HIT: reused a verified native CAP generated snapshot.');
                    return cached;
                }
                log.info('GENERATED_DATA_CACHE_MISS: no verified native CAP generated snapshot was found.');
                cacheTarget = Object.freeze({ directory, key });
            } catch {
                log.warn('GENERATED_DATA_CACHE_UNAVAILABLE: native CAP generation continues without caching.');
            }
        }

        if (!learned) {
            const learnedSignal = createSignal(LEARNED_SETUP_TIMEOUT_MS);
            learned = await (dependencies.createRuntime ?? runtime)(configuration, log, learnedSignal);
        }
        const generationSignal = createSignal(GENERATION_TIMEOUT_MS);
        const result = await generate({ ...request, signal: generationSignal }, options, learned.runtime);
        if (result.fingerprints.request === cacheTarget?.key) {
            try {
                await (dependencies.writeGeneratedDataCache ?? generator.writeGeneratedDataCache)(
                    cacheTarget.directory,
                    cacheTarget.key,
                    result
                );
            } catch {
                log.warn('GENERATED_DATA_CACHE_WRITE_FAILED: native CAP generation continues without publication.');
            }
        }
        return result;
    };
    try {
        const scanSignal = createSignal(GENERATION_TIMEOUT_MS);
        const result = await seedCapDatabase({
            csn: cds.model,
            database: cds.db,
            queryLanguage: cds.ql,
            generate: generateForCap,
            options: configuration.generation,
            runtime: Object.freeze({}),
            signal: scanSignal
        });
        log.info(
            `Mock data generator seeded ${result.inserted.length} missing CAP entities and preserved ${result.preserved.length}.`
        );
    } finally {
        await learned?.dispose();
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
            const seed =
                dependencies.seed ?? ((facade, config): Promise<void> => seedFromCds(facade, config, dependencies));
            await seed(cds, configuration);
        } catch (error) {
            if (
                error !== null &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'METADATA_INPUT_TOO_LARGE'
            ) {
                logger(cds).warn(
                    'METADATA_INPUT_TOO_LARGE: CAP metadata exceeds the 32 MiB input ceiling; normal CAP data remains active.'
                );
            } else if (
                error !== null &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'GENERATED_RESULT_TOO_LARGE'
            ) {
                logger(cds).warn(
                    'GENERATED_RESULT_TOO_LARGE: generated CAP data exceeds the 64 MiB output ceiling; normal CAP data remains active.'
                );
            } else {
                logger(cds).warn(
                    'CAP seeding failed; deterministic generation remains available through normal CAP data.'
                );
            }
        }
    });
}

export { resolveCapConfiguration, seedCapDatabase };
export type { CapGeneratedDataCacheConfiguration, CapGeneratorConfiguration, CapModelConfiguration } from './config.js';
export type {
    CapDatabase,
    CapQueryLanguage,
    CapSeedResult,
    CapTransaction,
    GenerateService,
    SeedCapDatabaseOptions
} from './seed.js';
