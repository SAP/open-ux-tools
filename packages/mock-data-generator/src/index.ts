import { createHash } from 'node:crypto';
import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorCapabilities,
    MockDataGenerationProgress,
    MockDataGeneratorFingerprints,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime,
    MockDataGeneratorTierStatistics,
    MockDataGeneratorTypedFloorCauses,
    MockDataRow,
    MockDataServiceRequest,
    MockDataTarget,
    SemanticClassification,
    SftGenerationStatistics,
    ValueTier
} from './types.js';
import { VALUE_TIER } from './types.js';
import {
    assertRelationshipIntegrity,
    relationshipIntegrityFailures,
    generateDeterministicResources,
    retagValueTier,
    type ValueTierTally
} from './generation/deterministic.js';
import { propertyValueIsValid } from './generation/constraints.js';
import {
    applySftGeneration,
    assertSyntheticDomainGenerationReady,
    isProtocolArtifactEntitySet
} from './generation/sft.js';
import { authoredRows, preserveAuthoredRows } from './generation/authored.js';
import { finalizeSemanticServiceWorld } from './generation/service-world.js';
import { validateTemporalPlan } from './generation/temporal-plan.js';
import { parseEdmx } from './schema/edmx.js';
import { parseCsn } from './schema/csn.js';
import { classifySchema } from './semantics/classifier.js';
import { routingStatistics } from './semantics/routing-statistics.js';
import { arbitrateSemanticClassifications, resolveSemanticClassifications } from './semantics/lexical-fallback.js';
import { assertMetadataInputWithinLimit } from './metadata-limit.js';
import { assertGeneratedResultWithinLimit } from './result-limit.js';
import { buildServiceInspection, type ServiceInspectionExecution } from './inspection.js';
import type { SchemaGraph } from './schema/graph.js';
import { SEMANTIC_ROLE_REGISTRY, SEMANTIC_ROLE_REGISTRY_FINGERPRINT } from './semantics/role-registry.js';
import { SEMANTIC_CATALOG_FINGERPRINT } from './semantics/value-banks.js';
import { assertSemanticValues, compileSemanticPlan, demoteBoundSemanticRoles } from './generation/semantic-plan.js';
import { applyApplicationDomains, applySyntheticScenario } from './generation/scenario.js';
import { validateTupleDomains } from './generation/tuple-domain.js';
import { applyCurrencyMetadata, assertCurrencyMetadata } from './generation/currency-metadata.js';
import { applyCapCodeListMetadata } from './generation/code-list-metadata.js';
import { applyCountryMetadata } from './generation/country-metadata.js';
import { datePairs } from './generation/coherence.js';
import { DEFAULT_SAMPLE_DATASET, validateSampleDataset } from './semantics/sample-dataset.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, serializeFieldContextV3 } from './semantics/field-context.js';
import { createLearnedRuntime as createModelLearnedRuntime } from './model/learned-runtime.js';
import type { LearnedComponentFactories, LearnedRuntimeHandle } from './model/learned-runtime.js';
import type { ModelManifest } from './model/manifest.js';
import type { VerifiedModelArtifacts } from './model/runtime-artifacts.js';
import {
    GeneratedDataCacheValidationUnavailableError,
    readGeneratedDataCache as readValidatedCacheEntry,
    writeGeneratedDataCache as writeValidatedCacheEntry,
    type GeneratedDataCacheWriteOptions
} from './cache/generated-data.js';

export { createMockDataGenerator, getMockDataGeneratorInfo } from './standalone.js';
export { generateProjectData } from './project-data.js';
export type { GenerateProjectDataInput, GeneratedProjectData } from './project-data.js';
export type {
    CreateMockDataGeneratorOptions,
    MockDataGenerator,
    MockDataGeneratorInfo,
    StandaloneGenerationResult
} from './standalone.js';

export {
    buildEmbeddingFieldText,
    createEmbeddingSemanticClassifier,
    quantizeLogit
} from './model/embedding-classifier.js';
export {
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    FIELD_CONTEXT_SERIALIZER_VERSION,
    serializeFieldContextV3
} from './semantics/field-context.js';
export { SEMANTIC_ROLE_REGISTRY, SEMANTIC_ROLE_REGISTRY_FINGERPRINT } from './semantics/role-registry.js';
export { SEMANTIC_CATALOG_FINGERPRINT, SEMANTIC_CATALOG_VERSION } from './semantics/value-banks.js';
export { parseModelManifest } from './model/manifest.js';
export { createMiniLmTextEmbedder, loadOnnxBackend } from './model/minilm-runtime.js';
export { createPilotSftGenerator, renderPilotSftPrompt } from './model/sft-runtime.js';
export { createCausalTextGenerator } from './model/causal-text-runtime.js';
export { createSmolLm2Tokenizer } from './model/smollm-tokenizer.js';
export { createCausalOnnxSession, loadCausalOnnxBackend } from './model/causal-onnx-session.js';
export { DEFAULT_GENERATED_DATA_CACHE_BYTES, defaultGeneratedDataCacheRoot } from './cache/generated-data.js';
export {
    MAX_METADATA_INPUT_BYTES,
    MetadataInputTooLargeError,
    assertMetadataInputWithinLimit,
    isMetadataInputTooLargeError
} from './metadata-limit.js';
export {
    MAX_GENERATED_RESULT_BYTES,
    GeneratedResultTooLargeError,
    assertGeneratedResultWithinLimit
} from './result-limit.js';

/**
 * Build independently degradable learned runtimes with the package's semantic-v2 classifier contract.
 *
 * @param manifest - Verified model manifest.
 * @param cache - Verified local model cache.
 * @param factories - Optional test/component factories.
 * @returns Loaded classifier/SFT runtime plus degradation diagnostics.
 */
export async function createLearnedRuntime(
    manifest: ModelManifest,
    cache: VerifiedModelArtifacts,
    factories?: LearnedComponentFactories
): Promise<LearnedRuntimeHandle> {
    return createModelLearnedRuntime(manifest, cache, factories, {
        serializeV3Input: serializeFieldContextV3,
        v3Roles: SEMANTIC_ROLE_REGISTRY,
        v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
        v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
    });
}

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

const GENERATOR_LOGIC_VERSION = 25;

/**
 * Fingerprint every material generation input while excluding live process objects.
 *
 * @param request
 * @param options
 * @param learnedComponents
 */
/**
 * Marks every cell of a resource the caller supplied as authored, because `preserveAuthoredRows`
 * puts those rows back exactly as they arrived.
 *
 * @param tally the running value-tier tally
 * @param existingData the caller's own rows, by entity set
 */
function retagAuthoredResources(tally: ValueTierTally, existingData: Readonly<Record<string, ExistingMockData>>): void {
    for (const [resourceName, ownership] of Object.entries(existingData)) {
        const authored =
            ownership.initialRows.present && 'rows' in ownership.initialRows && ownership.initialRows.rows.length > 0;
        if (!authored) {
            continue;
        }
        for (const propertyName of tally.get(resourceName)?.keys() ?? []) {
            retagValueTier(tally, resourceName, propertyName, VALUE_TIER.authored);
        }
    }
}

/**
 * The tier that wrote most of a property's cells during the first generation sweep.
 *
 * @param tally the completed value-tier tally
 * @param resourceName the entity set
 * @param propertyName the property
 * @returns the dominant tier, or the typed floor when the sweep recorded nothing
 */
function dominantTier(tally: ValueTierTally, resourceName: string, propertyName: string): ValueTier {
    const tiers = tally.get(resourceName)?.get(propertyName);
    let dominant: ValueTier = VALUE_TIER.typed;
    let best = 0;
    for (const [tier, count] of tiers ?? []) {
        if (count > best) {
            dominant = tier;
            best = count;
        }
    }
    return dominant;
}

/**
 * Counts every cell of the published dataset against the tier that wrote it, and splits the typed
 * floor by cause in the same pass. Both are derived from one walk over the published rows so the
 * cause split always sums to the typed tier — cells the fine-tuned tier overwrote leave both at
 * once. Counting from the published rows also keeps later passes that add or drop rows from making
 * the totals disagree with what the caller receives.
 *
 * @param graph the schema graph, for the key and type of each property
 * @param tally the completed value-tier tally
 * @param targets the entity sets the caller asked for
 * @param resources the published rows
 * @param statistics the fine-tuned tier's own per-field accounting
 * @returns generated value slots by writing tier, and the typed floor by cause
 */
function valueTierStatistics(
    graph: SchemaGraph | undefined,
    tally: ValueTierTally,
    targets: ReadonlyArray<MockDataTarget>,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    statistics: SftGenerationStatistics
): { tiers: MockDataGeneratorTierStatistics; typedFloor: MockDataGeneratorTypedFloorCauses } {
    const accepted = new Map<string, number>();
    for (const assignment of statistics.assignments) {
        for (const field of assignment.fields) {
            accepted.set(`${assignment.resource}\u0000${field.name}`, field.acceptedSlots);
        }
    }
    const entities = new Map((graph?.entities ?? []).map((entity) => [entity.entitySetName, entity]));
    const counts: Record<ValueTier, number> = {
        authored: 0,
        declared: 0,
        recognised: 0,
        model: 0,
        typed: 0,
        structural: 0
    };
    const causes = { keys: 0, booleans: 0, protocol: 0, addressable: 0 };
    for (const { name } of targets) {
        const rows = resources[name] ?? [];
        if (rows.length === 0) {
            continue;
        }
        const properties = new Map((entities.get(name)?.properties ?? []).map((property) => [property.name, property]));
        for (const propertyName of Object.keys(rows[0])) {
            const written = Math.min(rows.length, accepted.get(`${name}\u0000${propertyName}`) ?? 0);
            const remaining = rows.length - written;
            const tier = dominantTier(tally, name, propertyName);
            counts.model += written;
            counts[tier] += remaining;
            if (tier !== VALUE_TIER.typed) {
                continue;
            }
            const property = properties.get(propertyName);
            if (isProtocolArtifactEntitySet(name)) {
                causes.protocol += remaining;
            } else if (property?.isKey) {
                causes.keys += remaining;
            } else if (property?.primitiveType === 'bool') {
                causes.booleans += remaining;
            } else {
                causes.addressable += remaining;
            }
        }
    }
    return {
        tiers: Object.freeze({ ...counts, slots: Object.values(counts).reduce((sum, count) => sum + count, 0) }),
        typedFloor: Object.freeze(causes)
    };
}

export function createGenerationFingerprint(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    learnedComponents: Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft' | 'relevance'> = {}
): string {
    assertMetadataInputWithinLimit(request.metadata);
    const pipeline = options.pipeline ?? 'legacy';
    return fingerprint({
        generatorLogicVersion: GENERATOR_LOGIC_VERSION,
        pipeline,
        ...(pipeline === 'semantic-v2'
            ? {
                  semanticPlanner: {
                      registry: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
                      catalog: SEMANTIC_CATALOG_FINGERPRINT,
                      serializer: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
                  }
              }
            : {}),
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

function runtimeFingerprints(
    options: MockDataGeneratorOptions,
    runtime: MockDataGeneratorRuntime
): Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft' | 'relevance'> {
    if (options.mode === 'deterministic') {
        return {};
    }
    return {
        ...(runtime.classifier ? { classifier: runtime.classifier.fingerprint } : {}),
        ...(runtime.sft ? { sft: runtime.sft.fingerprint } : {}),
        ...(runtime.candidateVerifier ? { relevance: runtime.candidateVerifier.fingerprint } : {})
    };
}

async function plannedRolesForRequest(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions,
    runtime: MockDataGeneratorRuntime
): Promise<Readonly<Record<string, string>> | undefined> {
    if (options.pipeline !== 'semantic-v2') {
        return undefined;
    }
    if (request.targets.length === 0) {
        return {};
    }
    const diagnostics: MockDataGeneratorResult['diagnostics'][number][] = [];
    const schema =
        request.metadata.format === 'edmx' ? parseEdmx(request.metadata.content) : parseCsn(request.metadata.content);
    const graph = applySyntheticScenario(
        applyApplicationDomains(schema, request.existingData, diagnostics),
        options.syntheticScenario,
        diagnostics
    );
    let classifierRun: Awaited<ReturnType<typeof classifySchema>> | undefined;
    if (options.mode !== 'deterministic' && runtime.classifier) {
        try {
            classifierRun = await classifySchema(
                graph,
                runtime.classifier,
                request.signal ?? new AbortController().signal,
                {
                    isolateFailures: true
                }
            );
        } catch (error) {
            if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
                throw error;
            }
            throw new GeneratedDataCacheValidationUnavailableError('Classifier plan validation is unavailable');
        }
        if (classifierRun.degraded) {
            throw new GeneratedDataCacheValidationUnavailableError('Classifier plan validation is degraded');
        }
    }
    const arbitrated = arbitrateSemanticClassifications(graph, classifierRun?.classifications ?? new Map());
    const planned = demoteBoundSemanticRoles(
        graph,
        compileSemanticPlan(graph, arbitrated, diagnostics, options.syntheticScenario, request.existingData),
        diagnostics,
        request.existingData
    );
    return Object.fromEntries(
        [...planned]
            .filter(([, candidate]) => candidate.role !== 'unknown')
            .map(([key, candidate]) => [key, candidate.role])
    );
}

function validateCurrentCacheResult(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions,
    expectedFingerprint: string,
    expectedComponents: Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft' | 'relevance'>,
    expectedRoles: Readonly<Record<string, string>> | undefined,
    result: MockDataGeneratorResult
): void {
    if (result.fingerprints.request !== expectedFingerprint) {
        throw new TypeError('Generated-data cache result does not match the current request and runtime');
    }
    for (const component of ['classifier', 'sft', 'relevance'] as const) {
        if (result.fingerprints[component] !== expectedComponents[component]) {
            throw new TypeError('Generated-data cache component identity differs from the current runtime');
        }
    }
    if (expectedRoles !== undefined && canonicalJson(result.semanticRoles) !== canonicalJson(expectedRoles)) {
        throw new TypeError('Generated-data cache semantic roles differ from the current plan');
    }
    validateGeneratedResult(request, result, options);
}

/**
 * Read only a cache snapshot valid for this request, generation configuration, and active runtime.
 *
 * @param cacheRoot
 * @param request
 * @param options
 * @param runtime
 */
export async function readGeneratedDataCache(
    cacheRoot: string,
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<MockDataGeneratorResult | undefined> {
    request.signal?.throwIfAborted();
    validateOptions(options);
    validateSampleDataset(options.sampleDataset ?? DEFAULT_SAMPLE_DATASET);
    const components = runtimeFingerprints(options, runtime);
    const key = createGenerationFingerprint(request, options, components);
    const result = await readValidatedCacheEntry(cacheRoot, key, {
        validate: async (cached) => {
            const roles = await plannedRolesForRequest(request, options, runtime);
            validateCurrentCacheResult(request, options, key, components, roles, cached);
        }
    });
    request.signal?.throwIfAborted();
    return result;
}

/**
 * Publish only a snapshot valid for this request, generation configuration, and active runtime.
 *
 * @param cacheRoot
 * @param request
 * @param options
 * @param generated
 * @param runtime
 * @param cacheOptions
 */
export async function writeGeneratedDataCache(
    cacheRoot: string,
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions,
    generated: MockDataGeneratorResult,
    runtime: MockDataGeneratorRuntime = {},
    cacheOptions: Pick<GeneratedDataCacheWriteOptions, 'maximumBytes'> = {}
): Promise<void> {
    request.signal?.throwIfAborted();
    validateOptions(options);
    validateSampleDataset(options.sampleDataset ?? DEFAULT_SAMPLE_DATASET);
    const components = runtimeFingerprints(options, runtime);
    const key = createGenerationFingerprint(request, options, components);
    await writeValidatedCacheEntry(cacheRoot, key, generated, {
        ...cacheOptions,
        validate: async (cached) => {
            const roles = await plannedRolesForRequest(request, options, runtime);
            validateCurrentCacheResult(request, options, key, components, roles, cached);
        }
    });
    request.signal?.throwIfAborted();
}

/**
 * Validate a generated snapshot against the current request before it is served from a persistent cache.
 *
 * @param request
 * @param result
 * @param options
 */
export function validateGeneratedResult(
    request: MockDataServiceRequest,
    result: MockDataGeneratorResult,
    options: MockDataGeneratorOptions = {}
): void {
    assertMetadataInputWithinLimit(request.metadata);
    assertGeneratedResultWithinLimit(result);
    if (
        options.pipeline === 'semantic-v2' ||
        result.semanticRoles !== undefined ||
        result.semanticPlanFingerprint !== undefined
    ) {
        if (
            !result.semanticRoles ||
            result.semanticPlanFingerprint !==
                createHash('sha256')
                    .update(canonicalJson({ request: result.fingerprints.request, roles: result.semanticRoles }))
                    .digest('hex')
        ) {
            throw new TypeError('Semantic plan metadata is absent or inconsistent');
        }
    }
    const graph = applySyntheticScenario(
        applyApplicationDomains(
            request.metadata.format === 'edmx'
                ? parseEdmx(request.metadata.content)
                : parseCsn(request.metadata.content),
            request.existingData,
            []
        ),
        options.syntheticScenario,
        []
    );
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const targets = new Map(request.targets.map((target) => [target.name, target]));
    const skippedEntitySets = new Set((graph.skippedEntitySets ?? []).map(({ entitySetName }) => entitySetName));

    for (const resourceName of Object.keys(result.resources)) {
        if (!targets.has(resourceName)) {
            throw new TypeError(`Generated resource ${resourceName} was not requested`);
        }
    }
    for (const [targetName, target] of targets) {
        const entity = entities.get(targetName);
        if (!entity && skippedEntitySets.has(targetName)) {
            if (result.resources[targetName] !== undefined) {
                throw new TypeError(
                    `Generated resource ${targetName} belongs to an entity set that cannot be generated`
                );
            }
            if (
                !result.diagnostics.some(
                    ({ code, target: diagnosticTarget }) =>
                        code === 'SCHEMA_ENTITY_SET_SKIPPED' && diagnosticTarget === targetName
                )
            ) {
                throw new TypeError(`Skipped target ${targetName} is not reported in the diagnostics`);
            }
            continue;
        }
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
        const rules = options.syntheticScenario?.coherence?.[targetName] ?? ['temporal'];
        const orderedPairs =
            options.pipeline !== 'semantic-v2' && rules.includes('temporal')
                ? datePairs(entity).filter(
                      ([start, end]) =>
                          !start.enumValues &&
                          !end.enumValues &&
                          !graph.relationships.some((relationship) =>
                              relationship.mappings.some(
                                  ({ sourceProperty, targetProperty }) =>
                                      (relationship.fromEntitySet === targetName &&
                                          [start.name, end.name].includes(sourceProperty)) ||
                                      (relationship.toEntitySet === targetName &&
                                          [start.name, end.name].includes(targetProperty))
                              )
                          ) &&
                          !entity.properties.some((owner) =>
                              owner.links?.valueListMappings?.some(({ localProperty }) =>
                                  [start.name, end.name].includes(localProperty)
                              )
                          )
                  )
                : [];
        const keys = new Set<string>();
        // Supplied rows lead the resource and are published as the caller wrote them, including
        // columns the schema no longer declares and values it would not generate.
        const supplied = authoredRows(request.existingData[targetName]);
        const suppliedCell = (rowIndex: number, propertyName: string, value: JsonValue | undefined): boolean =>
            rowIndex < supplied.length &&
            Object.hasOwn(supplied[rowIndex], propertyName) &&
            canonicalJson(supplied[rowIndex][propertyName]) === canonicalJson(value);
        for (const [rowIndex, row] of rows.entries()) {
            for (const [start, end] of orderedPairs) {
                if (
                    typeof row[start.name] === 'string' &&
                    typeof row[end.name] === 'string' &&
                    Date.parse(String(row[start.name])) > Date.parse(String(row[end.name]))
                ) {
                    throw new TypeError(
                        `Synthetic temporal ordering failed for ${targetName}.${start.name}/${end.name}`
                    );
                }
            }
            for (const propertyName of Object.keys(row)) {
                if (!properties.has(propertyName) && !suppliedCell(rowIndex, propertyName, row[propertyName])) {
                    throw new TypeError(`Generated resource ${targetName} contains unknown property ${propertyName}`);
                }
            }
            for (const property of entity.properties) {
                if (!Object.prototype.hasOwnProperty.call(row, property.name)) {
                    throw new TypeError(`Generated resource ${targetName} is missing property ${property.name}`);
                }
                if (
                    !propertyValueIsValid(property, row[property.name]) &&
                    !suppliedCell(rowIndex, property.name, row[property.name])
                ) {
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
    assertRelationshipIntegrity(
        result.semanticRoles
            ? graph
            : {
                  ...graph,
                  relationships: graph.relationships.filter(({ provenance }) => provenance !== 'inferred')
              },
        result.resources,
        request.existingData
    );
    if (result.semanticRoles) {
        const authoredPreserved = preserveAuthoredRows(graph, result.resources, request.existingData, []);
        for (const [resourceName, rows] of Object.entries(authoredPreserved)) {
            const published = result.resources[resourceName] ?? [];
            const changedRow = rows.findIndex((row, index) => canonicalJson(row) !== canonicalJson(published[index]));
            if (changedRow >= 0 || rows.length !== published.length) {
                const changedProperty = Object.keys(rows[changedRow] ?? {}).find(
                    (name) => canonicalJson(rows[changedRow][name]) !== canonicalJson(published[changedRow]?.[name])
                );
                throw new TypeError(
                    `Authored evidence was not preserved in the generated result for ${resourceName}` +
                        (changedProperty ? `.${changedProperty}` : '')
                );
            }
        }
        const temporalFailures = validateTemporalPlan(
            graph,
            result.resources,
            options.syntheticScenario?.temporalConstraints,
            options.syntheticScenario?.coherence
        );
        for (const failure of temporalFailures) {
            // Conflicting protected assignments remain inspectable, but their failed
            // invariant must travel with the result, including through the cache.
            if (
                !result.diagnostics.some(
                    ({ code, target, message }) =>
                        code === failure.code && target === failure.target && message === failure.message
                )
            ) {
                throw new TypeError(`Temporal validation failed for ${failure.target}`);
            }
        }
        assertSemanticValues(graph, result.resources, result.semanticRoles);
        assertCurrencyMetadata(graph, result.resources);
        const invalidTuple = validateTupleDomains(
            graph,
            result.resources,
            request.existingData,
            result.semanticRoles
        ).find(({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID');
        if (invalidTuple) {
            throw new TypeError(`Semantic tuple validation failed for ${invalidTuple.target}`);
        }
    }
}

/**
 * Report the schema elements a requested resource leaves out: entity sets whose rows cannot be
 * generated, and properties whose type has no generatable inline JSON value.
 *
 * @param graph - Parsed service schema.
 * @param targets - Resources the caller requested.
 * @returns One warning per skipped requested entity set and one info per omitted property.
 */
function schemaCoverageDiagnostics(
    graph: SchemaGraph,
    targets: ReadonlyArray<MockDataTarget>
): MockDataGeneratorResult['diagnostics'][number][] {
    const requested = new Set(targets.map(({ name }) => name));
    return [
        ...(graph.skippedEntitySets ?? [])
            .filter(({ entitySetName }) => requested.has(entitySetName))
            .map(({ entitySetName, reason }) => ({
                code: 'SCHEMA_ENTITY_SET_SKIPPED',
                severity: 'warning' as const,
                target: entitySetName,
                message: `No rows are generated for this entity set because its ${reason}.`
            })),
        ...graph.entities
            .filter(({ entitySetName }) => requested.has(entitySetName))
            .flatMap(({ entitySetName, omittedProperties }) =>
                (omittedProperties ?? []).map(({ name, declaredType }) => ({
                    code: 'SCHEMA_PROPERTY_OMITTED',
                    severity: 'info' as const,
                    target: `${entitySetName}.${name}`,
                    message: `${declaredType} has no generatable inline JSON value, so generated rows omit this property.`
                }))
            )
    ];
}

/**
 * Align the reported temporal violations with the final rows.
 * Passes after reconciliation, such as derived child-domain alignment, can copy protected,
 * conflicting dates into further rows; every violation must travel with the result.
 *
 * @param graph - Service schema.
 * @param resources - Final generated rows.
 * @param scenario - Caller scenario with explicit temporal constraints and coherence rules.
 * @param diagnostics - Receives the final violations in place of the reconciliation-time ones.
 */
function reportFinalTemporalViolations(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    scenario: MockDataGeneratorOptions['syntheticScenario'],
    diagnostics: MockDataGeneratorResult['diagnostics'][number][]
): void {
    const final = validateTemporalPlan(graph, resources, scenario?.temporalConstraints, scenario?.coherence);
    const same =
        (left: MockDataGeneratorResult['diagnostics'][number]) =>
        (right: MockDataGeneratorResult['diagnostics'][number]): boolean =>
            left.code === right.code && left.target === right.target && left.message === right.message;
    for (let index = diagnostics.length - 1; index >= 0; index -= 1) {
        if (diagnostics[index].code === 'TEMPORAL_CONSTRAINT_VIOLATION' && !final.some(same(diagnostics[index]))) {
            diagnostics.splice(index, 1);
        }
    }
    diagnostics.push(...final.filter((failure) => !diagnostics.some(same(failure))));
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
        (!Number.isSafeInteger(options.sftTimeoutMs) || options.sftTimeoutMs <= 0 || options.sftTimeoutMs > 120_000)
    ) {
        throw new TypeError('Mock data generator SFT timeout must be an integer between 1 and 120000 milliseconds');
    }
    if (
        options.sftBudgetMs !== undefined &&
        (!Number.isSafeInteger(options.sftBudgetMs) || options.sftBudgetMs <= 0 || options.sftBudgetMs > 120_000)
    ) {
        throw new TypeError('Mock data generator SFT budget must be an integer between 1 and 120000 milliseconds');
    }
    if (options.pipeline !== undefined && !['legacy', 'semantic-v2'].includes(options.pipeline)) {
        throw new TypeError('Mock data generator pipeline must be legacy or semantic-v2');
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

function reportProgress(runtime: MockDataGeneratorRuntime, event: MockDataGenerationProgress): void {
    try {
        runtime.onProgress?.(event);
    } catch {
        // Progress observers are diagnostics only and must never affect generation.
    }
}

/**
 * Generate a complete, coherent snapshot for the requested service resources.
 *
 * @param request
 * @param options
 * @param runtime
 */
async function executeServiceGeneration(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<ServiceInspectionExecution> {
    if (options.pipeline === 'semantic-v2') {
        request.signal?.throwIfAborted();
    }
    const startedAt = performance.now();
    const rssBefore = process.memoryUsage().rss;
    const timingsMs: Record<string, number> = {};
    validateOptions(options);
    validateSampleDataset(options.sampleDataset ?? DEFAULT_SAMPLE_DATASET);
    assertMetadataInputWithinLimit(request.metadata);
    const activeRuntime: MockDataGeneratorRuntime =
        options.mode === 'deterministic'
            ? { ...(runtime.onProgress ? { onProgress: runtime.onProgress } : {}) }
            : runtime;
    let resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>> = Object.freeze({});
    const valueTiers: ValueTierTally = new Map();
    const projectedProperties = new Map<string, Set<string>>();
    const diagnostics: MockDataGeneratorResult['diagnostics'][number][] = [];
    let classifierDegraded = false;
    let sftDegraded = false;
    let sftStatistics: MockDataGeneratorResult['statistics']['sft'] = Object.freeze({
        attempts: 0,
        parsedResponses: 0,
        eligibleSlots: 0,
        acceptedSlots: 0,
        rejectedSlots: 0,
        fallbackSlots: 0,
        assignments: Object.freeze([])
    });
    let graph: SchemaGraph | undefined;
    let rawClassifications: ReadonlyMap<string, SemanticClassification> = new Map();
    let detectedClassifications: ReadonlyMap<string, SemanticClassification> = new Map();
    let classifications: ReadonlyMap<string, SemanticClassification> = new Map();
    let relevanceVerifiedResources: ReadonlySet<string> = new Set();
    // Requested entity sets the schema cannot generate are reported and left out; the rest proceed.
    let generationTargets: ReadonlyArray<MockDataTarget> = request.targets;
    if (request.targets.length > 0) {
        const tier0StartedAt = performance.now();
        reportProgress(activeRuntime, { tier: 'T0', phase: 'start' });
        const parseStartedAt = performance.now();
        graph =
            request.metadata.format === 'edmx'
                ? parseEdmx(request.metadata.content)
                : parseCsn(request.metadata.content);
        timingsMs.schema = performance.now() - parseStartedAt;
        const skippedEntitySets = new Set((graph.skippedEntitySets ?? []).map(({ entitySetName }) => entitySetName));
        generationTargets = request.targets.filter(({ name }) => !skippedEntitySets.has(name));
        diagnostics.push(...schemaCoverageDiagnostics(graph, request.targets));
        graph = applyApplicationDomains(graph, request.existingData, diagnostics);
        graph = applySyntheticScenario(graph, options.syntheticScenario, diagnostics);
        for (const entity of graph.entities) {
            if (
                datePairs(entity).length > 0 &&
                !options.syntheticScenario?.temporalConstraints?.some(
                    ({ resource }) => resource === entity.entitySetName
                ) &&
                options.syntheticScenario?.coherence?.[entity.entitySetName] === undefined
            ) {
                diagnostics.push({
                    code: 'SYNTHETIC_TEMPORAL_ORDERING',
                    severity: 'info',
                    target: entity.entitySetName,
                    message:
                        'Synthetic date-range samples use start <= end. This is a sampling assumption, not an application constraint; an explicit coherence list overrides it.'
                });
            }
        }
        diagnostics.push({
            code: 'SYNTHETIC_DATASET_USED',
            severity: 'info',
            message:
                'Generated text uses versioned synthetic samples; samples do not establish application validity or realism.'
        });
        if (options.pipeline !== 'semantic-v2') {
            graph = {
                ...graph,
                relationships: graph.relationships.filter(({ provenance }) => provenance !== 'inferred')
            };
        }
        const signal = request.signal ?? new AbortController().signal;
        const tier1StartedAt = performance.now();
        reportProgress(activeRuntime, { tier: 'T1', phase: 'start' });
        if (activeRuntime.classifier) {
            const classifierStartedAt = performance.now();
            const classifierRun = await classifySchema(graph, activeRuntime.classifier, signal, {
                isolateFailures: options.pipeline === 'semantic-v2'
            });
            rawClassifications = classifierRun.classifications;
            diagnostics.push(...classifierRun.diagnostics);
            classifierDegraded = classifierRun.degraded;
            timingsMs.classifier = performance.now() - classifierStartedAt;
        }
        const arbitrationStartedAt = performance.now();
        classifications =
            options.pipeline === 'semantic-v2'
                ? arbitrateSemanticClassifications(graph, rawClassifications)
                : resolveSemanticClassifications(graph, rawClassifications);
        detectedClassifications = classifications;
        timingsMs.arbitration = performance.now() - arbitrationStartedAt;
        const deterministicStartedAt = performance.now();
        classifications = compileSemanticPlan(
            graph,
            classifications,
            diagnostics,
            options.syntheticScenario,
            request.existingData
        );
        if (options.pipeline === 'semantic-v2') {
            classifications = demoteBoundSemanticRoles(graph, classifications, diagnostics, request.existingData);
            assertSyntheticDomainGenerationReady(
                graph,
                new Set(generationTargets.map(({ name }) => name)),
                request.existingData,
                classifications,
                activeRuntime.sft !== undefined,
                activeRuntime.candidateVerifier !== undefined,
                options
            );
        }
        reportProgress(activeRuntime, {
            tier: 'T1',
            phase: 'complete',
            durationMs: performance.now() - tier1StartedAt
        });
        const plannedRoles = Object.fromEntries(
            [...classifications]
                .filter(([, candidate]) => candidate.role !== 'unknown')
                .map(([key, candidate]) => [key, candidate.role])
        );
        const deterministic = generateDeterministicResources(
            graph,
            generationTargets,
            options,
            classifications,
            request.existingData,
            activeRuntime.classifier?.conceptBank
        );
        deterministic.valueTiers.forEach((properties, resourceName) => valueTiers.set(resourceName, properties));
        resources = applyCurrencyMetadata(graph, deterministic.resources, diagnostics, options.locale);
        resources = applyCountryMetadata(graph, resources, diagnostics, options.locale, classifications);
        resources = applyCapCodeListMetadata(graph, resources, valueTiers, options.locale);
        if (options.pipeline === 'semantic-v2') {
            resources = preserveAuthoredRows(graph, resources, request.existingData, diagnostics);
            retagAuthoredResources(valueTiers, request.existingData);
        }
        if (options.pipeline === 'semantic-v2') {
            assertSemanticValues(graph, resources, plannedRoles);
        }
        diagnostics.push(...deterministic.diagnostics);
        timingsMs.deterministic = performance.now() - deterministicStartedAt;
        reportProgress(activeRuntime, {
            tier: 'T0',
            phase: 'complete',
            durationMs: performance.now() - tier0StartedAt
        });
        if (activeRuntime.sft) {
            const sftStartedAt = performance.now();
            const sftRun = await applySftGeneration(
                graph,
                resources,
                request.service,
                options,
                classifications,
                activeRuntime.sft,
                signal,
                request.existingData,
                activeRuntime.onProgress,
                activeRuntime.candidateVerifier
            );
            resources = sftRun.resources;
            if (options.pipeline === 'semantic-v2') {
                assertSemanticValues(graph, resources, plannedRoles);
            }
            diagnostics.push(...sftRun.diagnostics);
            sftDegraded = sftRun.degraded;
            sftStatistics = sftRun.statistics;
            relevanceVerifiedResources = sftRun.relevanceVerifiedResources;
            timingsMs.sft = performance.now() - sftStartedAt;
        }
        if (options.pipeline === 'semantic-v2') {
            const finalizationStartedAt = performance.now();
            // Format providers take part in value-list projection, so owners copy the companions
            // of the final value-help codes (see finalizeSemanticServiceWorld).
            const schemaGraph = graph;
            const finalClassifications = classifications;
            resources = finalizeSemanticServiceWorld(
                graph,
                resources,
                request.existingData,
                options.seed ?? 1,
                classifications,
                diagnostics,
                options.syntheticScenario?.coherence,
                new Map(generationTargets.map((target) => [target.name, target.kind])),
                options.syntheticScenario?.temporalConstraints,
                relevanceVerifiedResources,
                projectedProperties,
                (world) =>
                    applyCapCodeListMetadata(
                        schemaGraph,
                        applyCountryMetadata(
                            schemaGraph,
                            applyCurrencyMetadata(schemaGraph, world, diagnostics, options.locale),
                            diagnostics,
                            options.locale,
                            finalClassifications
                        ),
                        valueTiers,
                        options.locale
                    )
            );
            // A projected cell carries the value of the entity it points at, so it belongs to the
            // tier that supplied that value rather than to the deterministic sweep that filled it
            // before projection ran.
            for (const [resourceName, properties] of projectedProperties) {
                for (const propertyName of properties) {
                    retagValueTier(valueTiers, resourceName, propertyName, VALUE_TIER.recognised);
                }
            }
            // Generated value-help domains can expand while solving cross-resource tuples.
            // Re-run format providers so derived companions describe the final codes rather
            // than the source row that was cloned to create the new domain member.
            resources = applyCurrencyMetadata(graph, resources, diagnostics, options.locale);
            resources = applyCountryMetadata(graph, resources, diagnostics, options.locale, classifications);
            resources = applyCapCodeListMetadata(graph, resources, valueTiers, options.locale);
            // Supplied rows are published as the caller wrote them. Derivations, projections and
            // format providers above work on whole resources, so restore every supplied cell once
            // they have all run; the checks below then treat those cells as fixed.
            resources = preserveAuthoredRows(graph, resources, request.existingData, []);
            reportFinalTemporalViolations(graph, resources, options.syntheticScenario, diagnostics);
            timingsMs.finalization = performance.now() - finalizationStartedAt;
            diagnostics.push(...validateTupleDomains(graph, resources, request.existingData, plannedRoles));
        }
        const relationshipStartedAt = performance.now();
        assertRelationshipIntegrity(graph, resources, request.existingData);
        const unresolvedSupplied = new Set(
            relationshipIntegrityFailures(graph, resources, request.existingData).map(
                ({ relationship }) => `${relationship.fromEntitySet}.${relationship.name}`
            )
        );
        for (const target of unresolvedSupplied) {
            diagnostics.push({
                code: 'SUPPLIED_REFERENCE_UNRESOLVED',
                severity: 'warning',
                target,
                message: 'Supplied rows reference rows that do not exist; they are published as written.'
            });
        }
        timingsMs.relationships = performance.now() - relationshipStartedAt;
    }
    const semanticRoles =
        options.pipeline === 'semantic-v2'
            ? Object.freeze(
                  Object.fromEntries(
                      [...classifications]
                          .filter(([, candidate]) => candidate.role !== 'unknown')
                          .map(([key, candidate]) => [key, candidate.role])
                  )
              )
            : undefined;
    const learnedComponents = runtimeFingerprints(options, activeRuntime);
    const requestFingerprint = createGenerationFingerprint(request, options, learnedComponents);
    const result = Object.freeze({
        resources,
        ...(semanticRoles
            ? {
                  semanticRoles,
                  semanticPlanFingerprint: createHash('sha256')
                      .update(canonicalJson({ request: requestFingerprint, roles: semanticRoles }))
                      .digest('hex')
              }
            : {}),
        diagnostics: Object.freeze(diagnostics),
        capabilities: Object.freeze(capabilities(activeRuntime, classifierDegraded, sftDegraded)),
        fingerprints: Object.freeze({
            request: requestFingerprint,
            ...learnedComponents
        }),
        statistics: Object.freeze({ sft: sftStatistics }),
        routing: routingStatistics(graph, generationTargets, detectedClassifications, classifications),
        ...valueTierStatistics(graph, valueTiers, generationTargets, resources, sftStatistics)
    });
    assertGeneratedResultWithinLimit(result);
    if (options.pipeline === 'semantic-v2') {
        validateGeneratedResult(request, result, options);
    }
    timingsMs.total = performance.now() - startedAt;
    if (request.targets.length > 0) {
        const rowCount = Object.values(resources).reduce((total, rows) => total + rows.length, 0);
        const remainingSlots = sftStatistics.fallbackSlots;
        reportProgress(activeRuntime, {
            tier: 'T3',
            phase: 'complete',
            rowCount,
            ...(remainingSlots > 0 ? { fallbackSlots: remainingSlots } : {}),
            durationMs: timingsMs.total
        });
    }
    return Object.freeze({
        result,
        graph,
        rawClassifications,
        detectedClassifications,
        classifications,
        syntheticInputs: {
            dataset: {
                id: (options.sampleDataset ?? DEFAULT_SAMPLE_DATASET).id,
                version: (options.sampleDataset ?? DEFAULT_SAMPLE_DATASET).version,
                sha256: fingerprint(options.sampleDataset ?? DEFAULT_SAMPLE_DATASET)
            },
            ...(options.syntheticScenario
                ? {
                      scenario: {
                          id: options.syntheticScenario.id,
                          version: options.syntheticScenario.version,
                          sha256: fingerprint(options.syntheticScenario)
                      }
                  }
                : {})
        },
        pipeline: options.pipeline ?? 'legacy',
        ...(options.locale ? { locale: options.locale } : {}),
        artifactIdentity: {
            ...(activeRuntime.classifier
                ? {
                      classifier: {
                          fingerprint: activeRuntime.classifier.fingerprint,
                          inputFormat: activeRuntime.classifier.inputFormat ?? ('unspecified' as const)
                      }
                  }
                : {}),
            ...(activeRuntime.sft ? { sft: { fingerprint: activeRuntime.sft.fingerprint } } : {})
        },
        timingsMs: Object.freeze(timingsMs),
        rssBytes: Object.freeze({ before: rssBefore, after: process.memoryUsage().rss })
    });
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
    return (await executeServiceGeneration(request, options, runtime)).result;
}

/**
 * Inspect the exact generation execution using a versioned, privacy-aware local report.
 *
 * @param request
 * @param options
 * @param runtime
 * @param inspectionOptions
 */
export async function inspectService(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {},
    inspectionOptions: MockDataGeneratorInspectionOptions = {}
): Promise<MockDataGeneratorInspectionV1> {
    if (
        inspectionOptions.includeGeneratedValues !== undefined &&
        typeof inspectionOptions.includeGeneratedValues !== 'boolean'
    ) {
        throw new TypeError('includeGeneratedValues must be a boolean');
    }
    const execution = await executeServiceGeneration(request, options, runtime);
    validateGeneratedResult(request, execution.result, options);
    return buildServiceInspection(request, execution, inspectionOptions);
}

export type {
    ExistingInitialRows,
    ExistingMockData,
    FieldContextV3,
    JsonPrimitive,
    JsonValue,
    MockDataGeneratorCapabilities,
    MockDataGenerationProgress,
    MockDataGenerationProgressPhase,
    MockDataGenerationTier,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorFingerprints,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorInvariantInspection,
    MockDataGeneratorFieldDecisionInspection,
    MockDataGeneratorRelationshipInspection,
    MockDataSourceOwnershipInspection,
    MockDataGeneratorOptions,
    SyntheticSampleDataset,
    SyntheticScenario,
    SyntheticCoherenceRule,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime,
    MockDataGeneratorStatistics,
    MockDataMetadata,
    MockDataRow,
    MockDataServiceIdentity,
    MockDataServiceRequest,
    MockDataTarget,
    SemanticClassification,
    SemanticClassifier,
    SemanticClassifierInput,
    SftAssignmentStatistics,
    SftFieldRequest,
    SftFieldStatistics,
    SftGenerationStatistics,
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
export type { VerifiedModelArtifacts } from './model/runtime-artifacts.js';
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
