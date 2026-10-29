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
    syntheticDomainReadinessDiagnostics,
    isProtocolArtifactEntitySet
} from './generation/sft.js';
import { authoredRows, generatedRowFlags, preserveAuthoredRows } from './generation/authored.js';
import { withholdUnrealisticValues } from './generation/realism-guard.js';
import { applyStandardFallback } from './generation/standard-fallback.js';
import { standardFallbackTest } from './spec/standard-mockserver.js';
import { assessRealism, REALISM_CHECKS_VERSION, REALISM_HARD_CHECKS } from './quality/realism.js';
import { finalizeSemanticServiceWorld } from './generation/service-world.js';
import { reconcileCodeTexts } from './generation/code-texts.js';
import { validateTemporalPlan } from './generation/temporal-plan.js';
import { parseServiceMetadata } from './schema/parse-metadata.js';
import { classifySchema, semanticPropertyKey } from './semantics/classifier.js';
import { routingStatistics } from './semantics/routing-statistics.js';
import { arbitrateSemanticClassifications } from './semantics/lexical-fallback.js';
import { assertMetadataInputWithinLimit } from './metadata-limit.js';
import { assertGeneratedResultWithinLimit } from './result-limit.js';
import { buildServiceInspection, type ServiceInspectionExecution } from './inspection.js';
import type { SchemaGraph, SchemaProperty } from './schema/graph.js';
import { packagedRoleRegistry } from './semantics/role-registry.js';
import { semanticCatalogFingerprint, validateSampleDataset } from './semantics/value-banks.js';
import { assertSemanticValues, compileSemanticPlan, demoteBoundSemanticRoles } from './generation/semantic-plan.js';
import { applyApplicationDomains, applySyntheticScenario } from './generation/scenario.js';
import { adoptCompatibleTuples, validateTupleDomains } from './generation/tuple-domain.js';
import { applyCurrencyMetadata, assertCurrencyMetadata } from './generation/currency-metadata.js';
import { applyCapCodeListMetadata } from './generation/code-list-metadata.js';
import { applyCountryMetadata } from './generation/country-metadata.js';
import { datePairs } from './generation/coherence.js';
import { packagedBanks, packagedConceptBank } from './semantics/bank-store.js';
import { FIELD_CONTEXT_SERIALIZER_FINGERPRINT, serializeFieldContextV3 } from './semantics/field-context.js';
import { createLearnedRuntime as createModelLearnedRuntime } from './model/learned-runtime.js';
import type { SftCompletionStore } from './model/sft-runtime.js';
import type { LearnedComponentFactories, LearnedRuntimeHandle } from './model/learned-runtime.js';
import type { PackagedModelManifest } from './model/packaged-models.js';
import type { VerifiedModelArtifacts } from './model/runtime-artifacts.js';
import {
    DEADLINE_FINALIZATION_RESERVE_MS,
    DEFAULT_SFT_SERVICE_BUDGET_MS,
    MAX_ROWS_PER_ENTITY,
    MAX_SFT_DEADLINE_MS,
    MAX_SFT_TIME_LIMIT_MS
} from './limits.js';
import { validateDateWindowOptions } from './date-window.js';
import { canonicalJson, sha256 } from './hash.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { t } from './i18n.js';

/**
 * Build independently degradable learned runtimes with the package's semantic-v2 classifier contract.
 *
 * @param manifest - Verified model manifest.
 * @param cache - Verified local model cache.
 * @param factories - Optional test/component factories.
 * @param options - `completionStore` keeps model answers (the process-wide in-memory store when absent).
 * @param options.completionStore - See above.
 * @returns Loaded classifier/SFT runtime plus degradation diagnostics.
 */
export async function createLearnedRuntime(
    manifest: PackagedModelManifest,
    cache: VerifiedModelArtifacts,
    factories?: LearnedComponentFactories,
    options: Readonly<{ completionStore?: SftCompletionStore }> = {}
): Promise<LearnedRuntimeHandle> {
    return createModelLearnedRuntime(
        manifest,
        cache,
        factories,
        {
            serializeV3Input: serializeFieldContextV3,
            v3Roles: packagedRoleRegistry().roles,
            v3RegistryFingerprint: packagedRoleRegistry().fingerprint,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
            conceptBank: packagedConceptBank
        },
        options
    );
}

function fingerprint(value: unknown): string {
    return sha256(canonicalJson(value));
}

const GENERATOR_LOGIC_VERSION = 45;

/**
 * Marks every cell of a resource the caller supplied as authored, because `preserveAuthoredRows`
 * puts those rows back exactly as they arrived.
 *
 * @param tally the running value-tier tally
 * @param existingData the caller's own rows, by entity set
 */
function retagAuthoredResources(tally: ValueTierTally, existingData: Readonly<Record<string, ExistingMockData>>): void {
    for (const [resourceName, ownership] of Object.entries(existingData)) {
        if (authoredRows(ownership).length === 0) {
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
 * Why a typed-floor column of a resource has no better tier: a protocol artifact, a key, a boolean, or
 * an addressable field no tier could fill.
 *
 * @param resource the entity set
 * @param property the column's property, when the schema declares it
 * @returns the typed-floor cause
 */
function typedFloorCause(
    resource: string,
    property: SchemaProperty | undefined
): keyof MockDataGeneratorTypedFloorCauses {
    if (isProtocolArtifactEntitySet(resource)) {
        return 'protocol';
    }
    if (property?.isKey) {
        return 'keys';
    }
    return property?.primitiveType === 'bool' ? 'booleans' : 'addressable';
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
 * @returns generated value slots by writing tier, the typed floor by cause, and each published
 * property's split between the fine-tuned tier and the tier that wrote its remaining cells
 */
function valueTierStatistics(
    graph: SchemaGraph | undefined,
    tally: ValueTierTally,
    targets: ReadonlyArray<MockDataTarget>,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    statistics: SftGenerationStatistics
): {
    tiers: MockDataGeneratorTierStatistics;
    typedFloor: MockDataGeneratorTypedFloorCauses;
    abstained: number;
    fieldTiers: ReadonlyMap<string, Readonly<{ tier: ValueTier; cells: number; modelCells: number }>>;
} {
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
    const isFallback = graph ? standardFallbackTest(graph) : (): boolean => false;
    let abstained = 0;
    const fieldTiers = new Map<string, Readonly<{ tier: ValueTier; cells: number; modelCells: number }>>();
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
            fieldTiers.set(
                semanticPropertyKey(name, propertyName),
                Object.freeze({ tier, cells: rows.length, modelCells: written })
            );
            if (tier !== VALUE_TIER.typed) {
                continue;
            }
            const cause = typedFloorCause(name, properties.get(propertyName));
            causes[cause] += remaining;
            if (cause === 'addressable') {
                // The model writes no empty values, so every empty cell of the column, and every cell the standard
                // fallback filled after the floor left it empty, is one the floor abstained on.
                const empty = rows.filter(
                    (row) => row[propertyName] === null || row[propertyName] === '' || isFallback(row[propertyName])
                ).length;
                abstained += Math.min(remaining, empty);
            }
        }
    }
    return {
        tiers: Object.freeze({ ...counts, slots: Object.values(counts).reduce((sum, count) => sum + count, 0) }),
        typedFloor: Object.freeze(causes),
        abstained,
        fieldTiers
    };
}

export function createGenerationFingerprint(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    learnedComponents: Pick<MockDataGeneratorFingerprints, 'classifier' | 'sft' | 'relevance'> = {}
): string {
    assertMetadataInputWithinLimit(request.metadata);
    return fingerprint({
        generatorLogicVersion: GENERATOR_LOGIC_VERSION,
        pipeline: 'semantic-v2',
        semanticPlanner: {
            registry: packagedRoleRegistry().fingerprint,
            catalog: semanticCatalogFingerprint(),
            serializer: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        },
        request: {
            metadata: request.metadata,
            service: request.service,
            targets: request.targets,
            existingData: request.existingData
        },
        options: { ...options, pipeline: 'semantic-v2' },
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

/** Work the generator has already done for a result, so validation does not repeat it. */
interface GeneratedResultValidationContext {
    /** The request metadata as parsed, before application domains and scenarios are applied. */
    parsedGraph?: SchemaGraph;
    /** Size of the serialized result, as measured by assertGeneratedResultWithinLimit. */
    resultBytes?: number;
}

/**
 * Check the rows of one requested resource: a skipped entity set has none and is reported; any other
 * target has the requested row count, every declared property with a valid value, no undeclared
 * property and no duplicate key. Supplied cells are published as the caller wrote them and pass as they are.
 *
 * @param request the generation request
 * @param result the generated result
 * @param target the requested resource
 * @param entity the entity the schema declares for the target, if any
 * @param skippedEntitySets entity sets the schema cannot generate
 * @throws {TypeError} when the resource breaks one of these rules
 */
function assertGeneratedTarget(
    request: MockDataServiceRequest,
    result: MockDataGeneratorResult,
    target: MockDataTarget,
    entity: SchemaGraph['entities'][number] | undefined,
    skippedEntitySets: ReadonlySet<string>
): void {
    const targetName = target.name;
    if (!entity && skippedEntitySets.has(targetName)) {
        if (result.resources[targetName] !== undefined) {
            throw new TypeError(`Generated resource ${targetName} belongs to an entity set that cannot be generated`);
        }
        if (
            !result.diagnostics.some(
                ({ code, target: diagnosticTarget }) =>
                    code === 'SCHEMA_ENTITY_SET_SKIPPED' && diagnosticTarget === targetName
            )
        ) {
            throw new TypeError(`Skipped target ${targetName} is not reported in the diagnostics`);
        }
        return;
    }
    if (!entity) {
        throw new TypeError(`Generated target ${targetName} is not declared by the service schema`);
    }
    const rows = result.resources[targetName];
    if (!rows) {
        throw new TypeError(`Generated resource ${targetName} is missing`);
    }
    if (rows.length > MAX_ROWS_PER_ENTITY || (target.kind === 'singleton' && rows.length > 1)) {
        throw new TypeError(`Generated resource ${targetName} has an invalid row count`);
    }
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    const keyProperties = entity.properties.filter((property) => property.isKey);
    const keys = new Set<string>();
    // Supplied rows lead the resource and are published as the caller wrote them, including
    // columns the schema no longer declares and values it would not generate.
    const supplied = authoredRows(request.existingData[targetName]);
    const suppliedCell = (rowIndex: number, propertyName: string, value: JsonValue | undefined): boolean =>
        rowIndex < supplied.length &&
        Object.hasOwn(supplied[rowIndex], propertyName) &&
        canonicalJson(supplied[rowIndex][propertyName]) === canonicalJson(value);
    for (const [rowIndex, row] of rows.entries()) {
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

/**
 * Check that the result publishes every supplied row exactly as the caller wrote it.
 *
 * @param graph the schema the result was validated against
 * @param request the generation request
 * @param result the generated result
 * @throws {TypeError} naming the first resource, and property where known, whose supplied rows changed
 */
function assertAuthoredRowsPreserved(
    graph: SchemaGraph,
    request: MockDataServiceRequest,
    result: MockDataGeneratorResult
): void {
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
}

/**
 * Check that every temporal violation of the final rows travels with the result as a diagnostic.
 *
 * @param graph the schema the result was validated against
 * @param result the generated result
 * @param options the generation options with the caller's temporal constraints and coherence rules
 * @throws {TypeError} for the first violation the diagnostics do not report
 */
function assertTemporalFailuresReported(
    graph: SchemaGraph,
    result: MockDataGeneratorResult,
    options: MockDataGeneratorOptions
): void {
    const temporalFailures = validateTemporalPlan(
        graph,
        result.resources,
        options.syntheticScenario?.temporalConstraints,
        options.syntheticScenario?.coherence
    );
    for (const failure of temporalFailures) {
        // Conflicting protected assignments remain inspectable, but their failed
        // invariant must travel with the result.
        if (
            !result.diagnostics.some(
                ({ code, target, message }) =>
                    code === failure.code && target === failure.target && message === failure.message
            )
        ) {
            throw new TypeError(`Temporal validation failed for ${failure.target}`);
        }
    }
}

/**
 * Validate the final snapshot against its request and semantic plan.
 *
 * @param request the generation request
 * @param result the generated result
 * @param options the generation options
 * @param context work already done for this result; anything absent is computed here
 */
export function validateGeneratedResult(
    request: MockDataServiceRequest,
    result: MockDataGeneratorResult,
    options: MockDataGeneratorOptions = {},
    context: GeneratedResultValidationContext = {}
): void {
    assertMetadataInputWithinLimit(request.metadata);
    if (context.resultBytes === undefined) {
        assertGeneratedResultWithinLimit(result);
    }

    if (
        !result.semanticRoles ||
        result.semanticPlanFingerprint !==
            sha256(canonicalJson({ request: result.fingerprints.request, roles: result.semanticRoles }))
    ) {
        throw new TypeError('Semantic plan metadata is absent or inconsistent');
    }

    const graph = applySyntheticScenario(
        applyApplicationDomains(
            context.parsedGraph ?? parseServiceMetadata(request.metadata, request.service),
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
        assertGeneratedTarget(request, result, target, entities.get(targetName), skippedEntitySets);
    }
    assertRelationshipIntegrity(graph, result.resources, request.existingData);

    assertAuthoredRowsPreserved(graph, request, result);
    assertTemporalFailuresReported(graph, result, options);
    assertSemanticValues(graph, result.resources, result.semanticRoles);
    assertCurrencyMetadata(graph, result.resources);
    const invalidTuple = validateTupleDomains(graph, result.resources, request.existingData, result.semanticRoles).find(
        ({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID'
    );
    if (invalidTuple) {
        throw new TypeError(`Semantic tuple validation failed for ${invalidTuple.target}`);
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
                code: 'SCHEMA_ENTITY_SET_SKIPPED' as const,
                severity: 'warning' as const,
                target: entitySetName,
                message: `No rows are generated for this entity set because its ${reason}.`
            })),
        ...graph.entities
            .filter(({ entitySetName }) => requested.has(entitySetName))
            .flatMap(({ entitySetName, omittedProperties }) =>
                (omittedProperties ?? []).map(({ name, declaredType }) => ({
                    code: 'SCHEMA_PROPERTY_OMITTED' as const,
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

/**
 * The options with the fine-tuned budget cut to what remains of the generation deadline.
 *
 * @param options generation options
 * @param elapsedMs time the generation has already taken
 * @returns the options the fine-tuned tier runs with
 */
function withinDeadline(options: MockDataGeneratorOptions, elapsedMs: number): MockDataGeneratorOptions {
    if (options.sftDeadlineMs === undefined) {
        return options;
    }
    const remaining = Math.floor(options.sftDeadlineMs - elapsedMs - DEADLINE_FINALIZATION_RESERVE_MS);
    return {
        ...options,
        sftBudgetMs: Math.max(1, Math.min(options.sftBudgetMs ?? DEFAULT_SFT_SERVICE_BUDGET_MS, remaining))
    };
}

function validateOptions(options: MockDataGeneratorOptions): void {
    if (options.seed !== undefined && !Number.isSafeInteger(options.seed)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, t('options.seed'));
    }
    validateDateWindowOptions(options.referenceDate, options.windowYears);
    const rowCounts =
        typeof options.rowsPerEntity === 'number'
            ? [options.rowsPerEntity]
            : Object.values(options.rowsPerEntity ?? {});
    if (rowCounts.some((count) => !Number.isSafeInteger(count) || count < 0 || count > MAX_ROWS_PER_ENTITY)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.rowCounts', { maximum: MAX_ROWS_PER_ENTITY })
        );
    }
    if (
        options.sftTimeoutMs !== undefined &&
        (!Number.isSafeInteger(options.sftTimeoutMs) ||
            options.sftTimeoutMs <= 0 ||
            options.sftTimeoutMs > MAX_SFT_TIME_LIMIT_MS)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftTimeout', { maximum: MAX_SFT_TIME_LIMIT_MS })
        );
    }
    if (
        options.sftBudgetMs !== undefined &&
        (!Number.isSafeInteger(options.sftBudgetMs) ||
            options.sftBudgetMs <= 0 ||
            options.sftBudgetMs > MAX_SFT_TIME_LIMIT_MS)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftBudget', { maximum: MAX_SFT_TIME_LIMIT_MS })
        );
    }
    if (
        options.sftDeadlineMs !== undefined &&
        (!Number.isSafeInteger(options.sftDeadlineMs) ||
            options.sftDeadlineMs <= 0 ||
            options.sftDeadlineMs > MAX_SFT_DEADLINE_MS)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftDeadline', { maximum: MAX_SFT_DEADLINE_MS })
        );
    }
    if (
        options.sftModelRows !== undefined &&
        (!Number.isSafeInteger(options.sftModelRows) ||
            options.sftModelRows <= 0 ||
            options.sftModelRows > MAX_ROWS_PER_ENTITY)
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftModelRows', { maximum: MAX_ROWS_PER_ENTITY })
        );
    }
    if (
        options.sftPriorityTargets !== undefined &&
        (!Array.isArray(options.sftPriorityTargets) ||
            options.sftPriorityTargets.length > 10_000 ||
            !options.sftPriorityTargets.every((target) => typeof target === 'string'))
    ) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, t('options.sftPriorityTargets'));
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

/** A generation's diagnostics, in the order they were reported. */
type GenerationDiagnostics = MockDataGeneratorResult['diagnostics'][number][];

/** Rows by resource name. */
type GeneratedResources = Readonly<Record<string, ReadonlyArray<MockDataRow>>>;

/** What one service generation shares across its tiers; the collections fill as the tiers run. */
interface ServiceGenerationContext {
    /** The generation request. */
    request: MockDataServiceRequest;
    /** The validated generation options. */
    options: MockDataGeneratorOptions;
    /** The learned components this generation uses; only the progress observer in deterministic mode. */
    runtime: MockDataGeneratorRuntime;
    /** When the generation started, for the fine-tuned tier's deadline and the total timing. */
    startedAt: number;
    /** Receives the duration of each stage. */
    timingsMs: Record<string, number>;
    /** Receives the diagnostics of every tier. */
    diagnostics: GenerationDiagnostics;
    /** Receives the tier that wrote each cell. */
    valueTiers: ValueTierTally;
    /** Receives the properties finalization projected from related entities. */
    projectedProperties: Map<string, Set<string>>;
    /** Generated cells the realism guard withheld, and cells the standard fallback filled. */
    withheld: { cells: number; fallback: number };
}

/** The request metadata, parsed and adjusted by the application domains and the synthetic scenario. */
interface PreparedSchema {
    /** The schema with application domains and the synthetic scenario applied. */
    graph: SchemaGraph;
    /** The request metadata as parsed, before application domains and scenarios were applied. */
    parsedGraph: SchemaGraph;
    /** The requested resources the schema can generate. */
    generationTargets: ReadonlyArray<MockDataTarget>;
}

/** The semantic roles the classifier and the lexical rules detected. */
interface DetectedSemanticRoles {
    /** The classifier's own candidates; none without a classifier. */
    rawClassifications: ReadonlyMap<string, SemanticClassification>;
    /** The candidates after arbitration with the lexical rules. */
    detectedClassifications: ReadonlyMap<string, SemanticClassification>;
    /** Whether the classifier failed for some fields. */
    classifierDegraded: boolean;
}

/** Everything a generation produced, before the result is assembled. */
interface GeneratedWorld extends DetectedSemanticRoles {
    /** The final rows. */
    resources: GeneratedResources;
    /** The adjusted schema; absent when no target was requested. */
    graph?: SchemaGraph;
    /** The parsed request metadata; absent when no target was requested. */
    parsedGraph?: SchemaGraph;
    /** The requested resources the schema can generate. */
    generationTargets: ReadonlyArray<MockDataTarget>;
    /** The planned semantic roles. */
    classifications: ReadonlyMap<string, SemanticClassification>;
    /** Whether the fine-tuned tier failed for some slots. */
    sftDegraded: boolean;
    /** What the fine-tuned tier did. */
    sftStatistics: MockDataGeneratorResult['statistics']['sft'];
}

/**
 * The statistics of a fine-tuned tier that did not run.
 *
 * @returns frozen zero counts
 */
function emptySftStatistics(): MockDataGeneratorResult['statistics']['sft'] {
    return Object.freeze({
        attempts: 0,
        parsedResponses: 0,
        eligibleSlots: 0,
        acceptedSlots: 0,
        rejectedSlots: 0,
        fallbackSlots: 0,
        assignments: Object.freeze([])
    });
}

/**
 * The planned roles other than `unknown`, by `EntitySet.Property`.
 *
 * @param classifications planned semantic roles
 * @returns the role of every classified property
 */
function plannedSemanticRoles(classifications: ReadonlyMap<string, SemanticClassification>): Record<string, string> {
    return Object.fromEntries(
        [...classifications]
            .filter(([, candidate]) => candidate.role !== 'unknown')
            .map(([key, candidate]) => [key, candidate.role])
    );
}

/**
 * Parse the request metadata, report the parts the schema cannot generate, and apply the application
 * domains and the synthetic scenario.
 *
 * @param context the generation
 * @returns the adjusted schema and the targets it can generate
 */
function prepareSchema(context: ServiceGenerationContext): PreparedSchema {
    const { request, options, timingsMs, diagnostics } = context;
    const parseStartedAt = performance.now();
    const parsedGraph = parseServiceMetadata(request.metadata, request.service);
    timingsMs.schema = performance.now() - parseStartedAt;
    // Requested entity sets the schema cannot generate are reported and left out; the rest proceed.
    const skippedEntitySets = new Set((parsedGraph.skippedEntitySets ?? []).map(({ entitySetName }) => entitySetName));
    const generationTargets = request.targets.filter(({ name }) => !skippedEntitySets.has(name));
    diagnostics.push(...schemaCoverageDiagnostics(parsedGraph, request.targets));
    let graph = applyApplicationDomains(parsedGraph, request.existingData, diagnostics);
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
    return { graph, parsedGraph, generationTargets };
}

/**
 * Classify the schema's fields, when a classifier is available, and arbitrate the candidates with the
 * lexical rules.
 *
 * @param context the generation
 * @param graph the adjusted schema
 * @param signal cancels classification
 * @returns the classifier's candidates and the arbitrated ones
 */
async function detectSemanticRoles(
    context: ServiceGenerationContext,
    graph: SchemaGraph,
    signal: AbortSignal
): Promise<DetectedSemanticRoles> {
    const { runtime, timingsMs, diagnostics } = context;
    let rawClassifications: ReadonlyMap<string, SemanticClassification> = new Map();
    let classifierDegraded = false;
    if (runtime.classifier) {
        const classifierStartedAt = performance.now();
        const classifierRun = await classifySchema(graph, runtime.classifier, signal);
        rawClassifications = classifierRun.classifications;
        diagnostics.push(...classifierRun.diagnostics);
        classifierDegraded = classifierRun.degraded;
        timingsMs.classifier = performance.now() - classifierStartedAt;
    }
    const arbitrationStartedAt = performance.now();
    const detectedClassifications = arbitrateSemanticClassifications(graph, rawClassifications);
    timingsMs.arbitration = performance.now() - arbitrationStartedAt;
    return { rawClassifications, detectedClassifications, classifierDegraded };
}

/**
 * Compile the semantic plan from the detected roles, demote roles bound by supplied data and report
 * whether the synthetic domains are ready.
 *
 * @param context the generation
 * @param schema the adjusted schema and its generation targets
 * @param detectedClassifications the arbitrated candidates
 * @returns the planned semantic roles
 */
function planSemanticRoles(
    context: ServiceGenerationContext,
    schema: PreparedSchema,
    detectedClassifications: ReadonlyMap<string, SemanticClassification>
): ReadonlyMap<string, SemanticClassification> {
    const { request, options, runtime, diagnostics } = context;
    const { graph, generationTargets } = schema;
    let classifications = compileSemanticPlan(
        graph,
        detectedClassifications,
        diagnostics,
        options.syntheticScenario,
        request.existingData
    );

    classifications = demoteBoundSemanticRoles(graph, classifications, diagnostics, request.existingData);
    diagnostics.push(
        ...syntheticDomainReadinessDiagnostics(
            graph,
            new Set(generationTargets.map(({ name }) => name)),
            request.existingData,
            classifications,
            runtime.sft !== undefined,
            options
        )
    );
    return classifications;
}

/**
 * Generate the deterministic rows, apply the format providers and put the supplied rows back.
 *
 * @param context the generation
 * @param schema the adjusted schema and its generation targets
 * @param classifications the planned semantic roles
 * @param plannedRoles the planned roles other than `unknown`
 * @returns the deterministic rows
 */
function generateDeterministicTier(
    context: ServiceGenerationContext,
    schema: PreparedSchema,
    classifications: ReadonlyMap<string, SemanticClassification>,
    plannedRoles: Readonly<Record<string, string>>
): GeneratedResources {
    const { request, options, runtime, diagnostics, valueTiers } = context;
    const { graph } = schema;
    const deterministic = generateDeterministicResources(
        graph,
        schema.generationTargets,
        options,
        classifications,
        request.existingData,
        runtime.classifier?.conceptBank
    );
    deterministic.valueTiers.forEach((properties, resourceName) => valueTiers.set(resourceName, properties));
    let resources = applyCurrencyMetadata(graph, deterministic.resources, diagnostics, options.locale);
    resources = applyCountryMetadata(graph, resources, diagnostics, options.locale, classifications);
    resources = applyCapCodeListMetadata(graph, resources, valueTiers, options.locale);

    resources = preserveAuthoredRows(graph, resources, request.existingData, diagnostics);
    retagAuthoredResources(valueTiers, request.existingData);

    assertSemanticValues(graph, resources, plannedRoles);

    diagnostics.push(...deterministic.diagnostics);
    return resources;
}

/**
 * Re-run the deterministic invariants on the final relationship world, attribute projected cells to the
 * tier that supplied them, refresh the format providers and put the supplied rows back.
 *
 * @param context the generation
 * @param schema the adjusted schema and its generation targets
 * @param resources the rows after the deterministic and fine-tuned tiers
 * @param classifications the planned semantic roles
 * @param relevanceVerifiedResources resources whose display values the relevance verifier accepted
 * @returns the final rows
 */
function finalizeGeneratedResources(
    context: ServiceGenerationContext,
    schema: PreparedSchema,
    resources: GeneratedResources,
    classifications: ReadonlyMap<string, SemanticClassification>,
    relevanceVerifiedResources: ReadonlySet<string>
): GeneratedResources {
    const { request, options, diagnostics, valueTiers, projectedProperties } = context;
    const { graph, generationTargets } = schema;
    const codeTextProperties = new Map<string, Set<string>>();
    // Format providers take part in value-list projection, so owners copy the companions
    // of the final value-help codes (see finalizeSemanticServiceWorld).
    let finalResources = finalizeSemanticServiceWorld({
        graph,
        resources,
        existingData: request.existingData,
        seed: options.seed ?? 1,
        classifications,
        diagnostics,
        coherence: options.syntheticScenario?.coherence,
        targetKinds: new Map(generationTargets.map((target) => [target.name, target.kind])),
        temporalConstraints: options.syntheticScenario?.temporalConstraints,
        relevanceVerifiedResources,
        projectedProperties,
        locale: options.locale,
        codeTextProperties,
        sampleDataset: options.sampleDataset,
        refreshCompanions: (world) =>
            applyCapCodeListMetadata(
                graph,
                applyCountryMetadata(
                    graph,
                    applyCurrencyMetadata(graph, world, diagnostics, options.locale),
                    diagnostics,
                    options.locale,
                    classifications
                ),
                valueTiers,
                options.locale
            )
    });
    // A projected cell carries the value of the entity it points at, so it belongs to the
    // tier that supplied that value rather than to the deterministic sweep that filled it
    // before projection ran.
    for (const [resourceName, properties] of projectedProperties) {
        for (const propertyName of properties) {
            retagValueTier(valueTiers, resourceName, propertyName, VALUE_TIER.recognised);
        }
    }
    // Projection and the coherence rules after it can leave a code with several texts or a new code
    // without one; the texts of codes are made a function of their codes once more over the final rows.
    const reconciled = reconcileCodeTexts({
        graph,
        resources: finalResources,
        existingData: request.existingData,
        classifications,
        locale: options.locale,
        projectedProperties
    });
    finalResources = reconciled.resources;
    // A text that names its code from a record, a supplied row or a fixed cell is recognised; a text copied
    // from another row of its code keeps the tier that wrote it.
    for (const [resourceName, properties] of [...codeTextProperties, ...reconciled.named]) {
        for (const propertyName of properties) {
            retagValueTier(valueTiers, resourceName, propertyName, VALUE_TIER.recognised);
        }
    }
    // Generated value-help domains can expand while solving cross-resource tuples.
    // Re-run format providers so derived companions describe the final codes rather
    // than the source row that was cloned to create the new domain member.
    finalResources = applyCurrencyMetadata(graph, finalResources, diagnostics, options.locale);
    finalResources = applyCountryMetadata(graph, finalResources, diagnostics, options.locale, classifications);
    finalResources = applyCapCodeListMetadata(graph, finalResources, valueTiers, options.locale);
    // Supplied rows are published as the caller wrote them. Derivations, projections and
    // format providers above work on whole resources, so restore every supplied cell once
    // they have all run; the checks below then treat those cells as fixed.
    finalResources = preserveAuthoredRows(graph, finalResources, request.existingData, []);
    const plannedRoles = plannedSemanticRoles(classifications);
    // The steps above may rewrite a field a value list determines; rows rejoin a tuple they can still adopt.
    finalResources = adoptCompatibleTuples(graph, finalResources, request.existingData, plannedRoles).resources;
    const guarded = withholdUnrealisticValues(graph, finalResources, request.existingData, plannedRoles, diagnostics);
    context.withheld.cells += guarded.withheld;
    // Last resort, as the standard mock server does: what no tier filled gets the property name and row index.
    const completed = applyStandardFallback(graph, guarded.resources, request.existingData, plannedRoles);
    context.withheld.fallback += completed.filled;
    reportFinalTemporalViolations(graph, completed.resources, options.syntheticScenario, diagnostics);
    return completed.resources;
}

/**
 * Check that every generated reference resolves and report the supplied references that do not.
 *
 * @param context the generation
 * @param graph the adjusted schema
 * @param resources the final rows
 * @throws {Error} when a generated reference does not resolve
 */
function reportUnresolvedSuppliedReferences(
    context: ServiceGenerationContext,
    graph: SchemaGraph,
    resources: GeneratedResources
): void {
    const { request, diagnostics } = context;
    const integrityFailures = relationshipIntegrityFailures(graph, resources, request.existingData);
    assertRelationshipIntegrity(graph, resources, request.existingData, integrityFailures);
    // Only supplied references can remain once generated ones are known to resolve.
    const unresolvedSupplied = new Set(
        integrityFailures.map(({ relationship }) => `${relationship.fromEntitySet}.${relationship.name}`)
    );
    for (const target of unresolvedSupplied) {
        diagnostics.push({
            code: 'SUPPLIED_REFERENCE_UNRESOLVED',
            severity: 'warning',
            target,
            message: 'Supplied rows reference rows that do not exist; they are published as written.'
        });
    }
}

/**
 * Run the tiers for the requested targets: schema (T0), semantic plan (T1), deterministic rows, the
 * fine-tuned tier when available, then finalization and the relationship check.
 *
 * @param context the generation
 * @returns everything the tiers produced
 */
async function generateWorld(context: ServiceGenerationContext): Promise<GeneratedWorld> {
    const { request, options, runtime, startedAt, timingsMs, diagnostics } = context;
    const tier0StartedAt = performance.now();
    reportProgress(runtime, { tier: 'T0', phase: 'start' });
    const schema = prepareSchema(context);
    const { graph } = schema;

    const signal = request.signal ?? new AbortController().signal;
    const tier1StartedAt = performance.now();
    reportProgress(runtime, { tier: 'T1', phase: 'start' });
    const detected = await detectSemanticRoles(context, graph, signal);
    const deterministicStartedAt = performance.now();
    const classifications = planSemanticRoles(context, schema, detected.detectedClassifications);

    reportProgress(runtime, { tier: 'T1', phase: 'complete', durationMs: performance.now() - tier1StartedAt });
    const plannedRoles = plannedSemanticRoles(classifications);
    let resources = generateDeterministicTier(context, schema, classifications, plannedRoles);
    timingsMs.deterministic = performance.now() - deterministicStartedAt;
    reportProgress(runtime, { tier: 'T0', phase: 'complete', durationMs: performance.now() - tier0StartedAt });
    let sftDegraded = false;
    let sftStatistics = emptySftStatistics();
    let relevanceVerifiedResources: ReadonlySet<string> = new Set();
    if (runtime.sft) {
        const sftStartedAt = performance.now();
        const sftRun = await applySftGeneration({
            graph,
            resources,
            service: request.service,
            options: withinDeadline(options, sftStartedAt - startedAt),
            classifications,
            sft: runtime.sft,
            signal,
            existingData: request.existingData,
            onProgress: runtime.onProgress,
            candidateVerifier: runtime.candidateVerifier
        });
        resources = sftRun.resources;

        assertSemanticValues(graph, resources, plannedRoles);

        diagnostics.push(...sftRun.diagnostics);
        sftDegraded = sftRun.degraded;
        sftStatistics = sftRun.statistics;
        relevanceVerifiedResources = sftRun.relevanceVerifiedResources;
        timingsMs.sft = performance.now() - sftStartedAt;
    }

    const finalizationStartedAt = performance.now();
    resources = finalizeGeneratedResources(context, schema, resources, classifications, relevanceVerifiedResources);
    timingsMs.finalization = performance.now() - finalizationStartedAt;
    diagnostics.push(...validateTupleDomains(graph, resources, request.existingData, plannedRoles));

    const relationshipStartedAt = performance.now();
    reportUnresolvedSuppliedReferences(context, graph, resources);
    timingsMs.relationships = performance.now() - relationshipStartedAt;
    return {
        ...detected,
        resources,
        graph,
        parsedGraph: schema.parsedGraph,
        generationTargets: schema.generationTargets,
        classifications,
        sftDegraded,
        sftStatistics
    };
}

/**
 * The versioned synthetic inputs a generation used, identified by hash.
 *
 * @param options the generation options
 * @returns the sample dataset and, when given, the synthetic scenario
 */
function syntheticInputs(options: MockDataGeneratorOptions): ServiceInspectionExecution['syntheticInputs'] {
    return {
        dataset: {
            id: (options.sampleDataset ?? packagedBanks().defaultSampleDataset).id,
            version: (options.sampleDataset ?? packagedBanks().defaultSampleDataset).version,
            sha256: fingerprint(options.sampleDataset ?? packagedBanks().defaultSampleDataset)
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
    };
}

/**
 * The identity of the learned components a generation used.
 *
 * @param runtime the learned components of the generation
 * @returns the fingerprints of the classifier and the fine-tuned generator, when present
 */
function artifactIdentity(runtime: MockDataGeneratorRuntime): ServiceInspectionExecution['artifactIdentity'] {
    return {
        ...(runtime.classifier
            ? {
                  classifier: {
                      fingerprint: runtime.classifier.fingerprint,
                      // Only the supported contract is reported; a value outside it (possible from JavaScript) reads as unspecified.
                      inputFormat: runtime.classifier.inputFormat === 'v3' ? 'v3' : ('unspecified' as const)
                  }
              }
            : {}),
        ...(runtime.sft ? { sft: { fingerprint: runtime.sft.fingerprint } } : {})
    };
}

/**
 * The hard realism checks over the final rows: how many generated fields fail one, under which version of the
 * checks. Rows the caller supplied are not the generator's to answer for and are skipped.
 *
 * @param world what the tiers produced
 * @param existingData the rows the caller supplied, by entity set
 * @returns the summary the result reports
 */
function hardRealism(
    world: GeneratedWorld,
    existingData: MockDataServiceRequest['existingData']
): NonNullable<MockDataGeneratorResult['realism']> {
    const graph = world.graph;
    if (!graph) {
        // No target was requested, so no row was generated.
        return Object.freeze({ checksVersion: REALISM_CHECKS_VERSION, failingFields: 0, passed: true });
    }
    const generated = new Map(
        graph.entities.map((entity) => [
            entity.entitySetName,
            generatedRowFlags(entity, world.resources[entity.entitySetName] ?? [], existingData)
        ])
    );
    const assessment = assessRealism({
        graph,
        resources: world.resources,
        isSupplied: (entitySet, rowIndex) => generated.get(entitySet)?.[rowIndex] === false,
        checks: REALISM_HARD_CHECKS
    });
    const failingFields = assessment.findings.filter(({ check }) => REALISM_HARD_CHECKS.has(check)).length;
    return Object.freeze({ checksVersion: assessment.version, failingFields, passed: failingFields === 0 });
}

/**
 * Assemble the frozen result from what the tiers produced.
 *
 * @param context the generation
 * @param world what the tiers produced
 * @returns the result and the published cells per property by writing tier
 */
function assembleGenerationResult(
    context: ServiceGenerationContext,
    world: GeneratedWorld
): { result: MockDataGeneratorResult; fieldTiers: ServiceInspectionExecution['fieldTiers'] } {
    const { request, options, runtime, diagnostics, valueTiers } = context;
    const semanticRoles = Object.freeze(plannedSemanticRoles(world.classifications));
    const learnedComponents = runtimeFingerprints(options, runtime);
    const requestFingerprint = createGenerationFingerprint(request, options, learnedComponents);
    const tierStatistics = valueTierStatistics(
        world.graph,
        valueTiers,
        world.generationTargets,
        world.resources,
        world.sftStatistics
    );
    const result = Object.freeze({
        resources: world.resources,
        semanticRoles,
        semanticPlanFingerprint: sha256(canonicalJson({ request: requestFingerprint, roles: semanticRoles })),
        diagnostics: Object.freeze(diagnostics),
        capabilities: Object.freeze(capabilities(runtime, world.classifierDegraded, world.sftDegraded)),
        fingerprints: Object.freeze({
            request: requestFingerprint,
            ...learnedComponents
        }),
        statistics: Object.freeze({ sft: world.sftStatistics }),
        routing: routingStatistics(
            world.graph,
            world.generationTargets,
            world.detectedClassifications,
            world.classifications
        ),
        tiers: tierStatistics.tiers,
        typedFloor: tierStatistics.typedFloor,
        abstentions: Object.freeze({
            typedFloor: tierStatistics.abstained,
            realismGuard: context.withheld.cells,
            standardFallback: context.withheld.fallback
        }),
        realism: hardRealism(world, request.existingData)
    });
    return { result, fieldTiers: tierStatistics.fieldTiers };
}

/**
 * Generate a complete, coherent snapshot for the requested service resources.
 *
 * @param request the service to generate
 * @param options generation options
 * @param runtime learned components, if any
 * @returns the result with what the generation planned and measured
 */
async function executeServiceGeneration(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<ServiceInspectionExecution> {
    request.signal?.throwIfAborted();

    const startedAt = performance.now();
    const rssBefore = process.memoryUsage().rss;
    const timingsMs: Record<string, number> = {};
    validateOptions(options);
    validateSampleDataset(options.sampleDataset ?? packagedBanks().defaultSampleDataset);
    assertMetadataInputWithinLimit(request.metadata);
    const activeRuntime: MockDataGeneratorRuntime =
        options.mode === 'deterministic'
            ? { ...(runtime.onProgress ? { onProgress: runtime.onProgress } : {}) }
            : runtime;
    const context: ServiceGenerationContext = {
        request,
        options,
        runtime: activeRuntime,
        startedAt,
        timingsMs,
        diagnostics: [],
        valueTiers: new Map(),
        projectedProperties: new Map(),
        withheld: { cells: 0, fallback: 0 }
    };
    const world: GeneratedWorld =
        request.targets.length > 0
            ? await generateWorld(context)
            : {
                  resources: Object.freeze({}),
                  generationTargets: request.targets,
                  rawClassifications: new Map(),
                  detectedClassifications: new Map(),
                  classifications: new Map(),
                  classifierDegraded: false,
                  sftDegraded: false,
                  sftStatistics: emptySftStatistics()
              };
    const { result, fieldTiers } = assembleGenerationResult(context, world);
    const resultBytes = assertGeneratedResultWithinLimit(result);

    validateGeneratedResult(request, result, options, { parsedGraph: world.parsedGraph, resultBytes });

    timingsMs.total = performance.now() - startedAt;
    if (request.targets.length > 0) {
        const rowCount = Object.values(world.resources).reduce((total, rows) => total + rows.length, 0);
        const remainingSlots = world.sftStatistics.fallbackSlots;
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
        graph: world.graph,
        parsedGraph: world.parsedGraph,
        rawClassifications: world.rawClassifications,
        detectedClassifications: world.detectedClassifications,
        classifications: world.classifications,
        syntheticInputs: syntheticInputs(options),
        pipeline: 'semantic-v2',
        ...(options.locale ? { locale: options.locale } : {}),
        artifactIdentity: artifactIdentity(activeRuntime),
        fieldTiers,
        timingsMs: Object.freeze(timingsMs),
        rssBytes: Object.freeze({ before: rssBefore, after: process.memoryUsage().rss })
    });
}

/**
 * Generate a complete, coherent snapshot for the requested service resources with explicitly supplied
 * learned components. Internal to the package: tests and tools call it to run the engine without a
 * session; consumers use `generateService` or `createMockDataGenerator` of the public API.
 *
 * @param request the service to generate
 * @param options generation options
 * @param runtime learned components, if any
 * @returns the generation result
 */
export async function generateServiceForTesting(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<MockDataGeneratorResult> {
    return (await executeServiceGeneration(request, options, runtime)).result;
}

/**
 * Generate like generateServiceForTesting and also return the parsed request metadata, so a caller that
 * reports on the result does not parse the metadata again. Internal to the package.
 *
 * @param request the service to generate
 * @param options generation options
 * @param runtime learned components, if any
 * @returns the result and the parsed schema; the schema is absent when no target was requested
 */
export async function generateServiceWithSchema(
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<Readonly<{ result: MockDataGeneratorResult; parsedGraph?: SchemaGraph }>> {
    const { result, parsedGraph } = await executeServiceGeneration(request, options, runtime);
    return { result, ...(parsedGraph ? { parsedGraph } : {}) };
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
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, t('options.includeGeneratedValues'));
    }
    const execution = await executeServiceGeneration(request, options, runtime);
    return buildServiceInspection(request, execution, inspectionOptions);
}
