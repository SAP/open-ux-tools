import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorFingerprints,
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
    generatedDataCache?: Readonly<{ directory?: string }>;
}

interface ProviderDependencies {
    loadRuntime(options: ProviderModelOptions, signal: AbortSignal): Promise<LearnedRuntimeHandle>;
    modelFingerprints(
        options: ProviderModelOptions,
        signal: AbortSignal
    ): Promise<Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft'>>;
    defaultGeneratedDataCacheRoot(): string | Promise<string>;
    readGeneratedDataCache(
        directory: string,
        key: string,
        options?: Readonly<{ validate?(result: MockDataGeneratorResult): void }>
    ): Promise<MockDataGeneratorResult | undefined>;
    writeGeneratedDataCache(directory: string, key: string, result: MockDataGeneratorResult): Promise<void>;
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

function logCapabilities(
    logger: HostGenerationContext['logger'],
    capabilities: MockDataGeneratorResult['capabilities']
): void {
    logger.debug(
        `MOCK_DATA_GENERATOR_CAPABILITIES: mode=${capabilities.mode} classifier=${capabilities.classifier} sft=${capabilities.sft}`
    );
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
    const generatedDataCacheDirectory = optionalString(options, 'generatedDataCacheDirectory');
    const modelOffline = options.modelOffline;
    const generatedDataCache = options.generatedDataCache;
    if (modelOffline !== undefined && typeof modelOffline !== 'boolean') {
        throw new TypeError('Mock data generator option modelOffline must be a boolean');
    }
    if (generatedDataCache !== undefined && typeof generatedDataCache !== 'boolean') {
        throw new TypeError('Mock data generator option generatedDataCache must be a boolean');
    }
    if (generatedDataCache === false && generatedDataCacheDirectory) {
        throw new TypeError(
            'Mock data generator cache directory cannot be set when generated-data caching is disabled'
        );
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
            : {}),
        ...(generatedDataCache === false
            ? {}
            : {
                  generatedDataCache: Object.freeze({
                      ...(generatedDataCacheDirectory ? { directory: generatedDataCacheDirectory } : {})
                  })
              })
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
    },
    modelFingerprints: async (options, signal) => {
        const { readFile } = await import('node:fs/promises');
        const { parseModelManifest } = await import('./index.js');
        signal.throwIfAborted();
        const manifest = parseModelManifest(JSON.parse(await readFile(options.manifestPath, 'utf8')));
        return Object.freeze(
            Object.fromEntries(manifest.components.map((component) => [component.kind, component.fingerprint]))
        );
    },
    defaultGeneratedDataCacheRoot: async () =>
        (await import('./cache/generated-data.js')).defaultGeneratedDataCacheRoot(),
    readGeneratedDataCache: async (directory, key, options) =>
        (await import('./cache/generated-data.js')).readGeneratedDataCache(directory, key, options),
    writeGeneratedDataCache: async (directory, key, result) =>
        (await import('./cache/generated-data.js')).writeGeneratedDataCache(directory, key, result)
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

/**
 * Distinguish a host-cancelled generation from a learned-component failure.
 * @param {unknown} error Rejection observed from the learned component.
 * @param {object} signal Signal passed to that component.
 * @returns {boolean} Whether cancellation, rather than component failure, caused the rejection.
 */
function isGenerationCancellation(error: unknown, signal: AbortSignal): boolean {
    if (!signal.aborted || error !== signal.reason) {
        return false;
    }
    if (error !== null && typeof error === 'object') {
        try {
            if (Object.getOwnPropertyDescriptor(error, 'code')?.value === 'SFT_INFERENCE_TIMEOUT') {
                return false;
            }
        } catch {
            return false;
        }
    }
    return true;
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
    private readonly dependencies: ProviderDependencies;

    constructor(options?: ProviderOptions, dependencies: Partial<ProviderDependencies> = {}) {
        this.configuration = parseOptions(options);
        this.dependencies = { ...defaultDependencies, ...dependencies };
    }

    private runtime(signal: AbortSignal): Promise<LearnedRuntimeHandle | undefined> {
        if (this.configuration.generation.mode === 'deterministic' || !this.configuration.model) {
            return Promise.resolve(undefined);
        }
        if (!this.runtimePromise) {
            const attempt = this.dependencies.loadRuntime(this.configuration.model, signal).catch((error) => {
                if (isGenerationCancellation(error, signal)) {
                    if (this.runtimePromise === attempt) {
                        this.runtimePromise = undefined;
                    }
                    throw error;
                }
                return Object.freeze({
                    runtime: Object.freeze({}),
                    diagnostics: Object.freeze([
                        Object.freeze({
                            code: 'MODEL_CACHE_UNAVAILABLE' as const,
                            message:
                                'The learned runtime could not be initialized; deterministic generation remains active.'
                        })
                    ]),
                    dispose: async () => undefined
                });
            });
            this.runtimePromise = attempt;
        }
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
                        if (!isGenerationCancellation(error, args[1])) {
                            this.classifierFailed = true;
                        }
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
                    const signal = args[1];
                    const openCircuitForRuntimeAbort = (): void => {
                        if (!isGenerationCancellation(signal.reason, signal)) {
                            this.sftFailed = true;
                        }
                    };
                    signal.addEventListener('abort', openCircuitForRuntimeAbort, { once: true });
                    if (signal.aborted) {
                        openCircuitForRuntimeAbort();
                    }
                    const operation = this.sftQueue
                        .catch(() => undefined)
                        .then(() => {
                            signal.throwIfAborted();
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
                        if (!isGenerationCancellation(error, args[1])) {
                            this.sftFailed = true;
                        }
                        throw error;
                    } finally {
                        signal.removeEventListener('abort', openCircuitForRuntimeAbort);
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
        const { createGenerationFingerprint, generateService, validateGeneratedResult } = await import('./index.js');
        const request = {
            metadata: { format: 'edmx' as const, content: context.metadata },
            service: context.service,
            targets: context.targets,
            existingData: context.existingData,
            signal: context.signal
        };
        const cacheDiagnostics: MockDataGeneratorResult['diagnostics'][number][] = [];
        let generatedDataCache:
            | Readonly<{
                  directory: string;
                  key: string;
              }>
            | undefined;
        if (this.configuration.generatedDataCache) {
            try {
                const learnedFingerprints =
                    this.configuration.model && this.configuration.generation.mode !== 'deterministic'
                        ? await this.dependencies.modelFingerprints(this.configuration.model, context.signal)
                        : {};
                const directory =
                    this.configuration.generatedDataCache.directory ??
                    (await this.dependencies.defaultGeneratedDataCacheRoot());
                const key = createGenerationFingerprint(request, this.configuration.generation, learnedFingerprints);
                const cached = await this.dependencies.readGeneratedDataCache(directory, key, {
                    validate: (result) => validateGeneratedResult(request, result)
                });
                if (cached) {
                    const cacheDiagnostic = Object.freeze({
                        code: 'GENERATED_DATA_CACHE_HIT',
                        severity: 'info' as const,
                        message: 'A verified whole-service generated-data cache entry was reused.'
                    });
                    context.logger.debug(`${cacheDiagnostic.code}: ${cacheDiagnostic.message}`);
                    return Object.freeze({
                        resources: cached.resources,
                        diagnostics: hostDiagnostics([...cached.diagnostics, cacheDiagnostic]),
                        fingerprints: cached.fingerprints
                    });
                }
                context.logger.debug('GENERATED_DATA_CACHE_MISS: no verified whole-service cache entry was found.');
                generatedDataCache = Object.freeze({ directory, key });
            } catch {
                const diagnostic = Object.freeze({
                    code: 'GENERATED_DATA_CACHE_UNAVAILABLE',
                    severity: 'warning' as const,
                    message: 'Generated-data caching is unavailable; generation continues.'
                });
                cacheDiagnostics.push(diagnostic);
                context.logger.warn(`${diagnostic.code}: ${diagnostic.message}`);
            }
        }
        const learned = await this.runtime(context.signal);
        const result = await generateService(
            request,
            this.configuration.generation,
            learned ? this.guardRuntime(learned.runtime) : undefined
        );
        if (generatedDataCache && result.fingerprints.request === generatedDataCache.key) {
            try {
                await this.dependencies.writeGeneratedDataCache(
                    generatedDataCache.directory,
                    generatedDataCache.key,
                    result
                );
            } catch {
                const diagnostic = Object.freeze({
                    code: 'GENERATED_DATA_CACHE_WRITE_FAILED',
                    severity: 'warning' as const,
                    message: 'The generated snapshot was not cached; serving continues.'
                });
                cacheDiagnostics.push(diagnostic);
                context.logger.warn(`${diagnostic.code}: ${diagnostic.message}`);
            }
        }
        const runtimeDiagnostics = learned ? modelDiagnostics(learned.diagnostics) : [];
        runtimeDiagnostics.forEach((diagnostic) => context.logger.warn(`${diagnostic.code}: ${diagnostic.message}`));
        logCapabilities(context.logger, result.capabilities);
        return Object.freeze({
            resources: result.resources,
            diagnostics: hostDiagnostics([...cacheDiagnostics, ...runtimeDiagnostics, ...result.diagnostics]),
            fingerprints: result.fingerprints
        });
    }

    async dispose(): Promise<void> {
        if (this.disposed) return;
        this.disposed = true;
        const runtime = await this.runtimePromise?.catch(() => undefined);
        await runtime?.dispose();
    }
}

export = FeMockserverDataGenerator;
