import type { SchemaGraph } from '../schema/graph.js';
import type { MockDataGeneratorDiagnostic, SemanticClassification, SemanticClassifier } from '../types.js';
import { createFieldContextV3 } from './field-context.js';
import { DEFAULT_CLASSIFIER_BATCH_SIZE, MAX_CLASSIFIER_BATCH_SIZE } from '../limits.js';
import { errorMessage } from '../guards.js';

interface ClassifierRunResult {
    classifications: ReadonlyMap<string, SemanticClassification>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    degraded: boolean;
}

interface ClassifierRunOptions {
    batchSize?: number;
}

/**
 * Stable key used to join a semantic decision to a schema property.
 *
 * @param entitySetName
 * @param propertyName
 */
export function semanticPropertyKey(entitySetName: string, propertyName: string): string {
    return `${entitySetName}.${propertyName}`;
}

function validClassification(result: SemanticClassification): boolean {
    return (
        typeof result.role === 'string' &&
        result.role.length > 0 &&
        Number.isFinite(result.confidence) &&
        result.confidence >= 0 &&
        result.confidence <= 1 &&
        ['classifier', 'metadata', 'lexical-fallback', 'concept', 'unknown'].includes(result.source)
    );
}

/**
 * The warning for a field the classifier could not classify, carrying the classifier's error as its cause.
 *
 * @param target the field, as `EntitySet.Property`
 * @param error the classifier's failure
 * @returns the diagnostic
 */
function failureDiagnostic(target: string, error: unknown): MockDataGeneratorDiagnostic {
    return Object.freeze({
        code: 'CLASSIFIER_INFERENCE_FAILED',
        severity: 'warning' as const,
        message: `Semantic classification failed; lower generation tiers remain active. Cause: ${errorMessage(error)}`,
        target
    });
}

/**
 * Classify every property exactly once for one immutable schema snapshot.
 *
 * @param graph
 * @param classifier
 * @param signal
 * @param options
 */
export async function classifySchema(
    graph: SchemaGraph,
    classifier: SemanticClassifier,
    signal: AbortSignal,
    options: ClassifierRunOptions = {}
): Promise<ClassifierRunResult> {
    const classifications = new Map<string, SemanticClassification>();
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    const entries = graph.entities.flatMap((entity) =>
        entity.properties.map((property) => ({
            target: semanticPropertyKey(entity.entitySetName, property.name),
            input: createFieldContextV3(graph, entity, property)
        }))
    );
    const classifyOne = async ({ target, input }: (typeof entries)[number]): Promise<void> => {
        signal.throwIfAborted();
        try {
            const result = await classifier.classify(input, signal);
            signal.throwIfAborted();
            if (!validClassification(result)) {
                throw new TypeError('Invalid semantic classification');
            }
            classifications.set(target, Object.freeze({ ...result }));
        } catch (error) {
            signal.throwIfAborted();
            diagnostics.push(failureDiagnostic(target, error));
        }
    };
    const batchSize = options.batchSize ?? DEFAULT_CLASSIFIER_BATCH_SIZE;
    if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > MAX_CLASSIFIER_BATCH_SIZE) {
        throw new TypeError(`Classifier batch size must be an integer between 1 and ${MAX_CLASSIFIER_BATCH_SIZE}`);
    }
    if (classifier.classifyBatch) {
        for (let offset = 0; offset < entries.length; offset += batchSize) {
            signal.throwIfAborted();
            const batch = entries.slice(offset, offset + batchSize);
            try {
                const results = await classifier.classifyBatch(
                    batch.map(({ input }) => input),
                    signal
                );
                signal.throwIfAborted();
                if (results.length !== batch.length || results.some((result) => !validClassification(result))) {
                    throw new TypeError('Invalid semantic classification batch');
                }
                results.forEach((result, index) =>
                    classifications.set(batch[index].target, Object.freeze({ ...result }))
                );
            } catch {
                signal.throwIfAborted();
                // The batch failure is recovered field by field: each field is classified on its own, and a
                // field that still fails reports its own cause.
                for (const entry of batch) {
                    await classifyOne(entry);
                }
            }
        }
    } else {
        for (const entry of entries) {
            await classifyOne(entry);
        }
    }
    return Object.freeze({
        classifications,
        diagnostics: Object.freeze(diagnostics),
        degraded: diagnostics.length > 0
    });
}
