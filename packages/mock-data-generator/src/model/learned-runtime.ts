import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type {
    MockDataGeneratorRuntime,
    SemanticClassifier,
    SftCandidateRelevanceVerifier,
    SftGenerator
} from '../types.js';
import { createCausalOnnxBackend, createCausalOnnxSession } from './causal-onnx-session.js';
import { parseConceptHead } from './concept-head.js';
import { createCausalTextGenerator } from './causal-text-runtime.js';
import {
    assertCandidateRelevanceHead,
    createEmbeddingCandidateRelevanceVerifier,
    type CandidateRelevanceHead
} from './candidate-relevance.js';
import {
    createEmbeddingSemanticClassifier,
    assertEmbeddingHead,
    type EmbeddingClassifierHead,
    type EmbeddingSemanticClassifierOptions
} from './embedding-classifier.js';
import type { ModelComponentManifest, ModelManifest } from './manifest.js';
import { createMiniLmTextEmbedder, createOnnxBackend } from './minilm-runtime.js';
import type { VerifiedModelArtifacts } from './runtime-artifacts.js';
import { createPilotSftGenerator, processCompletionStore, type PilotSamplingOptions } from './sft-runtime.js';
import { createSmolLm2Tokenizer } from './smollm-tokenizer.js';

export interface LoadedLearnedComponent<T> {
    value: T;
    candidateVerifier?: SftCandidateRelevanceVerifier;
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

export type EmbeddingSemanticClassifierContract = Pick<
    EmbeddingSemanticClassifierOptions,
    'serializeV3Input' | 'v3Roles' | 'v3RegistryFingerprint' | 'v3SerializerFingerprint'
>;

export interface SftArtifactConfiguration {
    numHiddenLayers: number;
    numKeyValueHeads: number;
    hiddenSize: number;
    numAttentionHeads: number;
    samplingOptions: PilotSamplingOptions;
    promptContractVersion: 1 | 2;
    /** How the runtime calls the model; contract 2 unless the artifact pins 1. */
    runtimeContract: 1 | 2;
    /** Contract 2 punctuation; `spaced` (the training rows' separators) unless the artifact declares `compact`. */
    jsonSeparators: 'compact' | 'spaced';
}

/**
 * Reject explicitly unqualified v3 development heads before loading native runtime code.
 *
 * @param head
 * @param lifecycle
 */
export function assertV3HeadLifecycle(head: EmbeddingClassifierHead, lifecycle: ModelManifest['lifecycle']): void {
    const qualification = (head as EmbeddingClassifierHead & { qualification?: { status?: unknown } }).qualification;
    if (head.inputFormat === 'v3' && lifecycle !== 'development' && qualification?.status !== 'qualified') {
        throw new TypeError(
            `v3 classifier head is ${String(qualification?.status ?? 'unqualified')} and cannot load for ${lifecycle} lifecycle`
        );
    }
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
    cache: VerifiedModelArtifacts
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

/**
 * Validate the SFT artifact's generation config. The runtime contract defaults to 2 and its
 * separators to `spaced`; an artifact may pin contract 1 or declare `compact` separators.
 *
 * @param value parsed `generation-config.json`
 * @returns the validated configuration
 */
export function parseSftConfiguration(value: unknown): SftArtifactConfiguration {
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
    const promptContractVersion = input.promptContractVersion ?? 1;
    if (promptContractVersion !== 1 && promptContractVersion !== 2) {
        throw new TypeError('SFT prompt contract version must be 1 or 2');
    }
    const runtimeContract = input.runtimeContract ?? 2;
    if (runtimeContract !== 1 && runtimeContract !== 2) {
        throw new TypeError('SFT runtime contract must be 1 or 2');
    }
    const jsonSeparators = input.jsonSeparators ?? 'spaced';
    if (jsonSeparators !== 'compact' && jsonSeparators !== 'spaced') {
        throw new TypeError('SFT JSON separators must be compact or spaced');
    }
    return {
        promptContractVersion,
        runtimeContract,
        jsonSeparators,
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

function defaultFactories(
    contract: EmbeddingSemanticClassifierContract = {},
    lifecycle: ModelManifest['lifecycle'] = 'development'
): LearnedComponentFactories {
    return {
        classifier: async (component, files, runtime): Promise<LoadedLearnedComponent<SemanticClassifier>> => {
            const head = JSON.parse(
                await readFile(requiredFile(files, 'classifier-head'), 'utf8')
            ) as EmbeddingClassifierHead;
            assertV3HeadLifecycle(head, lifecycle);
            assertEmbeddingHead(head, {
                fingerprint: component.fingerprint,
                head,
                embedder: { embed: async () => [] },
                ...contract
            });
            const relevanceDeclared = component.files.some(({ role }) => role === 'relevance-head');
            const relevanceFile = files.get('relevance-head');
            if (relevanceDeclared && !relevanceFile) {
                throw new TypeError('The declared field-to-value relevance head is missing from verified artifacts');
            }
            const relevanceHead = relevanceFile
                ? (JSON.parse(await readFile(relevanceFile, 'utf8')) as CandidateRelevanceHead)
                : undefined;
            // The relevance verifier may ship its own fine-tuned encoder (`relevance-encoder`); it
            // shares the vocabulary and the 64-token contract with the classifier encoder.
            const relevanceEncoderFile = files.get('relevance-encoder');
            if (relevanceHead) {
                if (head.inputFormat !== 'v3') {
                    throw new TypeError('The field-to-value relevance head requires the 64-token v3 encoder contract');
                }
                const encoderSha256 = component.files.find(
                    ({ role }) => role === (relevanceEncoderFile ? 'relevance-encoder' : 'encoder')
                )?.sha256;
                const vocabularySha256 = component.files.find(({ role }) => role === 'vocabulary')?.sha256;
                if (!encoderSha256 || !vocabularySha256) {
                    throw new TypeError('Field-to-value relevance head requires verified encoder artifacts');
                }
                assertCandidateRelevanceHead(relevanceHead, {
                    encoderSha256,
                    vocabularySha256,
                    embeddingDimension: head.dim
                });
            }
            // The prototype head (head B) shares this encoder; it is optional but must load when declared.
            const conceptDeclared = component.files.some(({ role }) => role === 'concept-head');
            const conceptFile = files.get('concept-head');
            if (conceptDeclared && !conceptFile) {
                throw new TypeError('The declared concept prototype head is missing from verified artifacts');
            }
            const conceptHead =
                conceptFile && head.inputFormat === 'v3'
                    ? parseConceptHead(JSON.parse(await readFile(conceptFile, 'utf8')), {
                          dim: head.dim,
                          encoderSha256: head.encoderSha256 ?? '',
                          tokenizerSha256: head.tokenizerSha256 ?? '',
                          serializerFingerprint: head.serializerFingerprint ?? ''
                      })
                    : undefined;
            const backend = createOnnxBackend(await import(runtime.specifier), 'verified native runtime');
            const embedder = await createMiniLmTextEmbedder({
                modelPath: requiredFile(files, 'encoder'),
                vocabularyPath: requiredFile(files, 'vocabulary'),
                hiddenSize: head.dim,
                ...(head.inputFormat === 'v3'
                    ? {
                          maxWordPieceTokens: head.maxWordPieceTokens,
                          expectedEncoderSha256: head.encoderSha256,
                          expectedVocabularySha256: head.tokenizerSha256
                      }
                    : {}),
                backend
            });
            const relevanceEmbedder =
                relevanceHead && relevanceEncoderFile
                    ? await createMiniLmTextEmbedder({
                          modelPath: relevanceEncoderFile,
                          vocabularyPath: requiredFile(files, 'vocabulary'),
                          hiddenSize: relevanceHead.dim,
                          maxWordPieceTokens: relevanceHead.maxWordPieceTokens,
                          expectedEncoderSha256: relevanceHead.encoderSha256,
                          expectedVocabularySha256: relevanceHead.tokenizerSha256,
                          backend
                      })
                    : embedder;
            return {
                value: createEmbeddingSemanticClassifier({
                    fingerprint: component.fingerprint,
                    head,
                    embedder,
                    ...contract,
                    ...(conceptHead ? { conceptHead } : {})
                }),
                ...(relevanceHead
                    ? {
                          candidateVerifier: createEmbeddingCandidateRelevanceVerifier({
                              head: relevanceHead,
                              embedder: relevanceEmbedder,
                              fingerprint: component.files.find(({ role }) => role === 'relevance-head')?.sha256 ?? '',
                              encoderSha256: relevanceHead.encoderSha256,
                              vocabularySha256: relevanceHead.tokenizerSha256,
                              embeddingDimension: head.dim
                          })
                      }
                    : {}),
                dispose: async (): Promise<void> => {
                    await embedder.dispose();
                    if (relevanceEmbedder !== embedder) {
                        await relevanceEmbedder.dispose();
                    }
                }
            };
        },
        sft: async (component, files, runtime): Promise<LoadedLearnedComponent<SftGenerator>> => {
            const configuration = parseSftConfiguration(
                JSON.parse(await readFile(requiredFile(files, 'generation-config'), 'utf8'))
            );
            if (configuration.hiddenSize % configuration.numAttentionHeads !== 0) {
                throw new TypeError('SFT hidden size must be divisible by its attention-head count');
            }
            const tokenizer = createSmolLm2Tokenizer(
                JSON.parse(await readFile(requiredFile(files, 'tokenizer'), 'utf8'))
            );
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
                sampling: configuration.samplingOptions,
                promptContractVersion: configuration.promptContractVersion,
                runtimeContract: configuration.runtimeContract,
                separators: configuration.jsonSeparators,
                completionStore: processCompletionStore()
            });
            return { value: sft, dispose: () => sft.dispose?.() };
        }
    };
}

/**
 * Build independently degradable classifier and SFT runtimes from a fully verified cache.
 *
 * @param manifest
 * @param cache
 * @param factories
 * @param classifierContract
 */
export async function createLearnedRuntime(
    manifest: ModelManifest,
    cache: VerifiedModelArtifacts,
    factories?: LearnedComponentFactories,
    classifierContract?: EmbeddingSemanticClassifierContract
): Promise<LearnedRuntimeHandle> {
    const componentFactories = factories ?? defaultFactories(classifierContract, manifest.lifecycle);
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

    const runtime: {
        classifier?: SemanticClassifier;
        sft?: SftGenerator;
        candidateVerifier?: SftCandidateRelevanceVerifier;
    } = {};
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
                const loaded = await componentFactories.classifier(component, files, selectedRuntime);
                runtime.classifier = loaded.value;
                runtime.candidateVerifier = loaded.candidateVerifier;
                if (loaded.dispose) {
                    disposers.push(loaded.dispose);
                }
            } else {
                const loaded = await componentFactories.sft(component, files, selectedRuntime);
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
