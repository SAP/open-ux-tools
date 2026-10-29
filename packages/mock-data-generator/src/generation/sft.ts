import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { capCodeList } from '../semantics/cap-code-lists.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRoleCandidate } from '../semantics/lexical-fallback.js';
import { semanticRoleDefinition } from '../semantics/role-registry.js';
import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorOptions,
    MockDataGenerationProgress,
    MockDataRow,
    MockDataServiceIdentity,
    SemanticClassification,
    SftAssignmentStatistics,
    SftCandidateRelevancePair,
    SftCandidateRelevanceVerifier,
    SftFieldRequest,
    SftGenerationStatistics,
    SftGenerator,
    SftResourceOutcome,
    SftSkippedResource
} from '../types.js';
import { coherencePropertyNames } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';
import { SAP_PROTOCOL_ENTITY_SET_PREFIX, SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import { semanticRules, fieldFilter } from '../semantics/rule-store.js';
import {
    DEFAULT_SFT_ENTITY_TIMEOUT_MS,
    DEFAULT_SFT_SERVICE_BUDGET_MS,
    MAX_SFT_STRING_LENGTH,
    MINIMUM_SFT_ATTEMPT_MS
} from '../limits.js';
import { descriptiveKeyNames } from './key-identity.js';
import { ownsInitialData } from './rows.js';
import { errorMessage } from '../guards.js';

const SFT_PRIMITIVE_TYPES = new Set<SchemaProperty['primitiveType']>(['string', 'int', 'decimal']);
// How long past its budget a generator may take to return its completed rows: one native decode step
// of a batch on a loaded machine.
const GENERATOR_STOP_GRACE_MS = 1_500;
// `SAP__` is the namespace SAP Gateway reserves for the entity sets it adds to every service:
// PDF export formats, cover pages, signatures, table columns, hierarchies, value helps, file
// shares, currencies and units of measure. They are protocol plumbing rather than application
// data and are never rendered by an application, so they are left to the deterministic tier.
const PROTOCOL_ARTIFACT_ENTITY_SET_PREFIX = SAP_PROTOCOL_ENTITY_SET_PREFIX;

class CandidateRelevanceError extends Error {
    constructor() {
        super('SFT_CANDIDATE_RELEVANCE_FAILED');
    }
}

const VERIFIER_UNAVAILABLE_MESSAGE =
    'No model or independent relevance check is available for this generated code/text domain; its deterministic values are kept and its meaning is unverified.';

interface SftRunResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    degraded: boolean;
    statistics: SftGenerationStatistics;
    relevanceVerifiedResources: ReadonlySet<string>;
}

/**
 * Whether an entity set is one of the framework-provided sets a service carries rather than
 * application data.
 *
 * @param entitySetName the entity set name as declared by the service
 * @returns true when the set belongs to the reserved SAP Gateway namespace
 */
export function isProtocolArtifactEntitySet(entitySetName: string): boolean {
    return entitySetName.startsWith(PROTOCOL_ARTIFACT_ENTITY_SET_PREFIX);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function normalizedText(value: string): string {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function escapedRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Whether a proposed value repeats the prompt's instructions instead of holding content. Such a value
 * shows the model lost track of the task, so the other values of its row are not trusted either.
 *
 * @param property the field
 * @param value proposed value
 * @returns true for an instruction echo
 */
export function isInstructionEcho(property: SchemaProperty, value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = normalizedText(value);
    if (semanticRules().modelOutputFilters.instructionEcho.some((pattern) => pattern.test(normalized))) {
        return true;
    }
    const fieldPattern = [property.name, property.label, property.description]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => escapedRegExp(normalizedText(candidate)))
        .join('|');
    return (
        fieldPattern.length > 0 &&
        fieldFilter(semanticRules().modelOutputFilters.fieldInstruction, fieldPattern).test(normalized)
    );
}

/**
 * Whether a proposed string is a placeholder rather than content: one of the field's own names, a
 * placeholder word, a bare path or URL, an echoed instruction, or a field name with a placeholder word or
 * an ordinal number.
 *
 * @param property the field
 * @param value proposed string
 * @returns true for a placeholder
 */
export function isNarrativePlaceholder(property: SchemaProperty, value: string): boolean {
    const normalized = normalizedText(value);
    const fieldNames = [property.name, property.label, property.description]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map(normalizedText);
    if (fieldNames.includes(normalized)) {
        return true;
    }
    if (semanticRules().modelOutputFilters.placeholderValues.has(normalized)) {
        return true;
    }
    if (semanticRules().modelOutputFilters.pathOrUrl.test(normalized)) {
        return true;
    }
    if (semanticRules().modelOutputFilters.instructionEcho.some((pattern) => pattern.test(normalized))) {
        return true;
    }
    const fieldPattern = fieldNames.map(escapedRegExp).join('|');
    return (
        fieldPattern.length > 0 &&
        [
            semanticRules().modelOutputFilters.fieldPlaceholder,
            semanticRules().modelOutputFilters.fieldInstruction,
            semanticRules().modelOutputFilters.fieldOrdinal
        ].some((template) => fieldFilter(template, fieldPattern).test(normalized))
    );
}

/**
 * Whether a proposed string carries code or JSON fragments instead of field content: it starts with closing
 * punctuation, contains braces or backticks, or repeats a JSON key/value separator. These are shape defects
 * of the answer, independent of what the field means.
 *
 * @param value proposed string
 * @returns true for a structural fragment
 */
export function isStructuralFragment(value: string): boolean {
    return /^\s*[)\]};:,]/u.test(value) || /[{}`]/u.test(value) || /"\s*:\s*["\d[{]/u.test(value);
}

function validCandidate(property: SchemaProperty, value: unknown, strictNarrative = false): value is JsonValue {
    if (!propertyValueIsValid(property, value)) {
        return false;
    }
    if (property.primitiveType !== 'string' || value === null || property.enumValues !== undefined) {
        return true;
    }
    return (
        typeof value === 'string' &&
        /[\p{L}\p{N}]/u.test(value) &&
        !/^\s*[\[{]/u.test(value) &&
        !isStructuralFragment(value) &&
        (!strictNarrative || !isNarrativePlaceholder(property, value))
    );
}

function validSyntheticDomainGroup(
    entity: SchemaEntity,
    fields: ReadonlyArray<SftFieldRequest>,
    domainKey: string,
    rows: ReadonlyArray<MockDataRow>,
    expectedRows: number
): boolean {
    if (rows.length !== expectedRows) {
        return false;
    }
    const key = entity.properties.find(({ name }) => name === domainKey);
    const textName = key?.links?.text;
    const text = entity.properties.find(({ name }) => name === textName);
    if (
        !key ||
        !text ||
        !fields.some(({ name }) => name === key.name) ||
        !fields.some(({ name }) => name === text.name)
    ) {
        return false;
    }
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    const expectedNames = fields.map(({ name }) => name).sort();
    const keys = new Set<string>();
    for (const row of rows) {
        if (!isPlainRecord(row)) {
            return false;
        }
        const actualNames = Object.keys(row).sort();
        if (
            actualNames.length !== expectedNames.length ||
            !actualNames.every((name, index) => name === expectedNames[index]) ||
            !fields.every(({ name }) => {
                const property = properties.get(name);
                return property !== undefined && validCandidate(property, row[name], name === text.name);
            })
        ) {
            return false;
        }
        const keyValue = row[key.name];
        const textValue = row[text.name];
        if (
            typeof keyValue !== 'string' ||
            typeof textValue !== 'string' ||
            !/\p{L}/u.test(textValue) ||
            normalizedText(keyValue) === normalizedText(textValue)
        ) {
            return false;
        }
        const signature = JSON.stringify(keyValue);
        if (keys.has(signature)) {
            return false;
        }
        keys.add(signature);
    }
    return true;
}

function linkedTextOwners(
    entity: SchemaEntity,
    fields: ReadonlyArray<SftFieldRequest>
): ReadonlyArray<Readonly<{ owner: SchemaProperty; text: SftFieldRequest }>> {
    return entity.properties.flatMap((owner) => {
        const text = fields.find(({ name }) => name === owner.links?.text);
        return text ? [{ owner, text }] : [];
    });
}

/**
 * Fields the model must propose in one call and that are accepted together: a code with its text
 * when the model proposes both (a generated domain key and its caption, or a linked pair).
 *
 * @param entity the resource's entity
 * @param fields the fields the model proposes
 * @returns groups of field names
 */
function coupledFieldGroups(
    entity: SchemaEntity,
    fields: ReadonlyArray<SftFieldRequest>
): ReadonlyArray<ReadonlyArray<string>> {
    const names = new Set(fields.map(({ name }) => name));
    return Object.freeze(
        entity.properties.flatMap((owner) => {
            const text = owner.links?.text;
            return text && text !== owner.name && names.has(text) && names.has(owner.name)
                ? [Object.freeze([owner.name, text])]
                : [];
        })
    );
}

function validLinkedTextGroup(
    entity: SchemaEntity,
    fields: ReadonlyArray<SftFieldRequest>,
    linkedTexts: ReturnType<typeof linkedTextOwners>,
    rows: ReadonlyArray<MockDataRow>,
    fallbackRows: ReadonlyArray<MockDataRow>
): boolean {
    if (rows.length !== fallbackRows.length) {
        return false;
    }
    const expectedNames = fields.map(({ name }) => name).sort();
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    return rows.every((row, index) => {
        if (!isPlainRecord(row)) {
            return false;
        }
        const actualNames = Object.keys(row).sort();
        return (
            actualNames.length === expectedNames.length &&
            actualNames.every((name, fieldIndex) => name === expectedNames[fieldIndex]) &&
            fields.every(({ name }) => {
                const property = properties.get(name);
                return (
                    property !== undefined &&
                    validCandidate(
                        property,
                        row[name],
                        linkedTexts.some(({ text }) => text.name === name)
                    )
                );
            }) &&
            linkedTexts.every(({ owner, text }) => {
                const code = row[owner.name] ?? fallbackRows[index]?.[owner.name];
                const caption = row[text.name];
                return (
                    code !== undefined &&
                    typeof caption === 'string' &&
                    /\p{L}/u.test(caption) &&
                    normalizedText(String(code)) !== normalizedText(caption)
                );
            })
        );
    });
}

function completionStatistics(output: Awaited<ReturnType<SftGenerator['generate']>>): {
    attempts: number;
    parsedResponses: number;
} {
    if (output.statistics === undefined) {
        return { attempts: 1, parsedResponses: 1 };
    }
    const { attempts, parsedResponses } = output.statistics;
    if (
        !Number.isSafeInteger(attempts) ||
        attempts <= 0 ||
        !Number.isSafeInteger(parsedResponses) ||
        parsedResponses < 0 ||
        parsedResponses > attempts
    ) {
        throw new TypeError('Invalid SFT completion statistics');
    }
    return { attempts, parsedResponses };
}

function isResidual(classification: SemanticClassification | undefined): boolean {
    // A field the prototype head decided is filled from its concept's bank, not by the model.
    if (classification?.source === 'concept') {
        return false;
    }
    return (
        classification === undefined ||
        classification.role === 'unknown' ||
        classification.confidence < (classification.routeThreshold ?? semanticRules().thresholds.statistics)
    );
}

/**
 * Whether no deterministic tier gave a field a value in any row: its role's sources abstained (a free text
 * with no host sample, a bank value too long for the field), so the field is the model's to write.
 *
 * @param property the field
 * @param fallbackRows the deterministic rows
 * @returns true when every row holds null or the empty string
 */
function isAbstained(property: SchemaProperty, fallbackRows: ReadonlyArray<MockDataRow>): boolean {
    return (
        fallbackRows.length > 0 && fallbackRows.every((row) => row[property.name] === null || row[property.name] === '')
    );
}

function residualFields(
    graph: SchemaGraph,
    entity: SchemaEntity,
    classifications: ReadonlyMap<string, SemanticClassification>,
    structuralProperties: ReadonlySet<string>,
    fallbackRows: ReadonlyArray<MockDataRow>,
    generatedDomainKey?: string
): ReadonlyArray<SftFieldRequest> {
    const descriptiveKeys = descriptiveKeyNames(graph, entity);
    return Object.freeze(
        entity.properties
            .filter(
                (property) =>
                    (!property.isKey || property.name === generatedDomainKey || descriptiveKeys.has(property.name)) &&
                    property.enumValues === undefined &&
                    SFT_PRIMITIVE_TYPES.has(property.primitiveType) &&
                    !(property.primitiveType === 'string' && property.maxLength === 0) &&
                    !structuralProperties.has(property.name) &&
                    (isResidual(classifications.get(semanticPropertyKey(entity.entitySetName, property.name))) ||
                        isAbstained(property, fallbackRows))
            )
            .map((property) => {
                const maxLength =
                    property.primitiveType === 'string'
                        ? Math.min(property.maxLength ?? MAX_SFT_STRING_LENGTH, MAX_SFT_STRING_LENGTH)
                        : property.maxLength;
                return Object.freeze({
                    ...fieldRelationshipContext(graph, entity, property),
                    name: property.name,
                    primitiveType: property.primitiveType,
                    // A descriptive key column need not be unique: another key column tells the rows apart.
                    isKey: property.isKey && !descriptiveKeys.has(property.name),
                    ...(property.label === undefined ? {} : { label: property.label }),
                    ...(property.precision === undefined ? {} : { precision: property.precision }),
                    ...(property.scale === undefined ? {} : { scale: property.scale }),
                    description: property.description ?? property.label ?? property.name,
                    nullable: property.nullable,
                    ...(maxLength === undefined ? {} : { maxLength }),
                    ...(property.maxLength === undefined ? {} : { declaredMaxLength: property.maxLength }),
                    ...(property.primitiveType === 'int' && property.numericMinimum !== undefined
                        ? { minimum: property.numericMinimum }
                        : {}),
                    ...(property.primitiveType === 'int' && property.numericMaximum !== undefined
                        ? { maximum: property.numericMaximum }
                        : {}),
                    ...(property.enumValues ? { allowedDomain: property.enumValues } : {})
                });
            })
    );
}

/**
 * Preserve graph evidence for the model, including the consumers of reference captions.
 *
 * @param graph
 * @param entity
 * @param property
 */
function fieldRelationshipContext(
    graph: SchemaGraph,
    entity: SchemaEntity,
    property: SchemaProperty
): Partial<SftFieldRequest> {
    const relatedNames = new Set([
        property.name,
        ...entity.properties.filter((owner) => owner.links?.text === property.name).map(({ name }) => name)
    ]);
    const referencedBy = new Set<string>();
    for (const owner of graph.entities) {
        for (const field of owner.properties) {
            if (
                field.links?.valueListCollection === entity.entitySetName &&
                field.links.valueListMappings?.some(({ valueListProperty }) => relatedNames.has(valueListProperty))
            ) {
                referencedBy.add(`${owner.entitySetName}.${field.name}`);
            }
        }
    }
    const foreignKeyTargets = new Set<string>();
    for (const relationship of graph.relationships) {
        for (const mapping of relationship.mappings) {
            if (relationship.fromEntitySet === entity.entitySetName && relatedNames.has(mapping.sourceProperty)) {
                foreignKeyTargets.add(`${relationship.toEntitySet}.${mapping.targetProperty}`);
            }
            if (relationship.toEntitySet === entity.entitySetName && relatedNames.has(mapping.targetProperty)) {
                referencedBy.add(`${relationship.fromEntitySet}.${mapping.sourceProperty}`);
            }
        }
    }
    return {
        ...(referencedBy.size ? { referencedBy: Object.freeze([...referencedBy].sort()) } : {}),
        ...(foreignKeyTargets.size ? { foreignKeyTargets: Object.freeze([...foreignKeyTargets].sort()) } : {}),
        ...(property.links?.valueListCollection
            ? { valueHelpTargets: Object.freeze([property.links.valueListCollection]) }
            : {}),
        ...(property.links?.currency || property.links?.unit
            ? { currencyOrUnitField: property.links.currency ?? property.links.unit }
            : {})
    };
}

/**
 * Only unbound, fully synthetic code/text reference domains may receive model-generated keys.
 *
 * @param graph
 * @param entity
 * @param existingData
 * @param structural
 * @param classifications
 */
function syntheticDomainKey(
    graph: SchemaGraph,
    entity: SchemaEntity,
    existingData: Readonly<Record<string, ExistingMockData>>,
    structural: ReadonlySet<string>,
    classifications: ReadonlyMap<string, SemanticClassification>
): string | undefined {
    if (ownsInitialData(existingData[entity.entitySetName])) {
        return undefined;
    }
    const keys = entity.properties.filter(({ isKey }) => isKey);
    const key = keys.length === 1 ? keys[0] : undefined;
    const text = entity.properties.find(({ name }) => name === key?.links?.text);
    if (
        !key ||
        !text ||
        key.enumValues !== undefined ||
        text.enumValues !== undefined ||
        entity.properties.some(({ name }) => structural.has(name)) ||
        !isResidual(classifications.get(semanticPropertyKey(entity.entitySetName, key.name))) ||
        !isResidual(classifications.get(semanticPropertyKey(entity.entitySetName, text.name))) ||
        !graph.entities.some((owner) =>
            owner.properties.some(
                (property) =>
                    property.links?.valueListCollection === entity.entitySetName &&
                    property.links.valueListMappings?.some(({ valueListProperty }) => valueListProperty === key.name)
            )
        )
    ) {
        return undefined;
    }
    return key.name;
}

function reservedSftProperties(
    entity: SchemaEntity,
    relationshipProperties: ReadonlySet<string>,
    options: MockDataGeneratorOptions
): Set<string> {
    const reserved = new Set(relationshipProperties);
    coherencePropertyNames(
        entity,
        options.syntheticScenario?.coherence?.[entity.entitySetName] ?? ['temporal']
    ).forEach((name) => reserved.add(name));
    metadataControlPropertyNames(entity).forEach((name) => reserved.add(name));
    for (const property of entity.properties) {
        if (property.links?.valueListCollection) {
            property.links.valueListMappings?.forEach(({ localProperty }) => reserved.add(localProperty));
            if (property.links.text) {
                reserved.add(property.links.text);
            }
        }
        if (entity.codeList === 'currency') {
            for (const companion of [property.links?.scale, property.links?.standardCode]) {
                if (companion) {
                    reserved.add(companion);
                }
            }
        }
    }
    return reserved;
}

/**
 * Report the generated code/text domains whose display values need a model that is not available.
 * Generation continues: those resources keep their deterministic values, and the warning marks them
 * as unverified. With a model but no relevance check, `applySftGeneration` reports the same warning
 * for the resources it has to leave unverified.
 *
 * @param graph
 * @param targets
 * @param existingData
 * @param classifications
 * @param sftAvailable
 * @param options
 * @returns one warning per affected entity set
 */
export function syntheticDomainReadinessDiagnostics(
    graph: SchemaGraph,
    targets: ReadonlySet<string>,
    existingData: Readonly<Record<string, ExistingMockData>>,
    classifications: ReadonlyMap<string, SemanticClassification>,
    sftAvailable: boolean,
    options: MockDataGeneratorOptions = {}
): ReadonlyArray<MockDataGeneratorDiagnostic> {
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    if (sftAvailable) {
        return diagnostics;
    }
    for (const entity of graph.entities) {
        if (!targets.has(entity.entitySetName)) {
            continue;
        }
        const structural = new Set<string>();
        for (const relationship of graph.relationships) {
            if (relationship.fromEntitySet === entity.entitySetName) {
                relationship.mappings.forEach(({ sourceProperty }) => structural.add(sourceProperty));
            }
            if (relationship.toEntitySet === entity.entitySetName) {
                relationship.mappings.forEach(({ targetProperty }) => structural.add(targetProperty));
            }
        }
        // A domain with supplied rows is owned by the caller; syntheticDomainKey declines it.
        const reserved = reservedSftProperties(entity, structural, options);
        if (syntheticDomainKey(graph, entity, existingData, reserved, classifications)) {
            diagnostics.push(
                Object.freeze({
                    code: 'SFT_CANDIDATE_VERIFIER_UNAVAILABLE',
                    severity: 'warning' as const,
                    target: entity.entitySetName,
                    message: VERIFIER_UNAVAILABLE_MESSAGE
                })
            );
        }
    }
    return Object.freeze(diagnostics);
}

function notifyProgress(
    observer: ((event: MockDataGenerationProgress) => void) | undefined,
    event: MockDataGenerationProgress
): void {
    try {
        observer?.(Object.freeze(event));
    } catch {
        // Observability must never change generation results.
    }
}

/**
 * Resolve metadata-referenced UI field-control properties that must stay deterministic.
 *
 * @param entity - Canonical schema entity.
 * @returns Referenced field-control property names owned by the deterministic tier.
 */
function metadataControlPropertyNames(entity: SchemaEntity): ReadonlySet<string> {
    const propertyNames = new Set(entity.properties.map(({ name }) => name));
    const controls = new Set<string>();
    for (const property of entity.properties) {
        for (const annotation of property.annotations) {
            const term = annotation.term.toLowerCase();
            const isV2PropertyReference = term === SAP_V2_TERM.fieldControl;
            const isV4PropertyReference =
                term.endsWith(VOCABULARY_TERM_SUFFIX.fieldControl) &&
                (annotation.expressionKind === 'PropertyPath' || annotation.expressionKind === 'Path');
            if (typeof annotation.value !== 'string' || !(isV2PropertyReference || isV4PropertyReference)) {
                continue;
            }
            const referencedProperty = annotation.value.split('/').at(-1);
            if (referencedProperty && propertyNames.has(referencedProperty)) {
                controls.add(referencedProperty);
            }
        }
    }
    return controls;
}

async function generateWithinBudget(
    sft: SftGenerator,
    input: Parameters<SftGenerator['generate']>[0],
    parentSignal: AbortSignal,
    timeoutMs: number
): Promise<Awaited<ReturnType<SftGenerator['generate']>>> {
    const controller = new AbortController();
    let rejectAborted!: (reason: unknown) => void;
    const aborted = new Promise<never>((_resolve, reject) => {
        rejectAborted = reject;
    });
    const rejectOnAbort = (): void => {
        rejectAborted(controller.signal.reason ?? new Error('SFT inference aborted'));
    };
    controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
    const abortFromParent = (): void => controller.abort(parentSignal.reason);
    parentSignal.addEventListener('abort', abortFromParent, { once: true });
    if (parentSignal.aborted) {
        abortFromParent();
    }
    const timeout = setTimeout(() => {
        const error = Object.assign(new Error(`SFT inference timed out after ${timeoutMs} ms`), {
            code: 'SFT_INFERENCE_TIMEOUT' as const
        });
        controller.abort(error);
    }, timeoutMs);
    try {
        return await Promise.race([Promise.resolve().then(() => sft.generate(input, controller.signal)), aborted]);
    } finally {
        clearTimeout(timeout);
        parentSignal.removeEventListener('abort', abortFromParent);
        controller.signal.removeEventListener('abort', rejectOnAbort);
    }
}

async function verifyWithinBudget(
    verifier: SftCandidateRelevanceVerifier,
    pairs: ReadonlyArray<SftCandidateRelevancePair>,
    parentSignal: AbortSignal,
    timeoutMs: number
): Promise<ReadonlyArray<boolean>> {
    parentSignal.throwIfAborted();
    const controller = new AbortController();
    let rejectOnAbort: (reason: unknown) => void = () => undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
        rejectOnAbort = reject;
    });
    const abort = (): void => rejectOnAbort(controller.signal.reason ?? new CandidateRelevanceError());
    const abortFromParent = (): void => controller.abort(parentSignal.reason);
    controller.signal.addEventListener('abort', abort, { once: true });
    parentSignal.addEventListener('abort', abortFromParent, { once: true });
    const timeout = setTimeout(() => controller.abort(new CandidateRelevanceError()), timeoutMs);
    try {
        return await Promise.race([verifier.verifyBatch(pairs, controller.signal), aborted]);
    } finally {
        clearTimeout(timeout);
        parentSignal.removeEventListener('abort', abortFromParent);
        controller.signal.removeEventListener('abort', abort);
    }
}

/**
 * The rows whose proposed linked texts the independent relevance check accepts. Only rows that
 * propose a usable caption for every linked text (letters, valid, different from its code) are sent.
 * A check that fails or runs out of time verifies no row.
 *
 * @param entity the resource's entity
 * @param linkedTexts linked text fields and their code owners
 * @param rows candidate rows
 * @param fallbackRows deterministic rows, for codes the model did not propose
 * @param verify the budgeted relevance check
 * @param context service and resource of the pairs
 * @param context.service service identity
 * @param context.resource entity set
 * @returns indexes of verified rows
 */
async function verifiedLinkedTextRows(
    entity: SchemaEntity,
    linkedTexts: ReturnType<typeof linkedTextOwners>,
    rows: ReadonlyArray<MockDataRow>,
    fallbackRows: ReadonlyArray<MockDataRow>,
    verify: (pairs: ReadonlyArray<SftCandidateRelevancePair>) => Promise<ReadonlyArray<boolean>>,
    context: Readonly<{ service: MockDataServiceIdentity; resource: string }>
): Promise<ReadonlySet<number>> {
    const properties = new Map(entity.properties.map((property) => [property.name, property]));
    const proposing = rows.flatMap((row, rowIndex) => {
        const usable =
            isPlainRecord(row) &&
            linkedTexts.every(({ owner, text }) => {
                const caption = row[text.name];
                const code = row[owner.name] ?? fallbackRows[rowIndex]?.[owner.name];
                const property = properties.get(text.name);
                return (
                    typeof caption === 'string' &&
                    /\p{L}/u.test(caption) &&
                    property !== undefined &&
                    validCandidate(property, caption, true) &&
                    code !== undefined &&
                    normalizedText(String(code)) !== normalizedText(caption)
                );
            });
        return usable ? [rowIndex] : [];
    });
    const pairs = proposing.flatMap((rowIndex) =>
        linkedTexts.map(({ owner, text }) => ({
            service: context.service,
            resource: context.resource,
            entity: entity.name,
            field: text,
            value: String(rows[rowIndex]?.[text.name]),
            linkedCode: {
                property: owner.name,
                value: String(rows[rowIndex]?.[owner.name] ?? fallbackRows[rowIndex]?.[owner.name])
            },
            textLink: { codeProperty: owner.name, textProperty: text.name },
            relatedResources: Object.freeze(
                [...new Set((text.referencedBy ?? []).map((reference) => reference.split('.')[0]))].sort()
            )
        }))
    );
    if (pairs.length === 0) {
        return new Set();
    }
    let decisions: ReadonlyArray<boolean>;
    try {
        decisions = await verify(pairs);
    } catch (error) {
        if (!(error instanceof CandidateRelevanceError)) {
            throw error;
        }
        return new Set();
    }
    if (!Array.isArray(decisions) || decisions.length !== pairs.length) {
        return new Set();
    }
    return new Set(
        proposing.filter((_rowIndex, position) =>
            decisions
                .slice(position * linkedTexts.length, (position + 1) * linkedTexts.length)
                .every((decision) => decision === true)
        )
    );
}

/** What the fine-tuned tier runs on. */
export interface SftGenerationRequest {
    /** The service schema. */
    graph: SchemaGraph;
    /** The deterministic rows, which the model refines and which remain the fallback. */
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    /** The service the rows belong to. */
    service: MockDataServiceIdentity;
    /** Generation options, with the SFT budget already cut to the generation deadline. */
    options: MockDataGeneratorOptions;
    /** Planned semantic roles by `EntitySet.Property`. */
    classifications: ReadonlyMap<string, SemanticClassification>;
    /** The fine-tuned generator. */
    sft: SftGenerator;
    /** Cancels the whole tier. */
    signal: AbortSignal;
    /** The caller's own rows by entity set; none by default. */
    existingData?: Readonly<Record<string, ExistingMockData>>;
    /** Receives progress events; failures of the observer never affect generation. */
    onProgress?: (event: MockDataGenerationProgress) => void;
    /** Verifies that proposed display values are relevant to their fields. */
    candidateVerifier?: SftCandidateRelevanceVerifier;
}

/** A resource in generation order, with the fields the model is asked to fill. */
interface PreparedSftResource {
    resourceName: string;
    fallbackRows: ReadonlyArray<MockDataRow>;
    entity: SchemaEntity | undefined;
    fields: ReadonlyArray<SftFieldRequest>;
    domainKey: string | undefined;
}

/** The outputs and running totals of one fine-tuned run, updated resource by resource. */
interface SftRunState {
    readonly generated: Record<string, ReadonlyArray<MockDataRow>>;
    readonly diagnostics: MockDataGeneratorDiagnostic[];
    readonly assignments: SftAssignmentStatistics[];
    readonly skippedResources: SftSkippedResource[];
    readonly relevanceVerifiedResources: Set<string>;
    attempts: number;
    parsedResponses: number;
    eligibleSlots: number;
    acceptedSlots: number;
    rejectedSlots: number;
}

/** How the service budget is shared among the resources still to generate. */
interface SftSchedule {
    readonly startedAt: number;
    readonly serviceBudgetMs: number;
    /** The shortest slice an attempt gets. */
    readonly minimumAttemptMs: number;
    /** Resources with fields to fill that have not been attempted or skipped yet. */
    remainingEntities: number;
    attemptedResources: number;
    budgetSkipped: number;
}

/** One resource the model is asked to fill, with the budget of its attempt. */
interface SftResourceAttempt {
    readonly resourceName: string;
    readonly entity: SchemaEntity;
    readonly fallbackRows: ReadonlyArray<MockDataRow>;
    readonly fields: ReadonlyArray<SftFieldRequest>;
    readonly domainKey: string | undefined;
    readonly linkedTexts: ReturnType<typeof linkedTextOwners>;
    readonly coupledGroups: ReadonlyArray<ReadonlyArray<string>>;
    /** How many leading rows the model writes; the others reuse its values. */
    readonly modelRowCount: number;
    readonly modelFallbackRows: ReadonlyArray<MockDataRow>;
    readonly budgetMs: number;
    readonly startedAt: number;
    readonly progress: Readonly<{ resource: string; fields: ReadonlyArray<string>; rowCount: number }>;
}

/** The model rows of one attempt that passed generation and the relevance check. */
interface SftCandidates {
    readonly rows: ReadonlyArray<MockDataRow>;
    /** Rows whose linked texts the relevance check accepted; linked texts of other rows keep their fallback. */
    readonly verifiedTextRows: ReadonlySet<number>;
}

/** The rows of one resource as they are merged from model candidates and fallback rows. */
interface MergedSftRows {
    readonly generatedRows: MockDataRow[];
    readonly generatedDomainRows: MockDataRow[];
    readonly generatedKeys: Set<string>;
    /** The values each model row contributed, for the rows that reuse them. */
    readonly acceptedValues: Array<Record<string, JsonValue>>;
    readonly acceptedByField: Map<string, number>;
    readonly invalidByField: Map<string, number>;
    rowsWithoutCandidate: number;
    duplicateDomainRows: number;
}

/** What merging one candidate row reads and updates. */
interface SftRowMerge {
    readonly attempt: SftResourceAttempt;
    readonly candidates: SftCandidates;
    readonly fieldByName: ReadonlyMap<string, SchemaProperty>;
    readonly merged: MergedSftRows;
    readonly state: SftRunState;
}

const SFT_FAILURES = {
    unverified: {
        code: 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED',
        message: 'Generated display values were not verified as relevant; deterministic fallback remains active.'
    },
    timeout: {
        code: 'SFT_INFERENCE_TIMEOUT',
        message: 'Fine-tuned generation timed out; deterministic fallback remains active.'
    },
    failed: {
        code: 'SFT_INFERENCE_FAILED',
        message: 'Fine-tuned generation failed; deterministic fallback remains active.'
    }
} as const;

/**
 * The relationship properties of each entity set, which the model must not overwrite.
 *
 * @param graph the service schema
 * @returns the source and target properties of every relationship mapping, by entity set
 */
function structuralPropertiesByEntitySet(graph: SchemaGraph): Map<string, Set<string>> {
    const structuralProperties = new Map<string, Set<string>>();
    // One set per entity set: a self-referencing relationship names the same entity set on both
    // ends, so separate sets would let the second end replace the first and leave its foreign key
    // free for the model to overwrite.
    const structuralPropertiesOf = (entitySetName: string): Set<string> => {
        const existing = structuralProperties.get(entitySetName);
        if (existing) {
            return existing;
        }
        const created = new Set<string>();
        structuralProperties.set(entitySetName, created);
        return created;
    };
    for (const relationship of graph.relationships) {
        const source = structuralPropertiesOf(relationship.fromEntitySet);
        const target = structuralPropertiesOf(relationship.toEntitySet);
        relationship.mappings.forEach(({ sourceProperty, targetProperty }) => {
            source.add(sourceProperty);
            target.add(targetProperty);
        });
    }
    return structuralProperties;
}

/**
 * Plan the fields the model fills for each resource and order the resources for generation.
 *
 * @param request the run's schema, rows, roles and options
 * @param existingData the caller's own rows by entity set
 * @param diagnostics receives the notice about skipped protocol entity sets
 * @returns the resources in generation order
 */
function prepareSftResources(
    request: SftGenerationRequest,
    existingData: Readonly<Record<string, ExistingMockData>>,
    diagnostics: MockDataGeneratorDiagnostic[]
): PreparedSftResource[] {
    const { graph, resources, options, classifications } = request;
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const structuralProperties = structuralPropertiesByEntitySet(graph);
    let protocolArtifacts = 0;
    const prepared = Object.entries(resources).map(([resourceName, fallbackRows]): PreparedSftResource => {
        const entity = entities.get(resourceName);
        const reservedProperties = entity
            ? reservedSftProperties(entity, structuralProperties.get(resourceName) ?? new Set(), options)
            : new Set<string>();
        const domainKey = entity
            ? syntheticDomainKey(graph, entity, existingData, reservedProperties, classifications)
            : undefined;
        const authored = ownsInitialData(existingData[resourceName]);
        const protocolArtifact = isProtocolArtifactEntitySet(resourceName);
        if (protocolArtifact) {
            protocolArtifacts += 1;
        }
        // CAP code lists are filled from their codes by the code-list provider, so the model is not asked.
        const codeList = entity !== undefined && capCodeList(entity) !== undefined;
        const fields =
            entity && !authored && !protocolArtifact && !codeList
                ? residualFields(graph, entity, classifications, reservedProperties, fallbackRows, domainKey)
                : [];
        return { resourceName, fallbackRows, entity, fields, domainKey };
    });
    if (protocolArtifacts > 0) {
        diagnostics.push(
            Object.freeze({
                code: 'SFT_SKIPPED_PROTOCOL_ARTIFACTS',
                severity: 'info',
                message: `Fine-tuned generation was skipped for ${protocolArtifacts} SAP Gateway protocol entity set(s); deterministic values are used instead.`
            })
        );
    }
    // Referenced domains are generated before their dependent display fields are projected; then the
    // caller's priority targets (such as the entity sets an app displays), in the caller's order; among
    // the rest, resources with fewer fields to fill go first because they finish within a slice.
    const priority = new Map((options.sftPriorityTargets ?? []).map((target, index) => [target, index]));
    const priorityOf = (resourceName: string): number => priority.get(resourceName) ?? Number.MAX_SAFE_INTEGER;
    prepared.sort(
        (left, right) =>
            Number(Boolean(right.domainKey)) - Number(Boolean(left.domainKey)) ||
            priorityOf(left.resourceName) - priorityOf(right.resourceName) ||
            left.fields.length - right.fields.length
    );
    return prepared;
}

/**
 * The planned fields the model may fill given whether an independent relevance check is available.
 *
 * @param resource the prepared resource, with its entity
 * @param entity the resource's entity
 * @param candidateVerifier the relevance check, when one is available
 * @param diagnostics receives the warning when a domain or linked text cannot be verified
 * @returns the fields to ask the model for
 */
function verifiableFields(
    resource: PreparedSftResource,
    entity: SchemaEntity,
    candidateVerifier: SftCandidateRelevanceVerifier | undefined,
    diagnostics: MockDataGeneratorDiagnostic[]
): ReadonlyArray<SftFieldRequest> {
    const { resourceName, fields: plannedFields, domainKey } = resource;
    // Without an independent relevance check, a generated code/text domain keeps its deterministic
    // rows and linked texts keep their fallback; the other fields may still take model values.
    const plannedTexts = linkedTextOwners(entity, plannedFields);
    if ((domainKey !== undefined || plannedTexts.length > 0) && !candidateVerifier) {
        diagnostics.push(
            Object.freeze({
                code: 'SFT_CANDIDATE_VERIFIER_UNAVAILABLE',
                severity: 'warning',
                target: resourceName,
                message: VERIFIER_UNAVAILABLE_MESSAGE
            })
        );
    }
    if (!candidateVerifier && domainKey !== undefined) {
        return [];
    }
    if (!candidateVerifier) {
        return plannedFields.filter(({ name }) => !plannedTexts.some(({ text }) => text.name === name));
    }
    return plannedFields;
}

/**
 * Decide whether a resource is attempted and, if so, the budget of its attempt. A resource that is not
 * attempted keeps its fallback rows.
 *
 * @param resource the prepared resource
 * @param request the run's options and relevance check
 * @param state receives the fallback rows, skip records and eligible slots
 * @param schedule the service budget, updated with this resource
 * @returns the attempt, or undefined when the resource keeps its fallback rows
 */
function scheduleSftAttempt(
    resource: PreparedSftResource,
    request: SftGenerationRequest,
    state: SftRunState,
    schedule: SftSchedule
): SftResourceAttempt | undefined {
    const { resourceName, fallbackRows, entity, domainKey } = resource;
    const { options } = request;
    if (!entity || resource.fields.length === 0 || fallbackRows.length === 0) {
        state.generated[resourceName] = fallbackRows;
        return undefined;
    }
    const fields = verifiableFields(resource, entity, request.candidateVerifier, state.diagnostics);
    if (fields.length === 0) {
        state.generated[resourceName] = fallbackRows;
        schedule.remainingEntities -= 1;
        return undefined;
    }
    const linkedTexts = linkedTextOwners(entity, fields);
    const coupledGroups = coupledFieldGroups(entity, fields);
    // The model writes the first rows; the rest reuse their values field by field. A generated
    // domain needs every row's own key, so it is always written whole.
    const modelRowCount =
        domainKey === undefined
            ? Math.min(fallbackRows.length, options.sftModelRows ?? fallbackRows.length)
            : fallbackRows.length;
    // Each attempt gets a slice long enough to finish on a small machine; once the service budget
    // cannot fund another slice, the remaining resources keep their deterministic rows.
    const remainingServiceMs = schedule.serviceBudgetMs - (performance.now() - schedule.startedAt);
    if (schedule.attemptedResources > 0 && remainingServiceMs < schedule.minimumAttemptMs) {
        state.generated[resourceName] = fallbackRows;
        schedule.remainingEntities -= 1;
        schedule.budgetSkipped += 1;
        state.skippedResources.push(
            Object.freeze({
                resource: resourceName,
                reason: 'budget' as const,
                rowCount: fallbackRows.length,
                fields: Object.freeze(fields.map(({ name }) => name))
            })
        );
        return undefined;
    }
    state.eligibleSlots += fallbackRows.length * fields.length;
    schedule.attemptedResources += 1;
    const budgetMs = Math.max(
        1,
        Math.floor(
            Math.min(
                options.sftTimeoutMs ?? DEFAULT_SFT_ENTITY_TIMEOUT_MS,
                Math.max(schedule.minimumAttemptMs, remainingServiceMs / Math.max(1, schedule.remainingEntities))
            )
        )
    );
    schedule.remainingEntities -= 1;
    return {
        resourceName,
        entity,
        fallbackRows,
        fields,
        domainKey,
        linkedTexts,
        coupledGroups,
        modelRowCount,
        modelFallbackRows: fallbackRows.slice(0, modelRowCount),
        budgetMs,
        startedAt: performance.now(),
        progress: { resource: resourceName, fields: fields.map(({ name }) => name), rowCount: fallbackRows.length }
    };
}

/**
 * Check the linked texts of the model rows row by row: a verified row keeps its texts, the others keep
 * their fallback, and the other fields are accepted on their own merits.
 *
 * @param attempt the resource attempt
 * @param rows the model rows
 * @param candidateVerifier the relevance check
 * @param request the run's service and cancellation signal
 * @param state receives the resource when any caption is verified
 * @returns the indexes of the rows whose linked texts were verified
 */
async function verifyLinkedTextRows(
    attempt: SftResourceAttempt,
    rows: ReadonlyArray<MockDataRow>,
    candidateVerifier: SftCandidateRelevanceVerifier,
    request: SftGenerationRequest,
    state: SftRunState
): Promise<ReadonlySet<number>> {
    const { service, signal } = request;
    const { resourceName, budgetMs, startedAt } = attempt;
    const verifiedTextRows = await verifiedLinkedTextRows(
        attempt.entity,
        attempt.linkedTexts,
        rows,
        attempt.modelFallbackRows,
        (pairs) => {
            const verifierBudgetMs = budgetMs - (performance.now() - startedAt);
            return verifierBudgetMs > 0
                ? verifyWithinBudget(candidateVerifier, pairs, signal, verifierBudgetMs)
                : Promise.resolve([]);
        },
        { service, resource: resourceName }
    );
    signal.throwIfAborted();
    // Any verified model caption protects the whole resource: finalization must not clone
    // it onto a code it was not verified for.
    if (verifiedTextRows.size > 0) {
        state.relevanceVerifiedResources.add(resourceName);
    }
    return verifiedTextRows;
}

/**
 * Check a generated code/text domain, which is accepted whole or not at all.
 *
 * @param attempt the resource attempt
 * @param rows the model rows
 * @param domainKey the key property of the generated domain
 * @param candidateVerifier the relevance check
 * @param request the run's service and cancellation signal
 * @param state receives the rejected slots, or the resource when the domain is verified
 * @throws {CandidateRelevanceError} when the domain is incomplete, inconsistent or not verified
 */
async function verifyGeneratedDomain(
    attempt: SftResourceAttempt,
    rows: ReadonlyArray<MockDataRow>,
    domainKey: string,
    candidateVerifier: SftCandidateRelevanceVerifier,
    request: SftGenerationRequest,
    state: SftRunState
): Promise<void> {
    const { service, signal } = request;
    const { resourceName, entity, fields, linkedTexts, fallbackRows } = attempt;
    if (
        !validSyntheticDomainGroup(entity, fields, domainKey, rows, fallbackRows.length) ||
        !validLinkedTextGroup(entity, fields, linkedTexts, rows, fallbackRows)
    ) {
        state.rejectedSlots += rows.length * fields.length;
        throw new CandidateRelevanceError();
    }
    const pairs = rows.flatMap((row, rowIndex) => {
        return linkedTexts.map(({ owner, text }) => ({
            service,
            resource: resourceName,
            entity: entity.name,
            field: text,
            value: String(row[text.name]),
            linkedCode: {
                property: owner.name,
                value: String(row[owner.name] ?? fallbackRows[rowIndex][owner.name])
            },
            textLink: { codeProperty: owner.name, textProperty: text.name },
            relatedResources: Object.freeze(
                [...new Set((text.referencedBy ?? []).map((reference) => reference.split('.')[0]))].sort()
            )
        }));
    });
    let accepted = false;
    if (pairs.length === fallbackRows.length * linkedTexts.length) {
        const verifierBudgetMs = attempt.budgetMs - (performance.now() - attempt.startedAt);
        if (verifierBudgetMs <= 0) {
            throw new CandidateRelevanceError();
        }
        const decisions = await verifyWithinBudget(candidateVerifier, pairs, signal, verifierBudgetMs);
        signal.throwIfAborted();
        accepted =
            Array.isArray(decisions) &&
            decisions.length === pairs.length &&
            decisions.every((decision) => decision === true);
    }
    if (!accepted) {
        state.rejectedSlots += rows.length * fields.length;
        throw new CandidateRelevanceError();
    }
    state.relevanceVerifiedResources.add(resourceName);
}

/**
 * Ask the model for the rows of one resource and check their relevance where display values need it.
 *
 * @param attempt the resource attempt
 * @param request the run's generator, service, options, relevance check and cancellation signal
 * @param state receives the completion statistics, rejected slots and verified resources
 * @returns the model rows and the rows whose linked texts were verified
 * @throws {CandidateRelevanceError} when the budget is spent or the candidates are not verified
 */
async function requestSftCandidates(
    attempt: SftResourceAttempt,
    request: SftGenerationRequest,
    state: SftRunState
): Promise<SftCandidates> {
    const { sft, service, options, signal, candidateVerifier } = request;
    const { entity, fields, domainKey, coupledGroups, budgetMs, startedAt } = attempt;
    // One candidate per resource: a retry only changes the seed of the same prompt and costs a
    // full model call (a status value list spent 12 s on three declined attempts), while a
    // declined resource keeps its deterministic rows either way.
    signal.throwIfAborted();
    const remainingBudgetMs = budgetMs - (performance.now() - startedAt);
    if (remainingBudgetMs <= 0) {
        throw new CandidateRelevanceError();
    }
    const attemptBudgetMs = Math.max(1, Math.floor(remainingBudgetMs));
    const output = await generateWithinBudget(
        sft,
        Object.freeze({
            service,
            entityName: entity.name,
            fields,
            ...(coupledGroups.length > 0 ? { coupledFieldGroups: coupledGroups } : {}),
            budgetMs: attemptBudgetMs,
            rowCount: attempt.modelRowCount,
            seed: (options.seed ?? 1) % Number.MAX_SAFE_INTEGER
        }),
        signal,
        // The generator stops at its own budget and returns the rows it completed; the outer
        // bound only catches a generator that does not stop, so it allows one slow native step.
        attemptBudgetMs + GENERATOR_STOP_GRACE_MS
    );
    if (!output || !Array.isArray(output.rows)) {
        throw new TypeError('Invalid SFT generation result');
    }
    const completion = completionStatistics(output);
    state.attempts += completion.attempts;
    state.parsedResponses += completion.parsedResponses;
    const requiresRelevance = domainKey !== undefined || attempt.linkedTexts.length > 0;
    let verifiedTextRows: ReadonlySet<number> = new Set();
    if (requiresRelevance && candidateVerifier && !domainKey) {
        verifiedTextRows = await verifyLinkedTextRows(attempt, output.rows, candidateVerifier, request, state);
    } else if (requiresRelevance && candidateVerifier && domainKey) {
        await verifyGeneratedDomain(attempt, output.rows, domainKey, candidateVerifier, request, state);
    }
    return { rows: output.rows, verifiedTextRows };
}

/**
 * Keep the fallback rows of a resource whose attempt failed, and report why.
 *
 * @param attempt the resource attempt
 * @param error what the attempt threw
 * @param state receives the fallback rows, the assignment record and the diagnostic
 * @param onProgress receives the completion event
 */
function recordFailedAttempt(
    attempt: SftResourceAttempt,
    error: unknown,
    state: SftRunState,
    onProgress: SftGenerationRequest['onProgress']
): void {
    const { resourceName, entity, fallbackRows, fields } = attempt;
    const unverifiedCandidates = error instanceof CandidateRelevanceError;
    state.attempts += 1;
    const timedOut =
        typeof error === 'object' && error !== null && 'code' in error && error.code === 'SFT_INFERENCE_TIMEOUT';
    let failureKind: 'unverified' | 'timeout' | 'failed' = 'failed';
    if (unverifiedCandidates) {
        failureKind = 'unverified';
    } else if (timedOut) {
        failureKind = 'timeout';
    }
    state.assignments.push(
        Object.freeze({
            resource: resourceName,
            entity: entity.name,
            rowCount: fallbackRows.length,
            parsed: false,
            outcome: failureKind,
            rowsWithoutCandidate: fallbackRows.length,
            fields: Object.freeze(
                fields.map(({ name }) => Object.freeze({ name, eligibleSlots: fallbackRows.length, acceptedSlots: 0 }))
            )
        })
    );
    state.generated[resourceName] = fallbackRows;
    notifyProgress(onProgress, {
        ...attempt.progress,
        tier: 'T2',
        phase: 'complete',
        acceptedSlots: 0,
        durationMs: performance.now() - attempt.startedAt
    });
    // A verifier that declines every candidate means the proposed display values could not
    // be shown to be relevant. The deterministic rows are kept and the resource is reported
    // as unverified, which is visible in `validation.domainMeaning`; rejecting the whole
    // service would leave the caller with no data at all.
    const failure = SFT_FAILURES[failureKind];
    // An unexpected failure keeps its cause; a timeout or an unverified domain is fully described by its code.
    const message = failureKind === 'failed' ? `${failure.message} Cause: ${errorMessage(error)}` : failure.message;
    state.diagnostics.push(Object.freeze({ code: failure.code, message, severity: 'warning', target: resourceName }));
}

/**
 * Whether a proposed value of one field passes its constraints; a linked text must also contain a
 * letter and differ from its code.
 *
 * @param entity the resource's entity
 * @param property the proposed field, when the entity declares it
 * @param name the field name
 * @param candidateRow the model row
 * @param fallbackRow the fallback row at the same index
 * @returns true when the value may be accepted
 */
function candidateFieldIsValid(
    entity: SchemaEntity,
    property: SchemaProperty | undefined,
    name: string,
    candidateRow: Record<string, unknown>,
    fallbackRow: MockDataRow
): boolean {
    const role = property ? semanticRoleCandidate(entity, property) : undefined;
    const narrative = role ? semanticRoleDefinition(role)?.sftEligible === true : false;
    const linkedText = entity.properties.some((owner) => owner.links?.text === name);
    const value = candidateRow[name];
    if (
        linkedText &&
        (typeof value !== 'string' ||
            !/\p{L}/u.test(value) ||
            entity.properties.some(
                (owner) =>
                    owner.links?.text === name &&
                    normalizedText(String(candidateRow[owner.name] ?? fallbackRow[owner.name])) ===
                        normalizedText(value)
            ))
    ) {
        return false;
    }
    return property !== undefined && validCandidate(property, value, narrative || linkedText);
}

/**
 * Whether a complete, valid row of a generated domain introduces a new key. A row whose key repeats is
 * dropped; an identical repeat counts as legitimate deduplication.
 *
 * @param merge the resource's merge state
 * @param domainKey the key property of the generated domain
 * @param candidateRow the model row
 * @param presentCount how many requested fields the row proposes
 * @param validCount how many of them are valid
 * @returns true when the row is accepted into the domain
 */
function acceptsDomainRow(
    merge: SftRowMerge,
    domainKey: string,
    candidateRow: Record<string, unknown>,
    presentCount: number,
    validCount: number
): boolean {
    const { fields } = merge.attempt;
    const { merged } = merge;
    // A generated domain row is one unit: every field valid, or the row stays deterministic.
    if (presentCount !== fields.length || validCount !== fields.length) {
        merge.state.rejectedSlots += fields.length;
        return false;
    }
    const signature = JSON.stringify(candidateRow[domainKey]);
    if (merged.generatedKeys.has(signature)) {
        const previous = merged.generatedDomainRows.find((row) => row[domainKey] === candidateRow[domainKey]);
        if (previous && fields.every(({ name }) => previous[name] === candidateRow[name])) {
            merged.duplicateDomainRows += 1;
        }
        return false;
    }
    merged.generatedKeys.add(signature);
    return true;
}

/**
 * Write the acceptable fields of a model row over its fallback row. Fields are accepted one by one;
 * coupled fields only together, and linked texts only in rows the relevance check verified.
 *
 * @param merge the resource's merge state
 * @param rowIndex the row's index
 * @param fallbackRow the fallback row at the same index
 * @param candidateRow the model row
 * @param valid the names of the fields whose proposed values are valid
 */
function acceptCandidateFields(
    merge: SftRowMerge,
    rowIndex: number,
    fallbackRow: MockDataRow,
    candidateRow: Record<string, unknown>,
    valid: ReadonlySet<string>
): void {
    const { attempt, merged, state } = merge;
    const { fields, linkedTexts, coupledGroups, domainKey } = attempt;
    const acceptable = (name: string): boolean =>
        valid.has(name) &&
        (!linkedTexts.some(({ text }) => text.name === name) ||
            merge.candidates.verifiedTextRows.has(rowIndex) ||
            !!domainKey);
    const accepted = fields.filter(
        ({ name }) =>
            acceptable(name) && coupledGroups.every((group) => !group.includes(name) || group.every(acceptable))
    );
    state.rejectedSlots += fields.length - accepted.length;
    const row: Record<string, JsonValue> = { ...fallbackRow };
    for (const { name } of accepted) {
        row[name] = candidateRow[name] as JsonValue;
        merged.acceptedByField.set(name, (merged.acceptedByField.get(name) ?? 0) + 1);
        state.acceptedSlots += 1;
    }
    merged.acceptedValues[rowIndex] = Object.fromEntries(
        accepted.map(({ name }) => [name, candidateRow[name] as JsonValue])
    );
    merged.generatedRows.push(Object.freeze(row));
    if (domainKey) {
        merged.generatedDomainRows.push(Object.freeze(row));
    }
}

/**
 * Merge one model row into the resource: its valid values replace the fallback values, and a row with
 * an instruction echo or no candidate keeps the fallback row.
 *
 * @param merge the resource's merge state
 * @param rowIndex the row's index
 * @param fallbackRow the fallback row at the same index
 */
function mergeCandidateRow(merge: SftRowMerge, rowIndex: number, fallbackRow: MockDataRow): void {
    const { attempt, merged, fieldByName } = merge;
    const { entity, fields, domainKey } = attempt;
    const candidateRow: unknown = merge.candidates.rows[rowIndex];
    if (!isPlainRecord(candidateRow)) {
        merged.rowsWithoutCandidate += 1;
        merged.generatedRows.push(fallbackRow);
        return;
    }
    if (Object.keys(candidateRow).length === 0) {
        merged.rowsWithoutCandidate += 1;
    }
    const present = fields.filter(({ name }) => Object.prototype.hasOwnProperty.call(candidateRow, name));
    // An instruction echo anywhere in the row means none of its values are trusted.
    if (
        present.some(({ name }) => {
            const property = fieldByName.get(name);
            return property !== undefined && isInstructionEcho(property, candidateRow[name]);
        })
    ) {
        present.forEach(({ name }) => merged.invalidByField.set(name, (merged.invalidByField.get(name) ?? 0) + 1));
        merge.state.rejectedSlots += fields.length;
        merged.generatedRows.push(fallbackRow);
        return;
    }
    const valid = new Set(
        present
            .filter(({ name }) => candidateFieldIsValid(entity, fieldByName.get(name), name, candidateRow, fallbackRow))
            .map(({ name }) => name)
    );
    present.forEach(({ name }) => {
        if (!valid.has(name)) {
            merged.invalidByField.set(name, (merged.invalidByField.get(name) ?? 0) + 1);
        }
    });
    if (domainKey && !acceptsDomainRow(merge, domainKey, candidateRow, present.length, valid.size)) {
        merged.generatedRows.push(fallbackRow);
        return;
    }
    acceptCandidateFields(merge, rowIndex, fallbackRow, candidateRow, valid);
}

/**
 * Merge the model rows of a resource with its fallback rows.
 *
 * @param attempt the resource attempt
 * @param candidates the model rows that passed the relevance check
 * @param state receives the accepted and rejected slots
 * @returns the merged rows and per-field counts
 */
function mergeModelRows(attempt: SftResourceAttempt, candidates: SftCandidates, state: SftRunState): MergedSftRows {
    const { entity, fields } = attempt;
    const merged: MergedSftRows = {
        generatedRows: [],
        generatedDomainRows: [],
        generatedKeys: new Set<string>(),
        acceptedValues: [],
        acceptedByField: new Map(fields.map(({ name }) => [name, 0])),
        invalidByField: new Map(fields.map(({ name }) => [name, 0])),
        rowsWithoutCandidate: 0,
        duplicateDomainRows: 0
    };
    const fieldByName = new Map(
        entity.properties
            .filter((property) => fields.some((field) => field.name === property.name))
            .map((property) => [property.name, property])
    );
    const merge: SftRowMerge = { attempt, candidates, fieldByName, merged, state };
    for (const [rowIndex, fallbackRow] of attempt.modelFallbackRows.entries()) {
        mergeCandidateRow(merge, rowIndex, fallbackRow);
    }
    return merged;
}

/**
 * Fill the rows beyond the model's by reusing its values unit by unit (a coupled group moves as one),
 * each unit from a different model row so the combinations vary. A linked text whose code is not
 * generated with it stays with its own code, so it is never reused.
 *
 * @param attempt the resource attempt
 * @param merged the merged model rows, extended with the reusing rows
 * @param state receives the accepted slots
 */
function reuseModelValues(attempt: SftResourceAttempt, merged: MergedSftRows, state: SftRunState): void {
    const { fields, coupledGroups, linkedTexts, fallbackRows, modelRowCount } = attempt;
    if (modelRowCount >= fallbackRows.length) {
        return;
    }
    const grouped = new Set(coupledGroups.flat());
    const units = [
        ...coupledGroups,
        ...fields.filter(({ name }) => !grouped.has(name)).map(({ name }) => [name])
    ].filter((unit) => !linkedTexts.some(({ owner, text }) => unit.includes(text.name) && !unit.includes(owner.name)));
    const sources = units.map((unit) =>
        merged.acceptedValues.filter((values) => values !== undefined && unit.every((name) => name in values))
    );
    for (const fallbackRow of fallbackRows.slice(modelRowCount)) {
        const rowIndex = merged.generatedRows.length;
        const row: Record<string, JsonValue> = { ...fallbackRow };
        for (const [unitIndex, unit] of units.entries()) {
            const pool = sources[unitIndex] ?? [];
            const source = pool[(rowIndex + unitIndex) % Math.max(1, pool.length)];
            if (!source) {
                continue;
            }
            for (const name of unit) {
                row[name] = source[name] as JsonValue;
                merged.acceptedByField.set(name, (merged.acceptedByField.get(name) ?? 0) + 1);
                state.acceptedSlots += 1;
            }
        }
        merged.generatedRows.push(Object.freeze(row));
    }
}

/**
 * Publish the merged rows of a resource and report how many of its slots the model filled.
 *
 * @param attempt the resource attempt
 * @param merged the merged rows and per-field counts
 * @param state receives the rows, diagnostics and assignment record
 * @param onProgress receives the completion event
 */
function recordGeneratedResource(
    attempt: SftResourceAttempt,
    merged: MergedSftRows,
    state: SftRunState,
    onProgress: SftGenerationRequest['onProgress']
): void {
    const { resourceName, entity, fields, fallbackRows, domainKey } = attempt;
    const { generatedRows, generatedDomainRows, acceptedByField, invalidByField, rowsWithoutCandidate } = merged;
    state.generated[resourceName] = Object.freeze(generatedDomainRows.length ? generatedDomainRows : generatedRows);
    const publishedRowCount = state.generated[resourceName].length;
    // Only identical complete proposals are legitimate finite-domain deduplication.
    // Missing, invalid or conflicting proposals must remain visible as unresolved slots.
    const eligibleRowCount = fallbackRows.length - merged.duplicateDomainRows;
    state.eligibleSlots -= merged.duplicateDomainRows * fields.length;
    const entityAcceptedSlots = [...acceptedByField.values()].reduce((sum, count) => sum + count, 0);
    if (entityAcceptedSlots > 0) {
        state.diagnostics.push({
            code: 'SFT_SEMANTICS_UNVERIFIED',
            severity: 'info',
            target: resourceName,
            message:
                'Model proposals passed field constraints, not independent business-semantic validation. These assignments do not establish semantic coverage or realism.'
        });
    }
    notifyProgress(onProgress, {
        ...attempt.progress,
        tier: 'T2',
        phase: 'complete',
        rowCount: publishedRowCount,
        acceptedSlots: entityAcceptedSlots,
        durationMs: performance.now() - attempt.startedAt
    });
    if (domainKey && generatedDomainRows.length) {
        state.diagnostics.push({
            code: 'SYNTHETIC_REFERENCE_DOMAIN',
            severity: 'info',
            target: resourceName,
            message:
                'The local model generated this code/text domain. Its tuples are synthetic, not an authoritative application domain.'
        });
    }
    if (entityAcceptedSlots < eligibleRowCount * fields.length) {
        state.diagnostics.push({
            code: 'SFT_PARTIAL_FALLBACK',
            severity: 'warning',
            target: resourceName,
            message:
                'Not all unresolved slots received valid model output; fields retain structural fallback or incomplete synthetic reference rows are omitted.'
        });
    }
    let outcome: SftResourceOutcome = 'rejected';
    if (entityAcceptedSlots >= eligibleRowCount * fields.length) {
        outcome = 'accepted';
    } else if (entityAcceptedSlots > 0) {
        outcome = 'partial';
    } else if (rowsWithoutCandidate >= attempt.modelRowCount) {
        outcome = 'incomplete';
    }
    state.assignments.push(
        Object.freeze({
            resource: resourceName,
            entity: entity.name,
            rowCount: publishedRowCount,
            parsed: true,
            outcome,
            rowsWithoutCandidate,
            fields: Object.freeze(
                fields.map(({ name }) =>
                    Object.freeze({
                        name,
                        eligibleSlots: eligibleRowCount,
                        acceptedSlots: acceptedByField.get(name) ?? 0,
                        invalidSlots: invalidByField.get(name) ?? 0
                    })
                )
            )
        })
    );
}

/**
 * Run the model on one scheduled resource and record its rows, whether the attempt succeeds or not.
 *
 * @param attempt the resource attempt
 * @param request the run's generator, service, options, relevance check and observers
 * @param state receives the rows, statistics and diagnostics
 */
async function runSftAttempt(
    attempt: SftResourceAttempt,
    request: SftGenerationRequest,
    state: SftRunState
): Promise<void> {
    let candidates: SftCandidates;
    try {
        candidates = await requestSftCandidates(attempt, request, state);
    } catch (error) {
        request.signal.throwIfAborted();
        recordFailedAttempt(attempt, error, state, request.onProgress);
        return;
    }
    const merged = mergeModelRows(attempt, candidates, state);
    reuseModelValues(attempt, merged, state);
    recordGeneratedResource(attempt, merged, state, request.onProgress);
}

/**
 * The frozen result of a run, with the budget notice when resources were skipped.
 *
 * @param state the run's outputs and totals
 * @param budgetSkipped how many resources the service budget could not fund
 * @returns the run result
 */
function sftRunResult(state: SftRunState, budgetSkipped: number): SftRunResult {
    const { diagnostics, eligibleSlots, acceptedSlots, skippedResources } = state;
    if (budgetSkipped > 0) {
        diagnostics.push(
            Object.freeze({
                code: 'SFT_BUDGET_EXHAUSTED',
                severity: 'info',
                message: `Fine-tuned generation used its time budget; ${budgetSkipped} resource(s) keep their deterministic values.`
            })
        );
    }
    return Object.freeze({
        resources: Object.freeze(state.generated),
        relevanceVerifiedResources: state.relevanceVerifiedResources,
        diagnostics: Object.freeze(diagnostics),
        degraded: diagnostics.some(({ code }) =>
            ['SFT_INFERENCE_FAILED', 'SFT_INFERENCE_TIMEOUT', 'SFT_PARTIAL_FALLBACK'].includes(code)
        ),
        statistics: Object.freeze({
            attempts: state.attempts,
            parsedResponses: state.parsedResponses,
            eligibleSlots,
            acceptedSlots,
            rejectedSlots: state.rejectedSlots,
            fallbackSlots: Math.max(0, eligibleSlots - acceptedSlots),
            assignments: Object.freeze(state.assignments),
            ...(skippedResources.length > 0 ? { skippedResources: Object.freeze(skippedResources) } : {})
        })
    });
}

/**
 * Fill fields left unresolved by T1 from the injected fine-tuned generator.
 *
 * @param request the rows, schema, roles and generator to run
 * @returns the refined rows, the per-resource outcomes and the diagnostics
 */
export async function applySftGeneration(request: SftGenerationRequest): Promise<SftRunResult> {
    const { options, signal, existingData = {}, onProgress } = request;
    const state: SftRunState = {
        generated: {},
        diagnostics: [],
        assignments: [],
        skippedResources: [],
        relevanceVerifiedResources: new Set<string>(),
        attempts: 0,
        parsedResponses: 0,
        eligibleSlots: 0,
        acceptedSlots: 0,
        rejectedSlots: 0
    };
    const prepared = prepareSftResources(request, existingData, state.diagnostics);
    const serviceBudgetMs = options.sftBudgetMs ?? DEFAULT_SFT_SERVICE_BUDGET_MS;
    const schedule: SftSchedule = {
        startedAt: performance.now(),
        serviceBudgetMs,
        // A caller budget below the minimum slice goes to a single attempt rather than to none.
        minimumAttemptMs: Math.min(MINIMUM_SFT_ATTEMPT_MS, serviceBudgetMs),
        remainingEntities: prepared.filter(({ fields, fallbackRows }) => fields.length && fallbackRows.length).length,
        attemptedResources: 0,
        budgetSkipped: 0
    };
    for (const resource of prepared) {
        signal.throwIfAborted();
        const attempt = scheduleSftAttempt(resource, request, state, schedule);
        if (attempt) {
            notifyProgress(onProgress, { ...attempt.progress, tier: 'T2', phase: 'start' });
            await runSftAttempt(attempt, request, state);
        }
    }
    return sftRunResult(state, schedule.budgetSkipped);
}
