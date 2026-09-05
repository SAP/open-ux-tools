import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type {
    MockDataGeneratorDiagnostic,
    SemanticClassification,
    SemanticClassifier,
    SemanticClassifierInput
} from '../types.js';

export interface ClassifierRunResult {
    classifications: ReadonlyMap<string, SemanticClassification>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
    degraded: boolean;
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

function classifierInput(entityName: string, property: SchemaProperty): SemanticClassifierInput {
    return Object.freeze({
        entityName,
        propertyName: property.name,
        primitiveType: property.primitiveType,
        ...(property.label ? { label: property.label } : {}),
        ...(property.description ? { description: property.description } : {}),
        annotations: Object.freeze(
            property.annotations.map((annotation) =>
                Object.freeze({
                    term: annotation.term,
                    ...(annotation.value === undefined ? {} : { value: annotation.value })
                })
            )
        ),
        ...(property.dataElement ? { dataElement: property.dataElement } : {})
    });
}

/**
 * Classify every property exactly once for one immutable schema snapshot.
 *
 * @param graph
 * @param classifier
 * @param signal
 */
export async function classifySchema(
    graph: SchemaGraph,
    classifier: SemanticClassifier,
    signal: AbortSignal
): Promise<ClassifierRunResult> {
    const classifications = new Map<string, SemanticClassification>();
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    let circuitOpen = false;
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            if (circuitOpen) {
                break;
            }
            const target = semanticPropertyKey(entity.entitySetName, property.name);
            try {
                const result = await classifier.classify(classifierInput(entity.name, property), signal);
                if (
                    typeof result.role !== 'string' ||
                    result.role.length === 0 ||
                    !Number.isFinite(result.confidence) ||
                    result.confidence < 0 ||
                    result.confidence > 1 ||
                    !['classifier', 'metadata', 'lexical-fallback', 'unknown'].includes(result.source)
                ) {
                    throw new TypeError('Invalid semantic classification');
                }
                classifications.set(target, Object.freeze({ ...result }));
            } catch {
                circuitOpen = true;
                diagnostics.push(
                    Object.freeze({
                        code: 'CLASSIFIER_INFERENCE_FAILED',
                        severity: 'warning',
                        message: 'Semantic classification failed; lower generation tiers remain active.',
                        target
                    })
                );
            }
        }
        if (circuitOpen) {
            break;
        }
    }
    return Object.freeze({
        classifications,
        diagnostics: Object.freeze(diagnostics),
        degraded: diagnostics.length > 0
    });
}
