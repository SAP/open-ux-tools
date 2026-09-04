import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import type {
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorOptions,
    MockDataRow,
    MockDataServiceIdentity,
    SemanticClassification,
    SftFieldRequest,
    SftGenerator
} from '../types.js';
import { propertyValueIsValid } from './constraints.js';

export interface SftRunResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    degraded: boolean;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function validCandidate(property: SchemaProperty, value: unknown): value is JsonValue {
    return propertyValueIsValid(property, value);
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
                    !structuralProperties.has(property.name) &&
                    isResidual(classifications.get(semanticPropertyKey(entity.entitySetName, property.name)))
            )
            .map((property) => {
                const classification = classifications.get(semanticPropertyKey(entity.entitySetName, property.name));
                return Object.freeze({
                    name: property.name,
                    primitiveType: property.primitiveType,
                    ...(classification ? { semanticRole: classification.role } : {}),
                    nullable: property.nullable,
                    ...(property.maxLength === undefined ? {} : { maxLength: property.maxLength })
                });
            })
    );
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
    let circuitOpen = false;
    let circuitDiagnosticEmitted = false;

    for (const [resourceName, fallbackRows] of Object.entries(resources)) {
        const entity = entities.get(resourceName);
        const fields = entity
            ? residualFields(entity, classifications, structuralProperties.get(resourceName) ?? new Set())
            : [];
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
                options.sftTimeoutMs ?? 30_000
            );
            if (!output || !Array.isArray(output.rows)) {
                throw new TypeError('Invalid SFT generation result');
            }
        } catch {
            circuitOpen = true;
            generated[resourceName] = fallbackRows;
            diagnostics.push(
                Object.freeze({
                    code: 'SFT_INFERENCE_FAILED',
                    severity: 'warning',
                    message: 'Fine-tuned generation failed; deterministic fallback remains active.',
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
        generated[resourceName] = Object.freeze(
            fallbackRows.map((fallbackRow, rowIndex) => {
                const candidateRow: unknown = output.rows[rowIndex];
                if (!isPlainRecord(candidateRow)) {
                    return fallbackRow;
                }
                const row: Record<string, JsonValue> = { ...fallbackRow };
                for (const [propertyName, property] of fieldByName) {
                    const candidate = candidateRow[propertyName];
                    if (validCandidate(property, candidate)) {
                        row[propertyName] = candidate;
                    }
                }
                return Object.freeze(row);
            })
        );
    }

    return Object.freeze({
        resources: Object.freeze(generated),
        diagnostics: Object.freeze(diagnostics),
        degraded: diagnostics.length > 0
    });
}
