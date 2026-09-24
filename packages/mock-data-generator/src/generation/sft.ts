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

const SFT_PRIMITIVE_TYPES = new Set<SchemaProperty['primitiveType']>(['string', 'int', 'decimal']);
const MAX_SFT_STRING_LENGTH = 80;
// The shortest model call worth making: on a two-core workspace a resource needs a few seconds to
// produce any rows, so slices shorter than this only spend time and fall back anyway.
const MINIMUM_SFT_ATTEMPT_MS = 4_000;
// `SAP__` is the namespace SAP Gateway reserves for the entity sets it adds to every service:
// PDF export formats, cover pages, signatures, table columns, hierarchies, value helps, file
// shares, currencies and units of measure. They are protocol plumbing rather than application
// data and are never rendered by an application, so they are left to the deterministic tier.
const PROTOCOL_ARTIFACT_ENTITY_SET_PREFIX = 'SAP__';

class CandidateRelevanceError extends Error {
    constructor() {
        super('SFT_CANDIDATE_RELEVANCE_FAILED');
    }
}

const VERIFIER_UNAVAILABLE_MESSAGE =
    'No model or independent relevance check is available for this generated code/text domain; its deterministic values are kept and its meaning is unverified.';

export interface SftRunResult {
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
function isInstructionEcho(property: SchemaProperty, value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = normalizedText(value);
    if (
        /\b(?:return|output|provide|respond|generate)\b.{0,80}\bjson\s+array\b/u.test(normalized) ||
        /\bjson\s+array\b.{0,100}\b(?:with|containing)\b.{0,80}\b(?:object|row|key|field)s?\b/u.test(normalized)
    ) {
        return true;
    }
    const fieldPattern = [property.name, property.label, property.description]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map((candidate) => escapedRegExp(normalizedText(candidate)))
        .join('|');
    return (
        fieldPattern.length > 0 &&
        new RegExp(
            `^(?:the\\s+)?["']?(?:${fieldPattern})["']?\\s+(?:key|field)\\b.*\\b(?:should|must|contain|include|return)\\b`,
            'u'
        ).test(normalized)
    );
}

function isNarrativePlaceholder(property: SchemaProperty, value: string): boolean {
    const normalized = normalizedText(value);
    const fieldNames = [property.name, property.label, property.description]
        .filter((candidate): candidate is string => Boolean(candidate))
        .map(normalizedText);
    if (fieldNames.includes(normalized)) {
        return true;
    }
    if (
        /^(?:n\/?a|none|null|unknown|tbd|todo|placeholder|lorem(?: ipsum)?|sample(?: text)?|test(?: value)?|value|text)$/u.test(
            normalized
        )
    ) {
        return true;
    }
    if (/^(?:\/{1,2}|[a-z][a-z0-9+.-]*:\/\/)[^\s]+$/u.test(normalized)) {
        return true;
    }
    const jsonArrayInstruction =
        /\b(?:return|output|provide|respond|generate)\b.{0,80}\bjson\s+array\b/u.test(normalized) ||
        /\bjson\s+array\b.{0,100}\b(?:with|containing)\b.{0,80}\b(?:object|row|key|field)s?\b/u.test(normalized);
    if (jsonArrayInstruction) {
        return true;
    }
    const fieldPattern = fieldNames.map(escapedRegExp).join('|');
    return (
        fieldPattern.length > 0 &&
        (new RegExp(`^(?:${fieldPattern})\\s+(?:value|text|description|placeholder)$`, 'u').test(normalized) ||
            new RegExp(
                `^(?:the\\s+)?["']?(?:${fieldPattern})["']?\\s+(?:key|field)\\b.*\\b(?:should|must|contain|include|return)\\b`,
                'u'
            ).test(normalized) ||
            new RegExp(`^(?:${fieldPattern})\\s+(?:#\\s*)?\\d+(?:st|nd|rd|th)?$`, 'u').test(normalized))
    );
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
        classification.confidence < (classification.routeThreshold ?? 0.5)
    );
}

function residualFields(
    graph: SchemaGraph,
    entity: SchemaEntity,
    classifications: ReadonlyMap<string, SemanticClassification>,
    structuralProperties: ReadonlySet<string>,
    options: MockDataGeneratorOptions,
    generatedDomainKey?: string
): ReadonlyArray<SftFieldRequest> {
    const semanticV2 = options.pipeline === 'semantic-v2';
    return Object.freeze(
        entity.properties
            .filter(
                (property) =>
                    (!property.isKey || property.name === generatedDomainKey) &&
                    property.enumValues === undefined &&
                    SFT_PRIMITIVE_TYPES.has(property.primitiveType) &&
                    !(property.primitiveType === 'string' && property.maxLength === 0) &&
                    !structuralProperties.has(property.name) &&
                    isResidual(classifications.get(semanticPropertyKey(entity.entitySetName, property.name)))
            )
            .map((property) => {
                const classification = classifications.get(semanticPropertyKey(entity.entitySetName, property.name));
                const maxLength =
                    property.primitiveType === 'string'
                        ? Math.min(property.maxLength ?? MAX_SFT_STRING_LENGTH, MAX_SFT_STRING_LENGTH)
                        : property.maxLength;
                return Object.freeze({
                    ...fieldRelationshipContext(graph, entity, property),
                    name: property.name,
                    primitiveType: property.primitiveType,
                    isKey: property.isKey,
                    ...(property.label === undefined ? {} : { label: property.label }),
                    ...(property.precision === undefined ? {} : { precision: property.precision }),
                    ...(property.scale === undefined ? {} : { scale: property.scale }),
                    ...(!semanticV2 && classification ? { semanticRole: classification.role } : {}),
                    ...(semanticV2 ? { description: property.description ?? property.label ?? property.name } : {}),
                    nullable: property.nullable,
                    ...(maxLength === undefined ? {} : { maxLength }),
                    ...(property.maxLength === undefined ? {} : { declaredMaxLength: property.maxLength }),
                    ...(property.primitiveType === 'int' && property.numericMinimum !== undefined
                        ? { minimum: property.numericMinimum }
                        : {}),
                    ...(property.primitiveType === 'int' && property.numericMaximum !== undefined
                        ? { maximum: property.numericMaximum }
                        : {}),
                    ...(semanticV2 && property.enumValues ? { allowedDomain: property.enumValues } : {})
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
    const ownership = existingData[entity.entitySetName];
    if (
        (ownership?.initialRows.present && 'rows' in ownership.initialRows && ownership.initialRows.rows.length > 0) ||
        (ownership?.contributor.present === true && ownership.contributor.hasInitialData)
    ) {
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
        options.pipeline === 'semantic-v2'
            ? (options.syntheticScenario?.coherence?.[entity.entitySetName] ?? ['temporal'])
            : undefined
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
    options: MockDataGeneratorOptions = { pipeline: 'semantic-v2' }
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
            const isV2PropertyReference = term === 'sap:field-control';
            const isV4PropertyReference =
                term.endsWith('.fieldcontrol') &&
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

/**
 * Fill fields left unresolved by T1 from the injected fine-tuned generator.
 *
 * @param graph
 * @param resources
 * @param service
 * @param options
 * @param classifications
 * @param sft
 * @param signal
 * @param existingData
 * @param onProgress
 * @param candidateVerifier
 */
export async function applySftGeneration(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    service: MockDataServiceIdentity,
    options: MockDataGeneratorOptions,
    classifications: ReadonlyMap<string, SemanticClassification>,
    sft: SftGenerator,
    signal: AbortSignal,
    existingData: Readonly<Record<string, ExistingMockData>> = {},
    onProgress?: (event: MockDataGenerationProgress) => void,
    candidateVerifier?: SftCandidateRelevanceVerifier
): Promise<SftRunResult> {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
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
    const generated: Record<string, ReadonlyArray<MockDataRow>> = {};
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    const assignments: SftAssignmentStatistics[] = [];
    const skippedResources: SftSkippedResource[] = [];
    const relevanceVerifiedResources = new Set<string>();
    let attempts = 0;
    let parsedResponses = 0;
    let eligibleSlots = 0;
    let acceptedSlots = 0;
    let rejectedSlots = 0;
    let circuitOpen = false;
    let circuitDiagnosticEmitted = false;

    let protocolArtifacts = 0;
    const prepared = Object.entries(resources).map(([resourceName, fallbackRows]) => {
        const entity = entities.get(resourceName);
        const reservedProperties = entity
            ? reservedSftProperties(entity, structuralProperties.get(resourceName) ?? new Set(), options)
            : new Set<string>();
        const domainKey =
            entity && options.pipeline === 'semantic-v2'
                ? syntheticDomainKey(graph, entity, existingData, reservedProperties, classifications)
                : undefined;
        const ownership = existingData[resourceName];
        const authored =
            (ownership?.initialRows.present &&
                'rows' in ownership.initialRows &&
                ownership.initialRows.rows.length > 0) ||
            (ownership?.contributor.present && ownership.contributor.hasInitialData);
        const protocolArtifact = isProtocolArtifactEntitySet(resourceName);
        if (protocolArtifact) {
            protocolArtifacts += 1;
        }
        // CAP code lists are filled from their codes by the code-list provider, so the model is not asked.
        const codeList = entity !== undefined && capCodeList(entity) !== undefined;
        const fields =
            entity && !authored && !protocolArtifact && !codeList
                ? residualFields(graph, entity, classifications, reservedProperties, options, domainKey)
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
    // Referenced domains are generated before their dependent display fields are projected; among the
    // rest, resources with fewer fields to fill go first because they finish within a slice.
    prepared.sort(
        (left, right) =>
            Number(Boolean(right.domainKey)) - Number(Boolean(left.domainKey)) ||
            left.fields.length - right.fields.length
    );
    const startedAt = performance.now();
    const serviceBudgetMs = options.sftBudgetMs ?? 20_000;
    let remainingEntities = prepared.filter(({ fields, fallbackRows }) => fields.length && fallbackRows.length).length;
    let budgetSkipped = 0;
    let attemptedResources = 0;
    // A caller budget below the minimum slice goes to a single attempt rather than to none.
    const minimumAttemptMs = Math.min(MINIMUM_SFT_ATTEMPT_MS, serviceBudgetMs);
    for (const { resourceName, fallbackRows, entity, fields: plannedFields, domainKey } of prepared) {
        signal.throwIfAborted();
        if (!entity || plannedFields.length === 0 || fallbackRows.length === 0) {
            generated[resourceName] = fallbackRows;
            continue;
        }
        if (circuitOpen) {
            generated[resourceName] = fallbackRows;
            skippedResources.push(
                Object.freeze({
                    resource: resourceName,
                    reason: 'circuit-open' as const,
                    rowCount: fallbackRows.length,
                    fields: Object.freeze(plannedFields.map(({ name }) => name))
                })
            );
            if (!circuitDiagnosticEmitted) {
                diagnostics.push(
                    Object.freeze({
                        code: 'SFT_SKIPPED_AFTER_FAILURE',
                        severity: 'warning',
                        message: 'Fine-tuned generation was skipped after an earlier runtime failure.',
                        target: resourceName
                    })
                );
                circuitDiagnosticEmitted = true;
            }
            continue;
        }

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
        let fields = plannedFields;
        if (!candidateVerifier && domainKey !== undefined) {
            fields = [];
        } else if (!candidateVerifier) {
            fields = plannedFields.filter(({ name }) => !plannedTexts.some(({ text }) => text.name === name));
        }
        if (fields.length === 0) {
            generated[resourceName] = fallbackRows;
            remainingEntities -= 1;
            continue;
        }
        const linkedTexts = linkedTextOwners(entity, fields);
        const requiresRelevance = domainKey !== undefined || linkedTexts.length > 0;
        const coupledGroups = coupledFieldGroups(entity, fields);
        // Rows whose linked texts the relevance check accepted; linked texts of other rows keep their fallback.
        let verifiedTextRows: ReadonlySet<number> = new Set();
        // Each attempt gets a slice long enough to finish on a small machine; once the service budget
        // cannot fund another slice, the remaining resources keep their deterministic rows.
        const remainingServiceMs = serviceBudgetMs - (performance.now() - startedAt);
        if (attemptedResources > 0 && remainingServiceMs < minimumAttemptMs) {
            generated[resourceName] = fallbackRows;
            remainingEntities -= 1;
            budgetSkipped += 1;
            skippedResources.push(
                Object.freeze({
                    resource: resourceName,
                    reason: 'budget' as const,
                    rowCount: fallbackRows.length,
                    fields: Object.freeze(fields.map(({ name }) => name))
                })
            );
            continue;
        }
        eligibleSlots += fallbackRows.length * fields.length;
        attemptedResources += 1;
        const budgetMs = Math.max(
            1,
            Math.floor(
                Math.min(
                    options.sftTimeoutMs ?? 90_000,
                    Math.max(minimumAttemptMs, remainingServiceMs / Math.max(1, remainingEntities))
                )
            )
        );
        remainingEntities -= 1;
        const entityStartedAt = performance.now();
        const progress = {
            resource: resourceName,
            fields: fields.map(({ name }) => name),
            rowCount: fallbackRows.length
        };
        notifyProgress(onProgress, { ...progress, tier: 'T2', phase: 'start' });
        let output: Awaited<ReturnType<SftGenerator['generate']>> | undefined;
        try {
            // One candidate per resource: a retry only changes the seed of the same prompt and costs a
            // full model call (a status value list spent 12 s on three declined attempts), while a
            // declined resource keeps its deterministic rows either way.
            const maximumAttempts = 1;
            for (let candidateAttempt = 0; candidateAttempt < maximumAttempts; candidateAttempt++) {
                signal.throwIfAborted();
                const remainingBudgetMs = budgetMs - (performance.now() - entityStartedAt);
                if (remainingBudgetMs <= 0) {
                    throw new CandidateRelevanceError();
                }
                const attemptBudgetMs = Math.max(
                    1,
                    Math.floor(remainingBudgetMs / (maximumAttempts - candidateAttempt))
                );
                output = await generateWithinBudget(
                    sft,
                    Object.freeze({
                        ...(options.pipeline === 'semantic-v2'
                            ? {
                                  contractVersion: 2 as const,
                                  fixedRows: fallbackRows,
                                  siblingGroup: 'residual',
                                  acceptedRoles: Object.freeze(
                                      Object.fromEntries(
                                          entity.properties.flatMap((property) => {
                                              const classification = classifications.get(
                                                  semanticPropertyKey(entity.entitySetName, property.name)
                                              );
                                              return classification && !isResidual(classification)
                                                  ? [[property.name, classification.role] as const]
                                                  : [];
                                          })
                                      )
                                  )
                              }
                            : {}),
                        service,
                        entityName: entity.name,
                        fields,
                        ...(coupledGroups.length > 0 ? { coupledFieldGroups: coupledGroups } : {}),
                        budgetMs: attemptBudgetMs,
                        rowCount: fallbackRows.length,
                        seed: ((options.seed ?? 1) + candidateAttempt) % Number.MAX_SAFE_INTEGER,
                        ...(options.locale ? { locale: options.locale } : {})
                    }),
                    signal,
                    attemptBudgetMs + 100
                );
                if (!output || !Array.isArray(output.rows)) {
                    throw new TypeError('Invalid SFT generation result');
                }
                const completion = completionStatistics(output);
                attempts += completion.attempts;
                parsedResponses += completion.parsedResponses;
                if (!requiresRelevance || !candidateVerifier) {
                    break;
                }
                if (!domainKey) {
                    // Linked texts are verified row by row: a verified row keeps its texts, the others
                    // keep their fallback, and the other fields are accepted on their own merits.
                    verifiedTextRows = await verifiedLinkedTextRows(
                        entity,
                        linkedTexts,
                        output.rows,
                        fallbackRows,
                        (pairs) => {
                            const verifierBudgetMs = budgetMs - (performance.now() - entityStartedAt);
                            return verifierBudgetMs > 0
                                ? verifyWithinBudget(candidateVerifier, pairs, signal, verifierBudgetMs)
                                : Promise.resolve([]);
                        },
                        { service, resource: resourceName }
                    );
                    signal.throwIfAborted();
                    if (verifiedTextRows.size === fallbackRows.length) {
                        relevanceVerifiedResources.add(resourceName);
                    }
                    break;
                }
                if (
                    (domainKey &&
                        !validSyntheticDomainGroup(entity, fields, domainKey, output.rows, fallbackRows.length)) ||
                    !validLinkedTextGroup(entity, fields, linkedTexts, output.rows, fallbackRows)
                ) {
                    rejectedSlots += output.rows.length * fields.length;
                    if (candidateAttempt === maximumAttempts - 1) {
                        throw new CandidateRelevanceError();
                    }
                    continue;
                }
                const pairs = output.rows.flatMap((row, rowIndex) => {
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
                    const verifierBudgetMs = budgetMs - (performance.now() - entityStartedAt);
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
                if (accepted) {
                    relevanceVerifiedResources.add(resourceName);
                    break;
                }
                rejectedSlots += output.rows.length * fields.length;
                if (candidateAttempt === maximumAttempts - 1) {
                    throw new CandidateRelevanceError();
                }
            }
        } catch (error) {
            signal.throwIfAborted();
            const unverifiedCandidates = error instanceof CandidateRelevanceError;
            attempts += 1;
            const timedOut =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'SFT_INFERENCE_TIMEOUT';
            let failureKind: 'unverified' | 'timeout' | 'failed' = 'failed';
            if (unverifiedCandidates) {
                failureKind = 'unverified';
            } else if (timedOut) {
                failureKind = 'timeout';
            }
            assignments.push(
                Object.freeze({
                    resource: resourceName,
                    entity: entity.name,
                    rowCount: fallbackRows.length,
                    parsed: false,
                    outcome: failureKind,
                    rowsWithoutCandidate: fallbackRows.length,
                    fields: Object.freeze(
                        fields.map(({ name }) =>
                            Object.freeze({ name, eligibleSlots: fallbackRows.length, acceptedSlots: 0 })
                        )
                    )
                })
            );
            circuitOpen = options.pipeline !== 'semantic-v2';
            generated[resourceName] = fallbackRows;
            notifyProgress(onProgress, {
                ...progress,
                tier: 'T2',
                phase: 'complete',
                acceptedSlots: 0,
                durationMs: performance.now() - entityStartedAt
            });
            // A verifier that declines every candidate means the proposed display values could not
            // be shown to be relevant. The deterministic rows are kept and the resource is reported
            // as unverified, which is visible in `validation.domainMeaning`; rejecting the whole
            // service would leave the caller with no data at all.
            const failures = {
                unverified: {
                    code: 'SFT_CANDIDATE_RELEVANCE_UNVERIFIED',
                    message:
                        'Generated display values were not verified as relevant; deterministic fallback remains active.'
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
            const failure = failures[failureKind];
            diagnostics.push(Object.freeze({ ...failure, severity: 'warning', target: resourceName }));
            continue;
        }
        if (!output) {
            throw new TypeError('Fine-tuned generation returned no candidate rows');
        }
        const fieldByName = new Map(
            entity.properties
                .filter((property) => fields.some((field) => field.name === property.name))
                .map((property) => [property.name, property])
        );
        const acceptedByField = new Map(fields.map(({ name }) => [name, 0]));
        const invalidByField = new Map(fields.map(({ name }) => [name, 0]));
        let rowsWithoutCandidate = 0;
        const generatedRows: MockDataRow[] = [];
        const generatedDomainRows: MockDataRow[] = [];
        const generatedKeys = new Set<string>();
        let duplicateDomainRows = 0;
        for (const [rowIndex, fallbackRow] of fallbackRows.entries()) {
            const candidateRow: unknown = output.rows[rowIndex];
            if (!isPlainRecord(candidateRow)) {
                rowsWithoutCandidate += 1;
                generatedRows.push(fallbackRow);
                continue;
            }
            if (Object.keys(candidateRow).length === 0) {
                rowsWithoutCandidate += 1;
            }
            if (options.pipeline === 'semantic-v2') {
                const fieldIsValid = (name: string): boolean => {
                    const property = fieldByName.get(name);
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
                };
                const present = fields.filter(({ name }) => Object.prototype.hasOwnProperty.call(candidateRow, name));
                // An instruction echo anywhere in the row means none of its values are trusted.
                if (
                    present.some(({ name }) => {
                        const property = fieldByName.get(name);
                        return property !== undefined && isInstructionEcho(property, candidateRow[name]);
                    })
                ) {
                    present.forEach(({ name }) => invalidByField.set(name, (invalidByField.get(name) ?? 0) + 1));
                    rejectedSlots += fields.length;
                    generatedRows.push(fallbackRow);
                    continue;
                }
                const valid = new Set(present.filter(({ name }) => fieldIsValid(name)).map(({ name }) => name));
                present.forEach(({ name }) => {
                    if (!valid.has(name)) {
                        invalidByField.set(name, (invalidByField.get(name) ?? 0) + 1);
                    }
                });
                if (domainKey) {
                    // A generated domain row is one unit: every field valid, or the row stays deterministic.
                    if (present.length !== fields.length || valid.size !== fields.length) {
                        rejectedSlots += fields.length;
                        generatedRows.push(fallbackRow);
                        continue;
                    }
                    const signature = JSON.stringify(candidateRow[domainKey]);
                    if (generatedKeys.has(signature)) {
                        const previous = generatedDomainRows.find((row) => row[domainKey] === candidateRow[domainKey]);
                        if (previous && fields.every(({ name }) => previous[name] === candidateRow[name])) {
                            duplicateDomainRows += 1;
                        }
                        generatedRows.push(fallbackRow);
                        continue;
                    }
                    generatedKeys.add(signature);
                }
                // Other fields are accepted one by one; coupled fields only together, and linked texts
                // only in rows the relevance check verified.
                const acceptable = (name: string): boolean =>
                    valid.has(name) &&
                    (!linkedTexts.some(({ text }) => text.name === name) ||
                        verifiedTextRows.has(rowIndex) ||
                        !!domainKey);
                const accepted = fields.filter(
                    ({ name }) =>
                        acceptable(name) &&
                        coupledGroups.every((group) => !group.includes(name) || group.every(acceptable))
                );
                rejectedSlots += fields.length - accepted.length;
                const row: Record<string, JsonValue> = { ...fallbackRow };
                for (const { name } of accepted) {
                    row[name] = candidateRow[name] as JsonValue;
                    acceptedByField.set(name, (acceptedByField.get(name) ?? 0) + 1);
                    acceptedSlots += 1;
                }
                generatedRows.push(Object.freeze(row));
                if (domainKey) {
                    generatedDomainRows.push(Object.freeze(row));
                }
                continue;
            }
            const row: Record<string, JsonValue> = { ...fallbackRow };
            for (const [propertyName, property] of fieldByName) {
                const candidate = candidateRow[propertyName];
                const unverifiedText =
                    !domainKey &&
                    !verifiedTextRows.has(rowIndex) &&
                    linkedTexts.some(({ text }) => text.name === propertyName);
                if (unverifiedText) {
                    continue;
                }
                if (validCandidate(property, candidate)) {
                    row[propertyName] = candidate;
                    acceptedByField.set(propertyName, (acceptedByField.get(propertyName) ?? 0) + 1);
                    acceptedSlots += 1;
                } else if (candidate !== undefined) {
                    invalidByField.set(propertyName, (invalidByField.get(propertyName) ?? 0) + 1);
                }
            }
            generatedRows.push(Object.freeze(row));
        }
        generated[resourceName] = Object.freeze(generatedDomainRows.length ? generatedDomainRows : generatedRows);
        const publishedRowCount = generated[resourceName].length;
        // Only identical complete proposals are legitimate finite-domain deduplication.
        // Missing, invalid or conflicting proposals must remain visible as unresolved slots.
        const eligibleRowCount = fallbackRows.length - duplicateDomainRows;
        eligibleSlots -= duplicateDomainRows * fields.length;
        const entityAcceptedSlots = [...acceptedByField.values()].reduce((sum, count) => sum + count, 0);
        if (entityAcceptedSlots > 0 && options.pipeline === 'semantic-v2') {
            diagnostics.push({
                code: 'SFT_SEMANTICS_UNVERIFIED',
                severity: 'info',
                target: resourceName,
                message:
                    'Model proposals passed field constraints, not independent business-semantic validation. These assignments do not establish semantic coverage or realism.'
            });
        }
        notifyProgress(onProgress, {
            ...progress,
            tier: 'T2',
            phase: 'complete',
            rowCount: publishedRowCount,
            acceptedSlots: entityAcceptedSlots,
            durationMs: performance.now() - entityStartedAt
        });
        if (domainKey && generatedDomainRows.length) {
            diagnostics.push({
                code: 'SYNTHETIC_REFERENCE_DOMAIN',
                severity: 'info',
                target: resourceName,
                message:
                    'The local model generated this code/text domain. Its tuples are synthetic, not an authoritative application domain.'
            });
        }
        if (entityAcceptedSlots < eligibleRowCount * fields.length) {
            diagnostics.push({
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
        }
        assignments.push(
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
        resources: Object.freeze(generated),
        relevanceVerifiedResources,
        diagnostics: Object.freeze(diagnostics),
        degraded: diagnostics.some(({ code }) =>
            ['SFT_INFERENCE_FAILED', 'SFT_INFERENCE_TIMEOUT', 'SFT_PARTIAL_FALLBACK'].includes(code)
        ),
        statistics: Object.freeze({
            attempts,
            parsedResponses,
            eligibleSlots,
            acceptedSlots,
            rejectedSlots,
            fallbackSlots: Math.max(0, eligibleSlots - acceptedSlots),
            assignments: Object.freeze(assignments),
            ...(skippedResources.length > 0 ? { skippedResources: Object.freeze(skippedResources) } : {})
        })
    });
}
