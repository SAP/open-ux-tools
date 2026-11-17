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
import {
    authoredRows,
    generatedResources,
    generatedRowFlags,
    preserveAuthoredRows,
    withRequestedValueListGrowth
} from './generation/authored.js';
import { withholdUnrealisticValues } from './generation/realism-guard.js';
import { containedTargets, flattenContainedRows, nestContainedRows } from './generation/containment.js';
import { childlessParentDiagnostics } from './generation/childless-parents.js';
import { applyStandardFallback } from './generation/standard-fallback.js';
import { assessRealism, REALISM_CHECKS_VERSION, REALISM_HARD_CHECKS } from './quality/realism.js';
import { finalizeSemanticServiceWorld } from './generation/service-world.js';
import { reconcileCodeTexts } from './generation/code-texts.js';
import { alignReferencedValues } from './generation/referenced-values.js';
import { alignRecordRows } from './generation/record-rows.js';
import { putInFacetForm } from './generation/facet-form.js';
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
import { adoptCompatibleTuples, validateTupleDomains, valueListedProperties } from './generation/tuple-domain.js';
import { applyCurrencyMetadata, assertCurrencyMetadata } from './generation/currency-metadata.js';
import { completeReferencedCodeLists } from './generation/referenced-code-lists.js';
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
    MAX_CONTAINED_ENTITIES,
    MAX_ROWS_PER_ENTITY,
    MAX_SFT_DEADLINE_MS,
    MAX_SFT_FIELDS_PER_CALL,
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
 * @param options - Runtime options.
 * @param options.completionStore - Keeps model answers; the process-wide in-memory store when absent.
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

const GENERATOR_LOGIC_VERSION = 54;

/**
 * Retag the properties of every supplied resource as authored, since `preserveAuthoredRows` restores those rows.
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
 * Why a typed-floor column has no better tier: protocol artifact, key, boolean, or an addressable field.
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
 * Count every published cell against the tier that wrote it, walking the published rows so totals match the result.
 *
 * @param graph the schema graph, for the key and type of each property
 * @param tally the completed value-tier tally
 * @param targets the entity sets the caller asked for
 * @param resources the published rows
 * @param statistics the fine-tuned tier's own per-field accounting
 * @param fallbackByField cells the standard fallback filled, by property key
 * @returns slots by tier, the typed floor by cause, the abstained cell count, and each property's tier split
 */
function valueTierStatistics(
    graph: SchemaGraph | undefined,
    tally: ValueTierTally,
    targets: ReadonlyArray<MockDataTarget>,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    statistics: SftGenerationStatistics,
    fallbackByField: ReadonlyMap<string, number> = new Map()
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
                // The model writes no empty values: empty cells and fallback-filled cells are floor abstentions.
                const empty =
                    rows.filter((row) => row[propertyName] === null || row[propertyName] === '').length +
                    (fallbackByField.get(semanticPropertyKey(name, propertyName)) ?? 0);
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
            existingData: request.existingData,
            // Only when given, so fingerprints of requests without referenced services stay stable.
            ...(request.referencedServices ? { referencedServices: request.referencedServices } : {})
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
 * Check the rows of one requested resource: a skipped entity set has none and is reported; any other has a valid
 * row count, valid declared properties, no undeclared ones and no duplicate key. Supplied cells pass as written.
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
        assertSkippedTarget(result, targetName);
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
    const keyProperties = entity.properties.filter((property) => property.isKey);
    const keys = new Set<string>();
    // Supplied rows lead the resource and are published as written, even with undeclared columns or values.
    const supplied = authoredRows(request.existingData[targetName]);
    const check: GeneratedRowCheck = {
        targetName,
        entity,
        declared: new Set(entity.properties.map((property) => property.name)),
        supplied
    };
    for (const [rowIndex, row] of rows.entries()) {
        assertGeneratedRow(check, rowIndex, row);
        // Contained keys are checked per container when the rows are read out of their containers.
        if (keyProperties.length > 0 && !entity.containedBy) {
            const key = canonicalJson(keyProperties.map((property) => row[property.name]));
            // Supplied rows may share a key (SUPPLIED_KEY_DUPLICATED); a generated row may not.
            if (keys.has(key) && rowIndex >= supplied.length) {
                throw new TypeError(`Generated resource ${targetName} contains a duplicate key`);
            }
            keys.add(key);
        }
    }
}

/**
 * Check that a skipped entity set has no rows and is reported as skipped.
 *
 * @param result the generated result
 * @param targetName the skipped target
 * @throws {TypeError} when it has rows or no `SCHEMA_ENTITY_SET_SKIPPED` diagnostic
 */
function assertSkippedTarget(result: MockDataGeneratorResult, targetName: string): void {
    if (Object.hasOwn(result.resources, targetName)) {
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
}

/** What the rows of one generated resource are checked against. */
interface GeneratedRowCheck {
    targetName: string;
    entity: SchemaGraph['entities'][number];
    /** Names of the properties the entity declares. */
    declared: ReadonlySet<string>;
    /** The caller's rows, which lead the resource. */
    supplied: ReadonlyArray<Readonly<Record<string, JsonValue>>>;
}

/**
 * Whether a cell is the caller's own: the row is supplied and holds that value for the property.
 *
 * @param check the resource being checked
 * @param rowIndex the row's index in the resource
 * @param propertyName the cell's property
 * @param value the published value
 * @returns true for a supplied cell published as written
 */
function isSuppliedCell(
    check: GeneratedRowCheck,
    rowIndex: number,
    propertyName: string,
    value: JsonValue | undefined
): boolean {
    const { supplied } = check;
    return (
        rowIndex < supplied.length &&
        Object.hasOwn(supplied[rowIndex], propertyName) &&
        canonicalJson(supplied[rowIndex][propertyName]) === canonicalJson(value)
    );
}

/**
 * Check one published row: no undeclared property and every declared property present and valid, except as supplied.
 *
 * @param check the resource being checked
 * @param rowIndex the row's index in the resource
 * @param row the row
 * @throws {TypeError} when the row breaks one of these rules
 */
function assertGeneratedRow(
    check: GeneratedRowCheck,
    rowIndex: number,
    row: Readonly<Record<string, JsonValue>>
): void {
    const { targetName, entity, declared, supplied } = check;
    for (const propertyName of Object.keys(row)) {
        if (!declared.has(propertyName) && !isSuppliedCell(check, rowIndex, propertyName, row[propertyName])) {
            throw new TypeError(`Generated resource ${targetName} contains unknown property ${propertyName}`);
        }
    }
    for (const property of entity.properties) {
        if (!Object.hasOwn(row, property.name)) {
            if (rowIndex < supplied.length) {
                continue;
            }
            throw new TypeError(`Generated resource ${targetName} is missing property ${property.name}`);
        }
        if (
            !propertyValueIsValid(property, row[property.name]) &&
            !isSuppliedCell(check, rowIndex, property.name, row[property.name])
        ) {
            throw new TypeError(`Generated resource ${targetName} has an invalid value for ${property.name}`);
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
        // Conflicting protected assignments stay, but their failure must be reported.
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

    const graph = withRequestedValueListGrowth(
        applySyntheticScenario(
            applyApplicationDomains(context.parsedGraph ?? parseRequestSchema(request), request.existingData, []),
            options.syntheticScenario,
            []
        ),
        options.rowsPerEntity
    );
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const skippedEntitySets = new Set((graph.skippedEntitySets ?? []).map(({ entitySetName }) => entitySetName));

    for (const resourceName of Object.keys(result.resources)) {
        if (!request.targets.some(({ name }) => name === resourceName)) {
            throw new TypeError(`Generated resource ${resourceName} was not requested`);
        }
    }
    // Contained rows are published nested but checked as entities of their own.
    const targets = new Map(
        [...request.targets, ...withContainedTargets(graph, request.targets)].map((target) => [target.name, target])
    );
    const flat: MockDataGeneratorResult = {
        ...result,
        resources: flattenContainedRows(graph, result.resources, request.existingData)
    };
    for (const [targetName, target] of targets) {
        assertGeneratedTarget(request, flat, target, entities.get(targetName), skippedEntitySets);
    }
    assertRelationshipIntegrity(graph, flat.resources, request.existingData);

    assertAuthoredRowsPreserved(graph, request, flat);
    // Temporal violations are reported over all final rows, supplied ones included.
    assertTemporalFailuresReported(graph, flat, options);
    // The plan's other checks cover generated rows only.
    const generated = generatedResources(graph, flat.resources, request.existingData);
    assertSemanticValues(graph, generated, result.semanticRoles);
    assertCurrencyMetadata(graph, generated);
    const invalidTuple = validateTupleDomains(graph, generated, request.existingData, result.semanticRoles).find(
        ({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID'
    );
    if (invalidTuple) {
        throw new TypeError(`Semantic tuple validation failed for ${invalidTuple.target}`);
    }
}

/**
 * The generatable requested entity sets, followed by the entities they contain.
 *
 * @param graph - Parsed service schema.
 * @param targets - Resources the caller requested.
 * @returns The generation targets.
 */
function withContainedTargets(graph: SchemaGraph, targets: ReadonlyArray<MockDataTarget>): MockDataTarget[] {
    const skippedEntitySets = new Set((graph.skippedEntitySets ?? []).map(({ entitySetName }) => entitySetName));
    const requested = targets.filter(({ name }) => !skippedEntitySets.has(name));
    const names = new Set(requested.map(({ name }) => name));
    return [...requested, ...containedTargets(graph, requested).filter(({ name }) => !names.has(name))];
}

/**
 * The resources whose schema coverage is reported: the requested ones, their contained entities, and skipped
 * contained entities.
 *
 * @param graph - Parsed service schema.
 * @param targets - Resources the caller requested.
 * @returns The covered resources.
 */
function coveredTargets(graph: SchemaGraph, targets: ReadonlyArray<MockDataTarget>): MockDataTarget[] {
    const generated = withContainedTargets(graph, targets);
    const names = new Set(generated.map(({ name }) => name));
    const skippedContained = (graph.skippedEntitySets ?? []).flatMap(({ entitySetName, containedBy }) =>
        containedBy && names.has(containedBy.entitySetName)
            ? [{ name: entitySetName, kind: 'entity-set' as const }]
            : []
    );
    return [
        ...targets,
        ...generated.filter(({ name }) => !targets.some((target) => target.name === name)),
        ...skippedContained
    ];
}

/**
 * Report the schema elements requested resources leave out: skipped entity sets and omitted properties.
 *
 * @param graph - Parsed service schema.
 * @param targets - Resources the caller requested.
 * @returns Warnings for omitted containment paths and skipped entity sets, one info per omitted property.
 */
function schemaCoverageDiagnostics(
    graph: SchemaGraph,
    targets: ReadonlyArray<MockDataTarget>
): MockDataGeneratorResult['diagnostics'][number][] {
    const requested = new Set(targets.map(({ name }) => name));
    const omittedPaths = graph.omittedContainmentPaths ?? 0;
    return [
        ...(omittedPaths > 0
            ? [
                  {
                      code: 'SCHEMA_ENTITY_SET_SKIPPED' as const,
                      severity: 'warning' as const,
                      message: `No rows are generated for ${omittedPaths} containment paths, because a service holds at most ${MAX_CONTAINED_ENTITIES} contained entities; the shallowest are generated.`
                  }
              ]
            : []),
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
 * Align the reported temporal violations with the final rows, since later passes can copy conflicting dates.
 *
 * @param graph - Service schema.
 * @param resources - Final rows, the caller's rows as supplied included.
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

/**
 * The options with a canonical locale (`en_US` reads as `en-US`); an unreadable locale is dropped and reported.
 *
 * @param options the requested options
 * @returns the options to generate with, and the diagnostic for an unreadable locale
 */
function withReadableLocale(options: MockDataGeneratorOptions): {
    options: MockDataGeneratorOptions;
    diagnostics: MockDataGeneratorResult['diagnostics'][number][];
} {
    const requested: unknown = options.locale;
    if (requested === undefined) {
        return { options, diagnostics: [] };
    }
    const { locale: _unreadable, ...withoutLocale } = options;
    if (typeof requested === 'string' && requested.length > 0) {
        try {
            const [locale] = Intl.getCanonicalLocales(requested.replaceAll('_', '-'));
            return { options: { ...withoutLocale, locale }, diagnostics: [] };
        } catch {
            // Reported below.
        }
    }
    return {
        options: withoutLocale,
        diagnostics: [
            {
                code: 'OPTION_LOCALE_UNSUPPORTED',
                severity: 'warning',
                message: `The locale ${JSON.stringify(requested) ?? String(requested)} is not a BCP 47 language tag, so display names are in English.`
            }
        ]
    };
}

/**
 * Whether an optional count or duration is set but not a safe integer from 1 to a maximum.
 *
 * @param value the option value, if set
 * @param maximum the largest valid value
 * @returns true for a set value outside the range
 */
function outsidePositiveRange(value: number | undefined, maximum: number): boolean {
    return value !== undefined && (!Number.isSafeInteger(value) || value <= 0 || value > maximum);
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
    if (outsidePositiveRange(options.sftTimeoutMs, MAX_SFT_TIME_LIMIT_MS)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftTimeout', { maximum: MAX_SFT_TIME_LIMIT_MS })
        );
    }
    if (outsidePositiveRange(options.sftBudgetMs, MAX_SFT_TIME_LIMIT_MS)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftBudget', { maximum: MAX_SFT_TIME_LIMIT_MS })
        );
    }
    if (outsidePositiveRange(options.sftDeadlineMs, MAX_SFT_DEADLINE_MS)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftDeadline', { maximum: MAX_SFT_DEADLINE_MS })
        );
    }
    if (outsidePositiveRange(options.sftModelRows, MAX_ROWS_PER_ENTITY)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftModelRows', { maximum: MAX_ROWS_PER_ENTITY })
        );
    }
    if (outsidePositiveRange(options.sftFieldsPerCall, MAX_SFT_FIELDS_PER_CALL)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.REQUEST_INVALID,
            t('options.sftFieldsPerCall', { maximum: MAX_SFT_FIELDS_PER_CALL })
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
    /** Generated cells the realism guard withheld, and cells the standard fallback filled, also by field. */
    withheld: { cells: number; fallback: number; fallbackByField: ReadonlyMap<string, number> };
    /** Receives when finalization started, where the T3 span begins. */
    finalizationStartedAt?: number;
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
 * Parse the request metadata, treating an undeclared target as a skipped entity set so the others still generate.
 *
 * @param request the generation request
 * @returns the parsed schema
 */
function parseRequestSchema(request: MockDataServiceRequest): SchemaGraph {
    const graph = parseServiceMetadata(request.metadata, request.service);
    const declared = new Set(
        [...graph.entities, ...(graph.skippedEntitySets ?? [])].map(({ entitySetName }) => entitySetName)
    );
    const undeclared = [...new Set(request.targets.map(({ name }) => name))].filter((name) => !declared.has(name));
    if (undeclared.length === 0) {
        return graph;
    }
    return {
        ...graph,
        skippedEntitySets: [
            ...(graph.skippedEntitySets ?? []),
            ...undeclared.map((entitySetName) => ({
                entitySetName,
                reason: 'name is not declared by the service schema'
            }))
        ]
    };
}

/**
 * Parse the request metadata, report what cannot be generated, and apply application domains and scenario.
 *
 * @param context the generation
 * @returns the adjusted schema and the targets it can generate
 */
function prepareSchema(context: ServiceGenerationContext): PreparedSchema {
    const { request, options, timingsMs, diagnostics } = context;
    const parseStartedAt = performance.now();
    const parsedGraph = parseRequestSchema(request);
    timingsMs.schema = performance.now() - parseStartedAt;
    const generationTargets = withContainedTargets(parsedGraph, request.targets);
    diagnostics.push(...schemaCoverageDiagnostics(parsedGraph, coveredTargets(parsedGraph, request.targets)));
    let graph = applyApplicationDomains(parsedGraph, request.existingData, diagnostics);
    graph = applySyntheticScenario(graph, options.syntheticScenario, diagnostics);
    graph = withRequestedValueListGrowth(graph, options.rowsPerEntity);
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
 * Classify the schema's fields when a classifier is available, and arbitrate with the lexical rules.
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
 * Compile the semantic plan, demote bound roles and report synthetic domain readiness.
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

    classifications = demoteBoundSemanticRoles(graph, classifications, diagnostics);
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

    assertSemanticValues(graph, generatedResources(graph, resources, request.existingData), plannedRoles);

    diagnostics.push(...deterministic.diagnostics);
    return resources;
}

/**
 * Finalize the relationship world: re-run the invariants, retag projected cells, refresh format providers and
 * restore supplied rows.
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
    // Format providers run during value-list projection, so owners copy companions of the final value-help codes.
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
    // A projected cell carries the referenced entity's value, so it is not the deterministic sweep's.
    for (const [resourceName, properties] of projectedProperties) {
        for (const propertyName of properties) {
            retagValueTier(valueTiers, resourceName, propertyName, VALUE_TIER.recognised);
        }
    }
    // Projection and coherence can leave a code with several texts or none; make texts a function of codes again.
    const reconciled = reconcileCodeTexts({
        graph,
        resources: finalResources,
        existingData: request.existingData,
        classifications,
        locale: options.locale,
        projectedProperties
    });
    finalResources = reconciled.resources;
    // A text named from a record, a supplied row or a fixed cell is recognised; a copied text keeps its tier.
    for (const [resourceName, properties] of [...codeTextProperties, ...reconciled.named]) {
        for (const propertyName of properties) {
            retagValueTier(valueTiers, resourceName, propertyName, VALUE_TIER.recognised);
        }
    }
    // Value-help domains can grow while solving tuples; re-run format providers so companions match the final codes.
    finalResources = applyCurrencyMetadata(graph, finalResources, diagnostics, options.locale);
    finalResources = applyCountryMetadata(graph, finalResources, diagnostics, options.locale, classifications);
    finalResources = applyCapCodeListMetadata(graph, finalResources, valueTiers, options.locale);
    // The passes above rewrite whole resources, so restore supplied cells; later steps treat them as fixed.
    finalResources = preserveAuthoredRows(graph, finalResources, request.existingData, []);
    const plannedRoles = plannedSemanticRoles(classifications);
    // Rows whose value-list field was rewritten rejoin a tuple they can still adopt.
    finalResources = adoptCompatibleTuples(graph, finalResources, request.existingData, plannedRoles).resources;
    // A row of a country or currency entity describes the record its key names.
    finalResources = alignRecordRows({
        graph,
        resources: finalResources,
        existingData: request.existingData,
        plannedRoles,
        fixedProperties: projectedProperties,
        locale: options.locale
    });
    // Texts and repeated semantic keys next to a reference follow the referenced row; a referenced row without
    // a text takes the first one written next to a reference. A value-list text keeps the value-help row's.
    finalResources = alignReferencedValues({
        graph,
        resources: finalResources,
        existingData: request.existingData,
        fixedProperties: projectedProperties,
        listedProperties: valueListedProperties(graph, finalResources, request.existingData),
        fillReferenced: true
    }).resources;
    const guarded = withholdUnrealisticValues(graph, finalResources, request.existingData, plannedRoles, diagnostics);
    context.withheld.cells += guarded.withheld;
    // Last resort, as in the standard mock server: unfilled cells get the property name and row index.
    const completed = applyStandardFallback(
        graph,
        guarded.resources,
        request.existingData,
        plannedRoles,
        options.syntheticScenario?.coherence
    );
    context.withheld.fallback += completed.filled;
    context.withheld.fallbackByField = completed.filledByField;
    // Generated strings take their field's facet form (upper case, digits only).
    const formed = putInFacetForm({
        graph,
        resources: completed.resources,
        existingData: request.existingData,
        plannedRoles,
        fixedProperties: projectedProperties
    });
    // Record rows and facet forms may rewrite value-list fields; rows rejoin a tuple they can still adopt.
    const rejoined = adoptCompatibleTuples(graph, formed, request.existingData, plannedRoles).resources;
    // Referenced values are final now; the values next to their references follow them.
    const aligned = alignReferencedValues({
        graph,
        resources: rejoined,
        existingData: request.existingData,
        fixedProperties: projectedProperties,
        listedProperties: valueListedProperties(graph, rejoined, request.existingData),
        fillReferenced: false
    }).resources;
    reportFinalTemporalViolations(graph, aligned, options.syntheticScenario, diagnostics);
    return aligned;
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
 * Run the tiers: schema (T0), semantic plan (T1), deterministic rows, the fine-tuned tier when available,
 * finalization and the relationship check.
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

    const tier1CompletedAt = performance.now();
    reportProgress(runtime, { tier: 'T1', phase: 'complete', durationMs: tier1CompletedAt - tier1StartedAt });
    const plannedRoles = plannedSemanticRoles(classifications);
    let resources = generateDeterministicTier(context, schema, classifications, plannedRoles);
    timingsMs.deterministic = performance.now() - deterministicStartedAt;
    // T0 encloses T1 in the event order; its span is its own work, the schema and the deterministic rows.
    reportProgress(runtime, {
        tier: 'T0',
        phase: 'complete',
        durationMs: tier1StartedAt - tier0StartedAt + (performance.now() - tier1CompletedAt)
    });
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

        assertSemanticValues(graph, generatedResources(graph, resources, request.existingData), plannedRoles);

        diagnostics.push(...sftRun.diagnostics);
        sftDegraded = sftRun.degraded;
        sftStatistics = sftRun.statistics;
        relevanceVerifiedResources = sftRun.relevanceVerifiedResources;
        timingsMs.sft = performance.now() - sftStartedAt;
    }

    const finalizationStartedAt = performance.now();
    context.finalizationStartedAt = finalizationStartedAt;
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
                      // Any value other than the supported contract (possible from JavaScript) reads as unspecified.
                      inputFormat: runtime.classifier.inputFormat === 'v3' ? 'v3' : ('unspecified' as const)
                  }
              }
            : {}),
        ...(runtime.sft ? { sft: { fingerprint: runtime.sft.fingerprint } } : {})
    };
}

/**
 * Count the generated fields failing a hard realism check; supplied rows are skipped.
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
 * The rows of every entity set: the final rows, and the supplied rows of entity sets that were not generated.
 *
 * @param resources the final rows
 * @param existingData the rows the caller supplied, by entity set
 * @returns rows by entity set
 */
function rowsWithSupplied(
    resources: GeneratedResources,
    existingData: MockDataServiceRequest['existingData']
): Readonly<Record<string, ReadonlyArray<MockDataRow>>> {
    const rows: Record<string, ReadonlyArray<MockDataRow>> = {};
    for (const [entitySet, { initialRows }] of Object.entries(existingData)) {
        if ('rows' in initialRows) {
            rows[entitySet] = initialRows.rows;
        }
    }
    return { ...rows, ...resources };
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
        world.sftStatistics,
        context.withheld.fallbackByField
    );
    if (world.graph) {
        diagnostics.push(...childlessParentDiagnostics(world.graph, world.resources, request.existingData));
    }
    const referencedResources = world.graph
        ? completeReferencedCodeLists(
              request,
              world.graph,
              rowsWithSupplied(world.resources, request.existingData),
              diagnostics,
              options.locale
          )
        : [];
    // Contained rows move into the rows that contain them last, after every check of the generated rows.
    const resources = world.graph
        ? nestContainedRows(world.graph, world.resources, request.existingData, diagnostics)
        : world.resources;
    const result = Object.freeze({
        resources,
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
        realism: hardRealism(world, request.existingData),
        ...(referencedResources.length > 0 ? { referencedResources } : {})
    });
    return { result, fieldTiers: tierStatistics.fieldTiers };
}

/**
 * Generate a complete, coherent snapshot for the requested service resources.
 *
 * @param request the service to generate
 * @param requestedOptions generation options
 * @param runtime learned components, if any
 * @returns the result with what the generation planned and measured
 */
async function executeServiceGeneration(
    request: MockDataServiceRequest,
    requestedOptions: MockDataGeneratorOptions = {},
    runtime: MockDataGeneratorRuntime = {}
): Promise<ServiceInspectionExecution> {
    request.signal?.throwIfAborted();

    const startedAt = performance.now();
    const rssBefore = process.memoryUsage().rss;
    const timingsMs: Record<string, number> = {};
    validateOptions(requestedOptions);
    const { options, diagnostics: optionDiagnostics } = withReadableLocale(requestedOptions);
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
        diagnostics: optionDiagnostics,
        valueTiers: new Map(),
        projectedProperties: new Map(),
        withheld: { cells: 0, fallback: 0, fallbackByField: new Map() }
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
            // T3 spans finalization and the result, not the tiers before it.
            durationMs: performance.now() - (context.finalizationStartedAt ?? startedAt)
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
 * Generate with explicitly supplied learned components, without a session. Internal to the package; consumers
 * use `generateService` or `createMockDataGenerator`.
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
 * Generate like generateServiceForTesting and also return the parsed schema, so it need not be parsed again.
 * Internal to the package.
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
 * Run a generation and return its versioned, privacy-aware inspection report.
 *
 * @param request the service to generate
 * @param options generation options
 * @param runtime learned components, if any
 * @param inspectionOptions what the report includes
 * @returns the inspection report
 * @throws {MockGenError} when `includeGeneratedValues` is not a boolean
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
