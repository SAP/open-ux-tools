import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime,
    MockDataServiceIdentity,
    MockDataTarget,
    SemanticClassifier,
    SftGenerator
} from './types.js';
import type { LearnedRuntimeDiagnostic, LearnedRuntimeHandle } from './model/learned-runtime.js';

interface HostGenerationContext {
    contractVersion: 1;
    service: MockDataServiceIdentity;
    metadata: string;
    targets: ReadonlyArray<MockDataTarget>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    logger: Readonly<{
        debug(message: string): void;
        info(message: string): void;
        warn(message: string): void;
    }>;
    signal: AbortSignal;
}

type ProviderOptions = Readonly<Record<string, JsonValue>>;

interface ProviderModelOptions {
    manifestPath: string;
    cacheDirectory?: string;
    offline: boolean;
}

interface ProviderConfiguration {
    generation: MockDataGeneratorOptions;
    model?: ProviderModelOptions;
}

interface ProviderDependencies {
    loadRuntime(options: ProviderModelOptions, signal: AbortSignal): Promise<LearnedRuntimeHandle>;
}

type HostMockDataGenerationResult = Pick<MockDataGeneratorResult, 'resources' | 'diagnostics' | 'fingerprints'>;

const MAX_HOST_DIAGNOSTICS = 100;

function hostDiagnostics(
    diagnostics: ReadonlyArray<MockDataGeneratorResult['diagnostics'][number]>
): MockDataGeneratorResult['diagnostics'] {
    if (diagnostics.length <= MAX_HOST_DIAGNOSTICS) {
        return Object.freeze([...diagnostics]);
    }
    return Object.freeze([
        ...diagnostics.slice(0, MAX_HOST_DIAGNOSTICS - 1),
        Object.freeze({
            code: 'DIAGNOSTICS_TRUNCATED',
            severity: 'warning' as const,
            message: `${diagnostics.length - (MAX_HOST_DIAGNOSTICS - 1)} additional diagnostics were aggregated.`
        })
    ]);
}

/**
 *
 * @param options
 * @param name
 */
function optionalInteger(options: ProviderOptions, name: string): number | undefined {
    const value = options[name];
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new TypeError(`Mock data generator option ${name} must be an integer`);
    }
    return value;
}

/**
 *
 * @param options
 * @param name
 */
function optionalString(options: ProviderOptions, name: string): string | undefined {
    const value = options[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`Mock data generator option ${name} must be a non-empty string`);
    }
    return value;
}

/**
 *
 * @param options
 */
function parseOptions(options: ProviderOptions = {}): ProviderConfiguration {
    const seed = optionalInteger(options, 'seed');
    const rowsPerEntity = optionalInteger(options, 'rowsPerEntity');
    const sftTimeoutMs = optionalInteger(options, 'sftTimeoutMs');
    const locale = options.locale;
    const mode = options.mode;
    if (locale !== undefined && typeof locale !== 'string') {
        throw new TypeError('Mock data generator option locale must be a string');
    }
    if (mode !== undefined && !['auto', 'deterministic', 'learned'].includes(String(mode))) {
        throw new TypeError('Mock data generator option mode is invalid');
    }
    const modelManifestPath = optionalString(options, 'modelManifestPath');
    const modelCacheDirectory = optionalString(options, 'modelCacheDirectory');
    const modelOffline = options.modelOffline;
    if (modelOffline !== undefined && typeof modelOffline !== 'boolean') {
        throw new TypeError('Mock data generator option modelOffline must be a boolean');
    }
    return Object.freeze({
        generation: Object.freeze({
            ...(seed === undefined ? {} : { seed }),
            ...(rowsPerEntity === undefined ? {} : { rowsPerEntity }),
            ...(sftTimeoutMs === undefined ? {} : { sftTimeoutMs }),
            ...(locale === undefined ? {} : { locale }),
            ...(mode === undefined ? {} : { mode: mode as MockDataGeneratorOptions['mode'] })
        }),
        ...(modelManifestPath
            ? {
                  model: Object.freeze({
                      manifestPath: modelManifestPath,
                      ...(modelCacheDirectory ? { cacheDirectory: modelCacheDirectory } : {}),
                      offline: modelOffline === true
                  })
              }
            : {})
    });
}

const defaultDependencies: ProviderDependencies = {
    loadRuntime: async (options, signal) => {
        const { readFile } = await import('node:fs/promises');
        const { createLearnedRuntime, defaultModelCacheRoot, parseModelManifest, prepareModelCache, verifyModelCache } =
            await import('./index.js');
        signal.throwIfAborted();
        const manifest = parseModelManifest(JSON.parse(await readFile(options.manifestPath, 'utf8')));
        const cacheDirectory = options.cacheDirectory ?? defaultModelCacheRoot();
        const cache = options.offline
            ? await verifyModelCache(cacheDirectory, manifest)
            : await prepareModelCache(cacheDirectory, manifest, { signal });
        return createLearnedRuntime(manifest, cache);
    }
};

/**
 *
 * @param diagnostics
 */
function modelDiagnostics(
    diagnostics: ReadonlyArray<LearnedRuntimeDiagnostic>
): MockDataGeneratorResult['diagnostics'] {
    return diagnostics.map((diagnostic) =>
        Object.freeze({
            code: diagnostic.code,
            severity: 'warning' as const,
            message: diagnostic.message,
            ...(diagnostic.componentId ? { target: diagnostic.componentId } : {})
        })
    );
}

/** CommonJS provider constructor loaded by @sap-ux/fe-mockserver-core. */
class FeMockserverDataGenerator {
    public readonly apiVersion = 1 as const;
    private readonly configuration: ProviderConfiguration;
    private runtimePromise?: Promise<LearnedRuntimeHandle>;
    private guardedRuntime?: MockDataGeneratorRuntime;
    private classifierFailed = false;
    private sftFailed = false;
    private sftQueue: Promise<void> = Promise.resolve();
    private disposed = false;

    constructor(
        options?: ProviderOptions,
        private readonly dependencies: ProviderDependencies = defaultDependencies
    ) {
        this.configuration = parseOptions(options);
    }

    private runtime(signal: AbortSignal): Promise<LearnedRuntimeHandle | undefined> {
        if (this.configuration.generation.mode === 'deterministic' || !this.configuration.model) {
            return Promise.resolve(undefined);
        }
        this.runtimePromise ??= this.dependencies.loadRuntime(this.configuration.model, signal).catch(() =>
            Object.freeze({
                runtime: Object.freeze({}),
                diagnostics: Object.freeze([
                    Object.freeze({
                        code: 'MODEL_CACHE_UNAVAILABLE' as const,
                        message:
                            'The learned runtime could not be initialized; deterministic generation remains active.'
                    })
                ]),
                dispose: async () => undefined
            })
        );
        return this.runtimePromise;
    }

    private guardRuntime(runtime: MockDataGeneratorRuntime): MockDataGeneratorRuntime {
        if (this.guardedRuntime) {
            return this.guardedRuntime;
        }
        let classifier: SemanticClassifier | undefined;
        if (runtime.classifier) {
            const delegate = runtime.classifier;
            classifier = Object.freeze({
                fingerprint: delegate.fingerprint,
                classify: async (...args: Parameters<SemanticClassifier['classify']>) => {
                    if (this.classifierFailed) {
                        throw new Error('Classifier circuit is open');
                    }
                    try {
                        return await delegate.classify(...args);
                    } catch (error) {
                        this.classifierFailed = true;
                        throw error;
                    }
                }
            });
        }
        let sft: SftGenerator | undefined;
        if (runtime.sft) {
            const delegate = runtime.sft;
            sft = Object.freeze({
                fingerprint: delegate.fingerprint,
                generate: async (...args: Parameters<SftGenerator['generate']>) => {
                    if (this.sftFailed) {
                        throw new Error('SFT circuit is open');
                    }
                    const operation = this.sftQueue
                        .catch(() => undefined)
                        .then(() => {
                            args[1].throwIfAborted();
                            if (this.sftFailed) {
                                throw new Error('SFT circuit is open');
                            }
                            return delegate.generate(...args);
                        });
                    this.sftQueue = operation.then(
                        () => undefined,
                        () => undefined
                    );
                    try {
                        return await operation;
                    } catch (error) {
                        this.sftFailed = true;
                        throw error;
                    }
                }
            });
        }
        this.guardedRuntime = Object.freeze({
            ...(classifier ? { classifier } : {}),
            ...(sft ? { sft } : {})
        });
        return this.guardedRuntime;
    }

    async generate(context: HostGenerationContext): Promise<HostMockDataGenerationResult> {
        if (this.disposed) throw new Error('Mock data generator provider has been disposed');
        const { generateService } = await import('./index.js');
        const learned = await this.runtime(context.signal);
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: context.metadata },
                service: context.service,
                targets: context.targets,
                existingData: context.existingData,
                signal: context.signal
            },
            this.configuration.generation,
            learned ? this.guardRuntime(learned.runtime) : undefined
        );
        const runtimeDiagnostics = learned ? modelDiagnostics(learned.diagnostics) : [];
        runtimeDiagnostics.forEach((diagnostic) => context.logger.warn(`${diagnostic.code}: ${diagnostic.message}`));
        return Object.freeze({
            resources: result.resources,
            diagnostics: hostDiagnostics([...runtimeDiagnostics, ...result.diagnostics]),
            fingerprints: result.fingerprints
        });
    }

    async dispose(): Promise<void> {
        if (this.disposed) return;
        this.disposed = true;
        const runtime = await this.runtimePromise;
        await runtime?.dispose();
    }
}

export = FeMockserverDataGenerator;
