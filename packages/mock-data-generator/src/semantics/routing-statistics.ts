import type { SchemaGraph } from '../schema/graph.js';
import type { MockDataGeneratorRoutingStatistics, MockDataTarget, SemanticClassification } from '../types.js';
import { semanticPropertyKey } from './classifier.js';
import { semanticRules } from './rule-store.js';

function hasDetectedRole(candidate: SemanticClassification | undefined): candidate is SemanticClassification {
    return (
        candidate !== undefined &&
        candidate.role !== 'unknown' &&
        candidate.confidence >= (candidate.routeThreshold ?? semanticRules().thresholds.statistics)
    );
}

/** The routing counts, updated while the fields are counted. */
interface RoutingCounts {
    totalFields: number;
    metadataAccepted: number;
    classifierAccepted: number;
    lexicalAccepted: number;
    conceptAccepted: number;
    abstained: number;
    providerBound: number;
    detectedButUnbound: number;
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
    const counts: RoutingCounts = {
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
            const key = semanticPropertyKey(entity.entitySetName, property.name);
            countField(counts, detected.get(key), bound.get(key));
        }
    }
    return Object.freeze(counts);
}

/**
 * Count one field by the source of its detected role and whether a provider is bound to it.
 *
 * @param counts the counts so far, updated in place
 * @param decision the field's detected role, if any
 * @param binding the field's provider binding, if any
 */
function countField(
    counts: RoutingCounts,
    decision: SemanticClassification | undefined,
    binding: SemanticClassification | undefined
): void {
    counts.totalFields++;
    if (decision?.source === 'concept') {
        counts.conceptAccepted++;
        return;
    }
    if (!hasDetectedRole(decision) || decision.source === 'unknown') {
        counts.abstained++;
        return;
    }
    if (decision.source === 'metadata') {
        counts.metadataAccepted++;
    } else if (decision.source === 'classifier') {
        counts.classifierAccepted++;
    } else {
        counts.lexicalAccepted++;
    }
    if (hasDetectedRole(binding)) {
        counts.providerBound++;
    } else {
        counts.detectedButUnbound++;
    }
}
