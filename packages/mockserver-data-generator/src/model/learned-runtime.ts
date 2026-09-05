import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { MockDataGeneratorRuntime, SemanticClassifier, SftGenerator } from '../types.js';
import { createCausalOnnxBackend, createCausalOnnxSession } from './causal-onnx-session.js';
import { createCausalTextGenerator } from './causal-text-runtime.js';
import { createEmbeddingSemanticClassifier, type EmbeddingClassifierHead } from './embedding-classifier.js';
import type { ModelComponentManifest, ModelManifest } from './manifest.js';
import { createMiniLmTextEmbedder, createOnnxBackend } from './minilm-runtime.js';
import type { VerifiedModelCache } from './model-cache.js';
import { createPilotSftGenerator, type PilotSamplingOptions } from './sft-runtime.js';
import { createSmolLm2Tokenizer } from './smollm-tokenizer.js';

export interface LoadedLearnedComponent<T> {
    value: T;
    dispose?(): Promise<void> | void;
}

export type LearnedComponentFactory<T> = (
    component: ModelComponentManifest,
    files: ReadonlyMap<string, string>,
    runtime: LearnedRuntimeModule
) => Promise<LoadedLearnedComponent<T>>;

export interface LearnedRuntimeModule {
    package: 'onnxruntime-node' | 'onnxruntime-web';
    version: string;
    fingerprint?: string;
    specifier: string;
}

export interface LearnedComponentFactories {
    classifier: LearnedComponentFactory<SemanticClassifier>;
    sft: LearnedComponentFactory<SftGenerator>;
}

export interface LearnedRuntimeDiagnostic {
    code: 'MODEL_CACHE_UNAVAILABLE' | 'CLASSIFIER_RUNTIME_UNAVAILABLE' | 'SFT_RUNTIME_UNAVAILABLE';
    componentId?: string;
    message: string;
}

export interface LearnedRuntimeHandle {
    runtime: MockDataGeneratorRuntime;
    diagnostics: ReadonlyArray<LearnedRuntimeDiagnostic>;
    dispose(): Promise<void>;
}

interface SftArtifactConfiguration {
    numHiddenLayers: number;
    numKeyValueHeads: number;
    hiddenSize: number;
    numAttentionHeads: number;
    samplingOptions: PilotSamplingOptions;
}

const require = createRequire(import.meta.url);

function installedRuntimeModule(component: ModelComponentManifest): LearnedRuntimeModule {
    const packageMetadata = require(`${component.runtime.package}/package.json`) as { version?: unknown };
    if (packageMetadata.version !== component.runtime.version) {
        throw new Error(
            `${component.runtime.package} ${component.runtime.version} is required by model component ${component.id}`
        );
    }
    return Object.freeze({
        package: component.runtime.package,
        version: component.runtime.version,
        specifier: component.runtime.package
    });
}

function runtimeModule(
    manifest: ModelManifest,
    component: ModelComponentManifest,
    cache: VerifiedModelCache
): LearnedRuntimeModule {
    if (manifest.formatVersion === 1) {
        return installedRuntimeModule(component);
    }
    const runtime = cache.runtime;
    if (!runtime || runtime.package !== component.runtime.package || runtime.version !== component.runtime.version) {
        throw new Error(`The verified platform runtime required by model component ${component.id} is unavailable`);
    }
    return Object.freeze({
        package: runtime.package,
        version: runtime.version,
        fingerprint: runtime.fingerprint,
        specifier: pathToFileURL(runtime.entry).href
    });
}

function requiredFile(files: ReadonlyMap<string, string>, role: string): string {
    const file = files.get(role);
    if (!file) {
        throw new TypeError(`verified model component is missing the ${role} role`);
    }
    return file;
}

function positiveInteger(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(`${label} must be a positive integer`);
    }
    return value;
}

function positiveNumber(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new TypeError(`${label} must be positive`);
    }
    return value;
}

function parseSftConfiguration(value: unknown): SftArtifactConfiguration {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('SFT generation config must be an object');
    }
    const input = value as Record<string, unknown>;
    const sampling = input.samplingOptions;
    if (sampling === null || typeof sampling !== 'object' || Array.isArray(sampling)) {
        throw new TypeError('SFT samplingOptions must be an object');
    }
    const options = sampling as Record<string, unknown>;
    const topP = positiveNumber(options.topP, 'SFT topP');
    if (topP > 1) {
        throw new TypeError('SFT topP must not exceed 1');
    }
    const noRepeatNgramSize = options.noRepeatNgramSize;
    if (typeof noRepeatNgramSize !== 'number' || !Number.isSafeInteger(noRepeatNgramSize) || noRepeatNgramSize < 0) {
        throw new TypeError('SFT noRepeatNgramSize must be a non-negative integer');
    }
    return {
        numHiddenLayers: positiveInteger(input.numHiddenLayers, 'SFT numHiddenLayers'),
        numKeyValueHeads: positiveInteger(input.numKeyValueHeads, 'SFT numKeyValueHeads'),
        hiddenSize: positiveInteger(input.hiddenSize, 'SFT hiddenSize'),
        numAttentionHeads: positiveInteger(input.numAttentionHeads, 'SFT numAttentionHeads'),
        samplingOptions: {
            temperature: positiveNumber(options.temperature, 'SFT temperature'),
            topP,
            repetitionPenalty: positiveNumber(options.repetitionPenalty, 'SFT repetitionPenalty'),
            noRepeatNgramSize,
            maxNewTokens: positiveInteger(options.maxNewTokens, 'SFT maxNewTokens')
        }
    };
}

const defaultFactories: LearnedComponentFactories = {
    classifier: async (component, files, runtime) => {
        const head = JSON.parse(
            await readFile(requiredFile(files, 'classifier-head'), 'utf8')
        ) as EmbeddingClassifierHead;
        const backend = createOnnxBackend(await import(runtime.specifier), 'verified native runtime');
        const embedder = await createMiniLmTextEmbedder({
            modelPath: requiredFile(files, 'encoder'),
            vocabularyPath: requiredFile(files, 'vocabulary'),
            hiddenSize: head.dim,
            backend
        });
        return {
            value: createEmbeddingSemanticClassifier({ fingerprint: component.fingerprint, head, embedder }),
            dispose: () => embedder.dispose()
        };
    },
    sft: async (component, files, runtime) => {
        const configuration = parseSftConfiguration(
            JSON.parse(await readFile(requiredFile(files, 'generation-config'), 'utf8'))
        );
        if (configuration.hiddenSize % configuration.numAttentionHeads !== 0) {
            throw new TypeError('SFT hidden size must be divisible by its attention-head count');
        }
        const tokenizer = createSmolLm2Tokenizer(JSON.parse(await readFile(requiredFile(files, 'tokenizer'), 'utf8')));
        const backend = createCausalOnnxBackend(await import(runtime.specifier), 'verified native runtime');
        const session = await createCausalOnnxSession({
            modelPath: requiredFile(files, 'model'),
            config: {
                numLayers: configuration.numHiddenLayers,
                numKeyValueHeads: configuration.numKeyValueHeads,
                headDimension: configuration.hiddenSize / configuration.numAttentionHeads
            },
            backend
        });
        const sft = createPilotSftGenerator({
            fingerprint: component.fingerprint,
            textGenerator: createCausalTextGenerator({ tokenizer, session }),
            sampling: configuration.samplingOptions
        });
        return { value: sft, dispose: () => sft.dispose?.() };
    }
};

/**
 * Build independently degradable classifier and SFT runtimes from a fully verified cache.
 *
 * @param manifest
 * @param cache
 * @param factories
 */
export async function createLearnedRuntime(
    manifest: ModelManifest,
    cache: VerifiedModelCache,
    factories: LearnedComponentFactories = defaultFactories
): Promise<LearnedRuntimeHandle> {
    if (!cache.ready && cache.files.size === 0) {
        return Object.freeze({
            runtime: Object.freeze({}),
            diagnostics: Object.freeze([
                Object.freeze({
                    code: 'MODEL_CACHE_UNAVAILABLE' as const,
                    message: 'The learned-model cache is incomplete or failed verification.'
                })
            ]),
            dispose: async () => undefined
        });
    }

    const runtime: { classifier?: SemanticClassifier; sft?: SftGenerator } = {};
    const diagnostics: LearnedRuntimeDiagnostic[] = [];
    const disposers: Array<() => Promise<void> | void> = [];
    for (const component of manifest.components) {
        const files = cache.files.get(component.id);
        if (!files) {
            diagnostics.push({
                code: component.kind === 'classifier' ? 'CLASSIFIER_RUNTIME_UNAVAILABLE' : 'SFT_RUNTIME_UNAVAILABLE',
                componentId: component.id,
                message: `The ${component.kind} runtime is unavailable; lower tiers remain active.`
            });
            continue;
        }
        try {
            const selectedRuntime = runtimeModule(manifest, component, cache);
            if (component.kind === 'classifier') {
                const loaded = await factories.classifier(component, files, selectedRuntime);
                runtime.classifier = loaded.value;
                if (loaded.dispose) {
                    disposers.push(loaded.dispose);
                }
            } else {
                const loaded = await factories.sft(component, files, selectedRuntime);
                runtime.sft = loaded.value;
                if (loaded.dispose) {
                    disposers.push(loaded.dispose);
                }
            }
        } catch {
            diagnostics.push({
                code: component.kind === 'classifier' ? 'CLASSIFIER_RUNTIME_UNAVAILABLE' : 'SFT_RUNTIME_UNAVAILABLE',
                componentId: component.id,
                message: `The ${component.kind} runtime is unavailable; lower tiers remain active.`
            });
        }
    }
    return Object.freeze({
        runtime: Object.freeze(runtime),
        diagnostics: Object.freeze(diagnostics.map((diagnostic) => Object.freeze(diagnostic))),
        dispose: async () => {
            await Promise.allSettled(disposers.map(async (dispose) => dispose()));
        }
    });
}
