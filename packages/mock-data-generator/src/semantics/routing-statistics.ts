import type { SchemaGraph } from '../schema/graph.js';
import type { MockDataGeneratorRoutingStatistics, MockDataTarget, SemanticClassification } from '../types.js';
import { semanticPropertyKey } from './classifier.js';

function hasDetectedRole(candidate: SemanticClassification | undefined): candidate is SemanticClassification {
    return (
        candidate !== undefined &&
        candidate.role !== 'unknown' &&
        candidate.role !== 'REVIEW_ME' &&
        candidate.confidence >= (candidate.routeThreshold ?? 0.5)
    );
}

/**
 * Count detection sources independently from executable provider bindings.
 *
 * @param graph
 * @param targets
 * @param detected
 * @param bound
 */
export function routingStatistics(
    graph: SchemaGraph | undefined,
    targets: ReadonlyArray<MockDataTarget>,
    detected: ReadonlyMap<string, SemanticClassification>,
    bound: ReadonlyMap<string, SemanticClassification>
): MockDataGeneratorRoutingStatistics {
    const requested = new Set(targets.map(({ name }) => name));
    const counts = {
        totalFields: 0,
        metadataAccepted: 0,
        classifierAccepted: 0,
        lexicalAccepted: 0,
        conceptAccepted: 0,
        abstained: 0,
        providerBound: 0,
        detectedButUnbound: 0
    };
    for (const entity of graph?.entities ?? []) {
        if (!requested.has(entity.entitySetName)) {
            continue;
        }
        for (const property of entity.properties) {
            counts.totalFields++;
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            const decision = detected.get(key);
            if (decision?.source === 'concept') {
                counts.conceptAccepted++;
                continue;
            }
            const accepted = hasDetectedRole(decision);
            if (!accepted || decision.source === 'unknown') {
                counts.abstained++;
                continue;
            }
            if (decision.source === 'metadata') {
                counts.metadataAccepted++;
            } else if (decision.source === 'classifier') {
                counts.classifierAccepted++;
            } else {
                counts.lexicalAccepted++;
            }
            if (hasDetectedRole(bound.get(key))) {
                counts.providerBound++;
            } else {
                counts.detectedButUnbound++;
            }
        }
    }
    return Object.freeze(counts);
}
