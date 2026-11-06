import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type {
    MockDataGeneratorRuntime,
    SemanticClassifier,
    SftCandidateRelevanceVerifier,
    SftGenerator
} from '../types.js';
import { createCausalOnnxBackend, createCausalOnnxSession } from './causal-onnx-session.js';
import { parseConceptHead, type ConceptHead } from './concept-head.js';
import type { ConceptValueBank } from '../semantics/bank-store.js';
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
import { createMiniLmTextEmbedder, createOnnxBackend } from './minilm-runtime.js';
import type { PackagedModelComponent, PackagedModelManifest } from './packaged-models.js';
import type { VerifiedModelArtifacts } from './runtime-artifacts.js';
import {
    createRowGenerator,
    parseSftPromptTemplate,
    processCompletionStore,
    type SamplingOptions,
    type SftCompletionStore,
    type SftPromptTemplate
} from './sft-runtime.js';
import { createSmolLm2Tokenizer } from './smollm-tokenizer.js';
import { errorMessage, isRecord } from '../guards.js';

interface LoadedLearnedComponent<T> {
    value: T;
    candidateVerifier?: SftCandidateRelevanceVerifier;
    dispose?(): Promise<void> | void;
}

type LearnedComponentFactory<T> = (
    component: PackagedModelComponent,
    files: ReadonlyMap<string, string>,
    runtime: LearnedRuntimeModule
) => Promise<LoadedLearnedComponent<T>>;

interface LearnedRuntimeModule {
    package: 'onnxruntime-node';
    version: string;
}

export interface LearnedComponentFactories {
    classifier: LearnedComponentFactory<SemanticClassifier>;
    sft: LearnedComponentFactory<SftGenerator>;
}

export interface LearnedRuntimeDiagnostic {
    code: 'MODEL_CACHE_UNAVAILABLE' | 'CLASSIFIER_RUNTIME_UNAVAILABLE' | 'SFT_RUNTIME_UNAVAILABLE';
    componentId?: string;
    message: string;
    /** Message of the error that stopped the component from loading, when one was raised. */
    cause?: string;
}

export interface LearnedRuntimeHandle {
    runtime: MockDataGeneratorRuntime;
    diagnostics: ReadonlyArray<LearnedRuntimeDiagnostic>;
    dispose(): Promise<void>;
}

type EmbeddingSemanticClassifierContract = Pick<
    EmbeddingSemanticClassifierOptions,
    'serializeV3Input' | 'v3Roles' | 'v3RegistryFingerprint' | 'v3SerializerFingerprint'
> & {
    /** The value bank of a concept id; required to load a concept prototype head. */
    conceptBank?: (id: string) => ConceptValueBank | undefined;
};

interface SftArtifactConfiguration {
    numHiddenLayers: number;
    numKeyValueHeads: number;
    hiddenSize: number;
    numAttentionHeads: number;
    samplingOptions: SamplingOptions;
    /** The prompt texts of prompt contract 1. */
    promptTemplate: SftPromptTemplate;
    /** Punctuation outside strings; `spaced` (the training rows' separators) unless the artifact declares `compact`. */
    jsonSeparators: 'compact' | 'spaced';
}

/** The installed native runtime's declared version, or the error that prevented reading it. */
type InstalledRuntime = Readonly<{ version: unknown }> | Readonly<{ error: unknown }>;

/**
 * Read the installed native runtime's version from its package metadata. A learned-runtime load reads it
 * once, when the first model component needs it, so a session that never loads a model never requires
 * the native package.
 *
 * @param runtime the runtime the manifest requires
 * @returns the installed version, or the error of reading it (for example, a missing package)
 */
function readInstalledRuntime(runtime: PackagedModelManifest['runtime']): InstalledRuntime {
    try {
        // Resolved per read, not at module load. An ES module (bundled or not) resolves from its URL; a
        // CommonJS bundle gives this module no URL but its own `require`, which resolves from the bundle.
        const moduleUrl: unknown = import.meta.url;
        const resolveModule = typeof moduleUrl === 'string' ? createRequire(moduleUrl) : require;
        const metadata: unknown = resolveModule(`${runtime.package}/package.json`);
        return { version: isRecord(metadata) ? metadata.version : undefined };
    } catch (error) {
        return { error };
    }
}

/**
 * The native runtime a component loads with, once the installed version is the one the manifest requires.
 *
 * @param runtime the runtime the manifest requires
 * @param installed the installed runtime, read once per load
 * @param component the component about to load
 * @returns the runtime to load the component with
 * @throws the error of reading the installed runtime, or an Error naming the required and installed versions
 */
function installedRuntimeModule(
    runtime: PackagedModelManifest['runtime'],
    installed: InstalledRuntime,
    component: PackagedModelComponent
): LearnedRuntimeModule {
    if ('error' in installed) {
        throw installed.error;
    }
    if (installed.version !== runtime.version) {
        throw new Error(
            `${runtime.package} ${runtime.version} is required by model component ${component.id}; found ${String(installed.version)}`
        );
    }
    return Object.freeze({
        package: runtime.package,
        version: runtime.version
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
 * Validate the SFT artifact's generation config. The runtime implements prompt contract 1 and runtime
 * contract 2 only, so an artifact that declares another contract is rejected; separators default to
 * `spaced`. `noRepeatNgramSize` and `maxNewTokens` sampling keys are accepted and ignored: the runtime
 * does not apply an n-gram ban, and the grammar of each call bounds its tokens. The prompt texts
 * (`promptTemplate`: system prompt, example row and ChatML markers) are required and parsed strictly.
 *
 * @param value parsed `generation-config.json`
 * @returns the validated configuration
 */
export function parseSftConfiguration(value: unknown): SftArtifactConfiguration {
    if (!isRecord(value)) {
        throw new TypeError('SFT generation config must be an object');
    }
    const input = value;
    const sampling = input.samplingOptions;
    if (!isRecord(sampling)) {
        throw new TypeError('SFT samplingOptions must be an object');
    }
    const options = sampling;
    const topP = positiveNumber(options.topP, 'SFT topP');
    if (topP > 1) {
        throw new TypeError('SFT topP must not exceed 1');
    }
    if ((input.promptContractVersion ?? 1) !== 1) {
        throw new TypeError('SFT prompt contract version must be 1');
    }
    if ((input.runtimeContract ?? 2) !== 2) {
        throw new TypeError('SFT runtime contract must be 2');
    }
    const jsonSeparators = input.jsonSeparators ?? 'spaced';
    if (jsonSeparators !== 'compact' && jsonSeparators !== 'spaced') {
        throw new TypeError('SFT JSON separators must be compact or spaced');
    }
    return {
        jsonSeparators,
        numHiddenLayers: positiveInteger(input.numHiddenLayers, 'SFT numHiddenLayers'),
        numKeyValueHeads: positiveInteger(input.numKeyValueHeads, 'SFT numKeyValueHeads'),
        hiddenSize: positiveInteger(input.hiddenSize, 'SFT hiddenSize'),
        numAttentionHeads: positiveInteger(input.numAttentionHeads, 'SFT numAttentionHeads'),
        promptTemplate: parseSftPromptTemplate(input.promptTemplate),
        samplingOptions: {
            temperature: positiveNumber(options.temperature, 'SFT temperature'),
            topP,
            repetitionPenalty: positiveNumber(options.repetitionPenalty, 'SFT repetitionPenalty')
        }
    };
}

/**
 * Read the optional field-to-value relevance head. It shares the encoder, the vocabulary and the 64-token
 * contract with the classifier, so it is checked against the component's verified encoder digests.
 *
 * @param component the classifier component
 * @param files the component's verified files by role
 * @param embeddingDimension the classifier encoder's embedding dimension
 * @returns the head, or undefined when the component declares none
 */
async function readRelevanceHead(
    component: PackagedModelComponent,
    files: ReadonlyMap<string, string>,
    embeddingDimension: number
): Promise<CandidateRelevanceHead | undefined> {
    const relevanceDeclared = component.files.some(({ role }) => role === 'relevance-head');
    const relevanceFile = files.get('relevance-head');
    if (relevanceDeclared && !relevanceFile) {
        throw new TypeError('The declared field-to-value relevance head is missing from verified artifacts');
    }
    const head: unknown = relevanceFile ? JSON.parse(await readFile(relevanceFile, 'utf8')) : undefined;
    if (!head) {
        return undefined;
    }
    const encoderSha256 = component.files.find(({ role }) => role === 'encoder')?.sha256;
    const vocabularySha256 = component.files.find(({ role }) => role === 'vocabulary')?.sha256;
    if (!encoderSha256 || !vocabularySha256) {
        throw new TypeError('Field-to-value relevance head requires verified encoder artifacts');
    }
    assertCandidateRelevanceHead(head, { encoderSha256, vocabularySha256, embeddingDimension });
    return head;
}

/**
 * Read the optional concept prototype head (head B). It shares the classifier's encoder; it must load when
 * declared, and each of its concepts takes its values from the value-bank store the contract supplies.
 *
 * @param component the classifier component
 * @param files the component's verified files by role
 * @param head the validated classifier head
 * @param contract the classifier contract, with the value-bank lookup
 * @returns the concept head, or undefined when the component declares none
 */
async function readConceptHead(
    component: PackagedModelComponent,
    files: ReadonlyMap<string, string>,
    head: EmbeddingClassifierHead,
    contract: EmbeddingSemanticClassifierContract
): Promise<ConceptHead | undefined> {
    const conceptDeclared = component.files.some(({ role }) => role === 'concept-head');
    const conceptFile = files.get('concept-head');
    if (conceptDeclared && !conceptFile) {
        throw new TypeError('The declared concept prototype head is missing from verified artifacts');
    }
    if (conceptFile && !contract.conceptBank) {
        throw new TypeError('The concept prototype head requires the value-bank store');
    }
    return conceptFile && contract.conceptBank
        ? parseConceptHead(
              JSON.parse(await readFile(conceptFile, 'utf8')),
              {
                  dim: head.dim,
                  encoderSha256: head.encoderSha256 ?? '',
                  tokenizerSha256: head.tokenizerSha256 ?? '',
                  serializerFingerprint: head.serializerFingerprint ?? ''
              },
              contract.conceptBank
          )
        : undefined;
}

/**
 * Load the classifier component: validate its heads before any native session exists, then open the
 * sentence encoder and build the classifier and, when declared, the relevance verifier around it.
 *
 * @param component the classifier component
 * @param files the component's verified files by role
 * @param runtime the installed native runtime
 * @param contract the classifier contract
 * @returns the classifier, its optional relevance verifier and the release of its native session
 */
async function loadClassifierComponent(
    component: PackagedModelComponent,
    files: ReadonlyMap<string, string>,
    runtime: LearnedRuntimeModule,
    contract: EmbeddingSemanticClassifierContract
): Promise<LoadedLearnedComponent<SemanticClassifier>> {
    const head: unknown = JSON.parse(await readFile(requiredFile(files, 'classifier-head'), 'utf8'));
    assertEmbeddingHead(head, contract);
    const relevanceHead = await readRelevanceHead(component, files, head.dim);
    const conceptHead = await readConceptHead(component, files, head, contract);
    const backend = createOnnxBackend(await import(runtime.package), 'verified native runtime');
    const embedder = await createMiniLmTextEmbedder({
        modelPath: requiredFile(files, 'encoder'),
        vocabularyPath: requiredFile(files, 'vocabulary'),
        hiddenSize: head.dim,
        maxWordPieceTokens: head.maxWordPieceTokens,
        expectedEncoderSha256: head.encoderSha256,
        expectedVocabularySha256: head.tokenizerSha256,
        backend
    });
    // The native session is released if a later step fails, so a failed load leaks nothing.
    try {
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
                          embedder,
                          fingerprint: component.files.find(({ role }) => role === 'relevance-head')?.sha256 ?? '',
                          encoderSha256: relevanceHead.encoderSha256,
                          vocabularySha256: relevanceHead.tokenizerSha256,
                          embeddingDimension: head.dim
                      })
                  }
                : {}),
            dispose: async (): Promise<void> => {
                await embedder.dispose();
            }
        };
    } catch (error) {
        await Promise.allSettled([embedder.dispose()]);
        throw error;
    }
}

/**
 * Load the SFT component: validate its generation config and tokenizer, open the causal session and build
 * the row generator around it.
 *
 * @param component the SFT component
 * @param files the component's verified files by role
 * @param runtime the installed native runtime
 * @param completionStore where model answers are kept
 * @returns the row generator and its release
 */
async function loadSftComponent(
    component: PackagedModelComponent,
    files: ReadonlyMap<string, string>,
    runtime: LearnedRuntimeModule,
    completionStore: SftCompletionStore
): Promise<LoadedLearnedComponent<SftGenerator>> {
    const configuration = parseSftConfiguration(
        JSON.parse(await readFile(requiredFile(files, 'generation-config'), 'utf8'))
    );
    if (configuration.hiddenSize % configuration.numAttentionHeads !== 0) {
        throw new TypeError('SFT hidden size must be divisible by its attention-head count');
    }
    const tokenizer = createSmolLm2Tokenizer(JSON.parse(await readFile(requiredFile(files, 'tokenizer'), 'utf8')));
    const backend = createCausalOnnxBackend(await import(runtime.package), 'verified native runtime');
    const session = await createCausalOnnxSession({
        modelPath: requiredFile(files, 'model'),
        config: {
            numLayers: configuration.numHiddenLayers,
            numKeyValueHeads: configuration.numKeyValueHeads,
            headDimension: configuration.hiddenSize / configuration.numAttentionHeads
        },
        backend
    });
    let sft: SftGenerator;
    try {
        sft = createRowGenerator({
            fingerprint: component.fingerprint,
            textGenerator: createCausalTextGenerator({ tokenizer, session }),
            sampling: configuration.samplingOptions,
            promptTemplate: configuration.promptTemplate,
            separators: configuration.jsonSeparators,
            completionStore
        });
    } catch (error) {
        // The causal session is native memory; release it when the generator cannot be built around it.
        await session.dispose?.();
        throw error;
    }
    return { value: sft, dispose: () => sft.dispose?.() };
}

/**
 * The packaged component loaders.
 *
 * @param contract the classifier contract
 * @param completionStore where SFT model answers are kept; the process-wide in-memory store by default
 * @returns the classifier and SFT loaders
 */
function defaultFactories(
    contract: EmbeddingSemanticClassifierContract = {},
    completionStore: SftCompletionStore = processCompletionStore()
): LearnedComponentFactories {
    return {
        classifier: (component, files, runtime) => loadClassifierComponent(component, files, runtime, contract),
        sft: (component, files, runtime) => loadSftComponent(component, files, runtime, completionStore)
    };
}

/**
 * Build independently degradable classifier and SFT runtimes from a verified package-local artifacts.
 *
 * @param manifest
 * @param cache
 * @param factories
 * @param classifierContract
 * @param options `completionStore` keeps model answers; the process-wide in-memory store when absent
 * @param options.completionStore see above
 */
export async function createLearnedRuntime(
    manifest: PackagedModelManifest,
    cache: VerifiedModelArtifacts,
    factories?: LearnedComponentFactories,
    classifierContract?: EmbeddingSemanticClassifierContract,
    options: Readonly<{ completionStore?: SftCompletionStore }> = {}
): Promise<LearnedRuntimeHandle> {
    const componentFactories = factories ?? defaultFactories(classifierContract, options.completionStore);
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
    let installed: InstalledRuntime | undefined;
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
            installed ??= readInstalledRuntime(manifest.runtime);
            const selectedRuntime = installedRuntimeModule(manifest.runtime, installed, component);
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
        } catch (error) {
            diagnostics.push({
                code: component.kind === 'classifier' ? 'CLASSIFIER_RUNTIME_UNAVAILABLE' : 'SFT_RUNTIME_UNAVAILABLE',
                componentId: component.id,
                message: `The ${component.kind} runtime is unavailable; lower tiers remain active.`,
                cause: errorMessage(error)
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
