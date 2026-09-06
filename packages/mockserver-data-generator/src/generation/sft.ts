import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import type {
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorOptions,
    MockDataRow,
    MockDataServiceIdentity,
    SemanticClassification,
    SftAssignmentStatistics,
    SftFieldRequest,
    SftGenerationStatistics,
    SftGenerator
} from '../types.js';
import { coherencePropertyNames } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';

const SFT_PRIMITIVE_TYPES = new Set<SchemaProperty['primitiveType']>(['string', 'int', 'decimal']);
const MAX_SFT_STRING_LENGTH = 80;

export interface SftRunResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    degraded: boolean;
    statistics: SftGenerationStatistics;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validCandidate(property: SchemaProperty, value: unknown): value is JsonValue {
    if (!propertyValueIsValid(property, value)) {
        return false;
    }
    if (property.primitiveType !== 'string' || value === null || property.enumValues !== undefined) {
        return true;
    }
    return typeof value === 'string' && /[\p{L}\p{N}]/u.test(value) && !/^\s*[\[{]/u.test(value);
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
    return (
        classification === undefined ||
        classification.role === 'unknown' ||
        classification.confidence < (classification.routeThreshold ?? 0.5)
    );
}

function residualFields(
    entity: SchemaEntity,
    classifications: ReadonlyMap<string, SemanticClassification>,
    structuralProperties: ReadonlySet<string>
): ReadonlyArray<SftFieldRequest> {
    return Object.freeze(
        entity.properties
            .filter(
                (property) =>
                    !property.isKey &&
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
                    name: property.name,
                    primitiveType: property.primitiveType,
                    ...(classification ? { semanticRole: classification.role } : {}),
                    nullable: property.nullable,
                    ...(maxLength === undefined ? {} : { maxLength })
                });
            })
    );
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
 */
export async function applySftGeneration(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    service: MockDataServiceIdentity,
    options: MockDataGeneratorOptions,
    classifications: ReadonlyMap<string, SemanticClassification>,
    sft: SftGenerator,
    signal: AbortSignal
): Promise<SftRunResult> {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const structuralProperties = new Map<string, Set<string>>();
    for (const relationship of graph.relationships) {
        const source = structuralProperties.get(relationship.fromEntitySet) ?? new Set<string>();
        const target = structuralProperties.get(relationship.toEntitySet) ?? new Set<string>();
        relationship.mappings.forEach(({ sourceProperty, targetProperty }) => {
            source.add(sourceProperty);
            target.add(targetProperty);
        });
        structuralProperties.set(relationship.fromEntitySet, source);
        structuralProperties.set(relationship.toEntitySet, target);
    }
    const generated: Record<string, ReadonlyArray<MockDataRow>> = {};
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    const assignments: SftAssignmentStatistics[] = [];
    let attempts = 0;
    let parsedResponses = 0;
    let eligibleSlots = 0;
    let acceptedSlots = 0;
    let circuitOpen = false;
    let circuitDiagnosticEmitted = false;

    for (const [resourceName, fallbackRows] of Object.entries(resources)) {
        const entity = entities.get(resourceName);
        const reservedProperties = new Set(structuralProperties.get(resourceName) ?? []);
        if (entity) {
            coherencePropertyNames(entity).forEach((propertyName) => reservedProperties.add(propertyName));
            metadataControlPropertyNames(entity).forEach((propertyName) => reservedProperties.add(propertyName));
        }
        const fields = entity ? residualFields(entity, classifications, reservedProperties) : [];
        if (!entity || fields.length === 0 || fallbackRows.length === 0) {
            generated[resourceName] = fallbackRows;
            continue;
        }
        if (circuitOpen) {
            generated[resourceName] = fallbackRows;
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

        eligibleSlots += fallbackRows.length * fields.length;
        let output: Awaited<ReturnType<SftGenerator['generate']>>;
        try {
            output = await generateWithinBudget(
                sft,
                Object.freeze({
                    service,
                    entityName: entity.name,
                    fields,
                    rowCount: fallbackRows.length,
                    seed: options.seed ?? 1,
                    ...(options.locale ? { locale: options.locale } : {})
                }),
                signal,
                options.sftTimeoutMs ?? 90_000
            );
            if (!output || !Array.isArray(output.rows)) {
                throw new TypeError('Invalid SFT generation result');
            }
            const completion = completionStatistics(output);
            attempts += completion.attempts;
            parsedResponses += completion.parsedResponses;
        } catch (error) {
            attempts += 1;
            assignments.push(
                Object.freeze({
                    resource: resourceName,
                    entity: entity.name,
                    rowCount: fallbackRows.length,
                    parsed: false,
                    fields: Object.freeze(
                        fields.map(({ name }) =>
                            Object.freeze({ name, eligibleSlots: fallbackRows.length, acceptedSlots: 0 })
                        )
                    )
                })
            );
            circuitOpen = true;
            generated[resourceName] = fallbackRows;
            const timedOut =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'SFT_INFERENCE_TIMEOUT';
            diagnostics.push(
                Object.freeze({
                    code: timedOut ? 'SFT_INFERENCE_TIMEOUT' : 'SFT_INFERENCE_FAILED',
                    severity: 'warning',
                    message: timedOut
                        ? 'Fine-tuned generation timed out; deterministic fallback remains active.'
                        : 'Fine-tuned generation failed; deterministic fallback remains active.',
                    target: resourceName
                })
            );
            continue;
        }
        const fieldByName = new Map(
            entity.properties
                .filter((property) => fields.some((field) => field.name === property.name))
                .map((property) => [property.name, property])
        );
        const acceptedByField = new Map(fields.map(({ name }) => [name, 0]));
        const generatedRows: MockDataRow[] = [];
        for (const [rowIndex, fallbackRow] of fallbackRows.entries()) {
            const candidateRow: unknown = output.rows[rowIndex];
            if (!isPlainRecord(candidateRow)) {
                generatedRows.push(fallbackRow);
                continue;
            }
            const row: Record<string, JsonValue> = { ...fallbackRow };
            for (const [propertyName, property] of fieldByName) {
                const candidate = candidateRow[propertyName];
                if (validCandidate(property, candidate)) {
                    row[propertyName] = candidate;
                    acceptedByField.set(propertyName, (acceptedByField.get(propertyName) ?? 0) + 1);
                    acceptedSlots += 1;
                }
            }
            generatedRows.push(Object.freeze(row));
        }
        generated[resourceName] = Object.freeze(generatedRows);
        assignments.push(
            Object.freeze({
                resource: resourceName,
                entity: entity.name,
                rowCount: fallbackRows.length,
                parsed: true,
                fields: Object.freeze(
                    fields.map(({ name }) =>
                        Object.freeze({
                            name,
                            eligibleSlots: fallbackRows.length,
                            acceptedSlots: acceptedByField.get(name) ?? 0
                        })
                    )
                )
            })
        );
    }

    return Object.freeze({
        resources: Object.freeze(generated),
        diagnostics: Object.freeze(diagnostics),
        degraded: diagnostics.length > 0,
        statistics: Object.freeze({
            attempts,
            parsedResponses,
            eligibleSlots,
            acceptedSlots,
            assignments: Object.freeze(assignments)
        })
    });
}
