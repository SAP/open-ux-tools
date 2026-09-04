import { createHash } from 'node:crypto';
import type {
    MockDataGeneratorCapabilities,
    MockDataGeneratorFingerprints,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest
} from './types.js';
import { assertRelationshipIntegrity, generateDeterministicResources } from './generation/deterministic.js';
import { propertyValueIsValid } from './generation/constraints.js';
import { applySftGeneration } from './generation/sft.js';
import { parseEdmx } from './schema/edmx.js';
import { parseCsn } from './schema/csn.js';
import { classifySchema } from './semantics/classifier.js';
import { resolveSemanticClassifications } from './semantics/lexical-fallback.js';

export {
    buildEmbeddingFieldText,
    createEmbeddingSemanticClassifier,
    quantizeLogit
} from './model/embedding-classifier.js';
export { parseModelManifest } from './model/manifest.js';
export { defaultModelCacheRoot, modelBundleDirectory, verifyModelCache } from './model/model-cache.js';
export { prepareModelCache } from './model/downloader.js';
export { createMiniLmTextEmbedder, loadOnnxBackend } from './model/minilm-runtime.js';
export { createPilotSftGenerator, renderPilotSftPrompt } from './model/sft-runtime.js';
export { createCausalTextGenerator } from './model/causal-text-runtime.js';
export { createSmolLm2Tokenizer } from './model/smollm-tokenizer.js';
export { createCausalOnnxSession, loadCausalOnnxBackend } from './model/causal-onnx-session.js';
export { createLearnedRuntime } from './model/learned-runtime.js';
export {
    DEFAULT_GENERATED_DATA_CACHE_BYTES,
    defaultGeneratedDataCacheRoot,
    readGeneratedDataCache,
    writeGeneratedDataCache
} from './cache/generated-data.js';

function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function fingerprint(value: unknown): string {
    return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

const GENERATOR_LOGIC_VERSION = 2;

/**
 * Fingerprint every material generation input while excluding live process objects.
 *
 * @param request
 * @param options
 * @param learnedComponents
 */
export function createGenerationFingerprint(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    learnedComponents: Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft'> = {}
): string {
    return fingerprint({
        generatorLogicVersion: GENERATOR_LOGIC_VERSION,
        request: {
            metadata: request.metadata,
            service: request.service,
            targets: request.targets,
            existingData: request.existingData
        },
        options,
        learnedComponents
    });
}

/**
 * Validate a generated snapshot against the current request before it is served from a persistent cache.
 *
 * @param request
 * @param result
 */
export function validateGeneratedResult(request: MockDataServiceRequest, result: MockDataGeneratorResult): void {
    const graph =
        request.metadata.format === 'edmx' ? parseEdmx(request.metadata.content) : parseCsn(request.metadata.content);
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const targets = new Map(request.targets.map((target) => [target.name, target]));

    for (const resourceName of Object.keys(result.resources)) {
        if (!targets.has(resourceName)) {
            throw new TypeError(`Generated resource ${resourceName} was not requested`);
        }
    }
    for (const [targetName, target] of targets) {
        const entity = entities.get(targetName);
        if (!entity) {
            throw new TypeError(`Generated target ${targetName} is not declared by the service schema`);
        }
        const rows = result.resources[targetName];
        if (!rows) {
            throw new TypeError(`Generated resource ${targetName} is missing`);
        }
        if (rows.length > 1_000 || (target.kind === 'singleton' && rows.length > 1)) {
            throw new TypeError(`Generated resource ${targetName} has an invalid row count`);
        }
        const properties = new Map(entity.properties.map((property) => [property.name, property]));
        const keyProperties = entity.properties.filter((property) => property.isKey);
        const keys = new Set<string>();
        for (const row of rows) {
            for (const propertyName of Object.keys(row)) {
                if (!properties.has(propertyName)) {
                    throw new TypeError(`Generated resource ${targetName} contains unknown property ${propertyName}`);
                }
            }
            for (const property of entity.properties) {
                if (!Object.prototype.hasOwnProperty.call(row, property.name)) {
                    throw new TypeError(`Generated resource ${targetName} is missing property ${property.name}`);
                }
                if (!propertyValueIsValid(property, row[property.name])) {
                    throw new TypeError(`Generated resource ${targetName} has an invalid value for ${property.name}`);
                }
            }
            if (keyProperties.length > 0) {
                const key = canonicalJson(keyProperties.map((property) => row[property.name]));
                if (keys.has(key)) {
                    throw new TypeError(`Generated resource ${targetName} contains a duplicate key`);
                }
                keys.add(key);
            }
        }
    }
    assertRelationshipIntegrity(graph, result.resources, request.existingData);
}

function validateOptions(options: MockDataGeneratorOptions): void {
    if (options.seed !== undefined && !Number.isSafeInteger(options.seed)) {
        throw new TypeError('Mock data generator seed must be a safe integer');
    }
    const rowCounts =
        typeof options.rowsPerEntity === 'number'
            ? [options.rowsPerEntity]
            : Object.values(options.rowsPerEntity ?? {});
    if (rowCounts.some((count) => !Number.isSafeInteger(count) || count < 0 || count > 1_000)) {
        throw new TypeError('Mock data generator row counts must be integers between 0 and 1000');
    }
    if (
        options.sftTimeoutMs !== undefined &&
        (!Number.isSafeInteger(options.sftTimeoutMs) || options.sftTimeoutMs <= 0 || options.sftTimeoutMs > 60_000)
    ) {
        throw new TypeError('Mock data generator SFT timeout must be an integer between 1 and 60000 milliseconds');
    }
}

function capabilities(
    runtime: MockDataGeneratorRuntime,
    classifierDegraded: boolean,
    sftDegraded: boolean
): MockDataGeneratorCapabilities {
    const componentState = (available: boolean, degraded: boolean): 'ready' | 'degraded' | 'unavailable' => {
        if (!available) {
            return 'unavailable';
        }
        return degraded ? 'degraded' : 'ready';
    };
    const classifier = componentState(runtime.classifier !== undefined, classifierDegraded);
    const sft = componentState(runtime.sft !== undefined, sftDegraded);
    if (sft === 'ready') {
        return { mode: 'hybrid', classifier, sft };
    }
    if (classifier === 'ready') {
        return { mode: 'semantic', classifier, sft };
    }
    return { mode: 'deterministic', classifier, sft };
}

/**
 * Generate a complete, coherent snapshot for the requested service resources.
 *
 * @param request
 * @param options
 * @param runtime
 */
export async function generateService(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<MockDataGeneratorResult> {
    validateOptions(options);
    let resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>> = Object.freeze({});
    const diagnostics: MockDataGeneratorResult['diagnostics'][number][] = [];
    let classifierDegraded = false;
    let sftDegraded = false;
    if (request.targets.length > 0) {
        const graph =
            request.metadata.format === 'edmx'
                ? parseEdmx(request.metadata.content)
                : parseCsn(request.metadata.content);
        const signal = request.signal ?? new AbortController().signal;
        let classifications: Awaited<ReturnType<typeof classifySchema>>['classifications'] = new Map();
        if (runtime.classifier && options.mode !== 'deterministic') {
            const classifierRun = await classifySchema(graph, runtime.classifier, signal);
            classifications = classifierRun.classifications;
            diagnostics.push(...classifierRun.diagnostics);
            classifierDegraded = classifierRun.degraded;
        }
        classifications = resolveSemanticClassifications(graph, classifications);
        const deterministic = generateDeterministicResources(
            graph,
            request.targets,
            options,
            classifications,
            request.existingData
        );
        resources = deterministic.resources;
        diagnostics.push(...deterministic.diagnostics);
        if (runtime.sft && options.mode !== 'deterministic') {
            const sftRun = await applySftGeneration(
                graph,
                resources,
                request.service,
                options,
                classifications,
                runtime.sft,
                signal
            );
            resources = sftRun.resources;
            diagnostics.push(...sftRun.diagnostics);
            sftDegraded = sftRun.degraded;
        }
        assertRelationshipIntegrity(graph, resources, request.existingData);
    }
    return Object.freeze({
        resources,
        diagnostics: Object.freeze(diagnostics),
        capabilities: Object.freeze(capabilities(runtime, classifierDegraded, sftDegraded)),
        fingerprints: Object.freeze({
            request: createGenerationFingerprint(request, options, {
                ...(runtime.classifier ? { classifier: runtime.classifier.fingerprint } : {}),
                ...(runtime.sft ? { sft: runtime.sft.fingerprint } : {})
            }),
            ...(runtime.classifier ? { classifier: runtime.classifier.fingerprint } : {}),
            ...(runtime.sft ? { sft: runtime.sft.fingerprint } : {})
        })
    });
}

export type {
    ExistingInitialRows,
    ExistingMockData,
    JsonPrimitive,
    JsonValue,
    MockDataGeneratorCapabilities,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorFingerprints,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime,
    MockDataMetadata,
    MockDataRow,
    MockDataServiceIdentity,
    MockDataServiceRequest,
    MockDataTarget,
    SemanticClassification,
    SemanticClassifier,
    SemanticClassifierInput,
    SftFieldRequest,
    SftGenerationInput,
    SftGenerationOutput,
    SftGenerator
} from './types.js';
export type {
    EmbeddingClassifierHead,
    EmbeddingHeadCalibration,
    EmbeddingSemanticClassifierOptions,
    TextEmbedder
} from './model/embedding-classifier.js';
export type {
    ModelArtifactFile,
    ModelComponentKind,
    ModelComponentManifest,
    ModelLifecycle,
    ModelManifest,
    ModelOutputFormat,
    ModelRuntimeContract
} from './model/manifest.js';
export type { ModelCacheFailure, ModelCacheFailureReason, VerifiedModelCache } from './model/model-cache.js';
export type { PrepareModelCacheOptions } from './model/downloader.js';
export type {
    CreateMiniLmTextEmbedderOptions,
    MiniLmTextEmbedder,
    OnnxBackend,
    OnnxSessionLike,
    OnnxTensorLike
} from './model/minilm-runtime.js';
export type {
    ConstrainedTextGenerationInput,
    ConstrainedTextGenerator,
    CreatePilotSftGeneratorOptions,
    JsonValueKind,
    PilotSamplingOptions,
    SftGrammarField
} from './model/sft-runtime.js';
export type {
    CausalLmInputs,
    CausalLmKeyValue,
    CausalLmOutputs,
    CausalLmSession,
    CausalTokenizer,
    CreateCausalTextGeneratorOptions
} from './model/causal-text-runtime.js';
export type { SmolLm2Tokenizer } from './model/smollm-tokenizer.js';
export type {
    CausalOnnxBackend,
    CausalOnnxConfig,
    CausalOnnxSession,
    CausalOnnxTensor,
    CreateCausalOnnxSessionOptions
} from './model/causal-onnx-session.js';
export type {
    LearnedComponentFactories,
    LearnedComponentFactory,
    LearnedRuntimeDiagnostic,
    LearnedRuntimeHandle,
    LoadedLearnedComponent
} from './model/learned-runtime.js';
export type { GeneratedDataCacheReadOptions, GeneratedDataCacheWriteOptions } from './cache/generated-data.js';
