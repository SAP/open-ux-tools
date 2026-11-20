import { sha256 } from '../common/io.mjs';
import {
    arbitrateSemanticClassifications,
    classifySchema,
    routedRoleCompatibility,
    semanticPropertyKey,
    serializeFieldContextV3
} from '../common/runtime.mjs';
import { evaluateRoleQualityGate } from './role-quality-gate.mjs';

/**
 * JSON with object keys sorted at every level.
 * @param {unknown} value value
 * @returns {string} canonical JSON
 */
function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJson).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

/**
 * Fingerprint the sealed rows (id, service, domain, expected role, serialized text), order-independent.
 * @param {Array<{ id: string, serviceId: string, domain: string, label: string, context: object }>} rows sealed rows
 * @returns {string} sha256
 */
export function sealedDatasetFingerprint(rows) {
    return sha256(
        canonicalJson(
            rows
                .map((row) => ({
                    id: row.id,
                    serviceId: row.serviceId,
                    domain: row.domain,
                    expectedRole: row.label,
                    serialized: serializeFieldContextV3(row.context)
                }))
                .sort((a, b) => `${a.serviceId}|${a.id}`.localeCompare(`${b.serviceId}|${b.id}`))
        )
    );
}

/**
 * The single entity property a context names, if exactly one matches.
 * @param {object} graph schema graph
 * @param {{ entityName: string, propertyName: string }} context field context
 * @returns {{ entity: object, property: object } | undefined} the match
 */
function findProperty(graph, context) {
    const matches = graph.entities.flatMap((entity) =>
        entity.name === context.entityName
            ? entity.properties
                  .filter((property) => property.name === context.propertyName)
                  .map((property) => ({ entity, property }))
            : []
    );
    return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Route every sealed field of one service through the runtime path: v3 classification with per-field
 * failure isolation, then semantic-v2 arbitration.
 * @param {object} options options
 * @param {object} options.graph runtime schema graph of the service
 * @param {object[]} options.rows sealed rows of this service
 * @param {object} options.classifier runtime semantic classifier
 * @param {object} [options.signal] cancellation
 * @returns {Promise<object[]>} one decision per row
 */
export async function routeSealedService({ graph, rows, classifier, signal = new AbortController().signal }) {
    const run = await classifySchema(graph, classifier, signal, { isolateFailures: true });
    const arbitrated = arbitrateSemanticClassifications(graph, run.classifications);
    const metadataOnly = arbitrateSemanticClassifications(graph, new Map());
    return rows.map((row) => {
        const match = findProperty(graph, row.context);
        if (!match) {
            return { row, missing: true };
        }
        const key = semanticPropertyKey(match.entity.entitySetName, match.property.name);
        const decision = arbitrated.get(key);
        const raw = run.classifications.get(key);
        const metadata = metadataOnly.get(key);
        return {
            row,
            acceptedRole: decision?.role ?? 'unknown',
            acceptedSource: decision?.source ?? 'none',
            abstentionReason: decision?.reason ?? decision?.abstentionReason,
            primitiveType: match.property.primitiveType,
            isKey: match.property.isKey,
            // A role the registry forbids on this property (key policy, incompatible type) can never be routed.
            expectedPolicy: row.label === 'unknown' ? 'compatible' : routedRoleCompatibility(row.label, match.property),
            rawRole: raw?.role ?? 'unknown',
            rawConfidence: raw?.confidence ?? 0,
            rawRouteThreshold: raw?.routeThreshold,
            predictionSetSize: raw?.predictionSetSize,
            decisiveMetadata: Boolean(metadata && metadata.role !== 'unknown' && metadata.source === 'metadata')
        };
    });
}

/**
 * Turn routing decisions into gate fields and the sealed-evaluation counts the release check reads.
 * Precision and critical false positives count the classifier's own accepted decisions only.
 * @param {object} options options
 * @param {object[]} options.decisions decisions from `routeSealedService`
 * @param {string[]} options.claimedLabels routable labels of the head
 * @param {Readonly<Record<string, { family: string }>>} options.registryRoles role registry
 * @returns {object} sealed evaluation, gate result, confusion counts and the per-field table
 */
export function summarizeSealedDecisions({ decisions, claimedLabels, registryRoles }) {
    const family = (role) => (role === 'unknown' ? 'abstention' : (registryRoles[role]?.family ?? 'unregistered'));
    const claimed = new Set(claimedLabels);
    const missing = decisions.filter((decision) => decision.missing).length;
    if (missing > 0) {
        throw new TypeError(`${missing} sealed fields could not be located in their service metadata`);
    }
    const fields = decisions.map((decision) => {
        const { row, acceptedRole, acceptedSource, abstentionReason, expectedPolicy, decisiveMetadata } = decision;
        const expected = row.label;
        const policyExcluded = expectedPolicy !== undefined && expectedPolicy !== 'compatible';
        return {
            id: row.id,
            serviceId: row.serviceId,
            domain: row.domain,
            expectedRole: expected,
            acceptedRole,
            acceptedSource,
            ...(abstentionReason === undefined ? {} : { abstentionReason }),
            primitiveType: decision.primitiveType,
            isKey: decision.isKey,
            ...(expectedPolicy === undefined ? {} : { expectedPolicy }),
            policyExcluded,
            rawRole: decision.rawRole,
            rawConfidence: Number((decision.rawConfidence ?? 0).toFixed(4)),
            ...(decision.rawRouteThreshold === undefined
                ? {}
                : { rawRouteThreshold: Number(decision.rawRouteThreshold.toFixed(4)) }),
            ...(decision.predictionSetSize === undefined ? {} : { predictionSetSize: decision.predictionSetSize }),
            supported: expected !== 'unknown' && claimed.has(expected) && !policyExcluded,
            decisiveMetadata,
            unannotatedStatus: family(expected) === 'status' && !decisiveMetadata && !policyExcluded,
            criticalFalsePositive:
                acceptedSource === 'classifier' &&
                acceptedRole !== expected &&
                acceptedRole !== 'unknown' &&
                (expected === 'unknown' || family(acceptedRole) !== family(expected))
        };
    });
    const pair = (subset) => ({
        correct: subset.filter((field) => field.acceptedRole === field.expectedRole).length,
        total: subset.length
    });
    const accepted = fields.filter(
        (field) => field.acceptedRole !== 'unknown' && field.acceptedSource === 'classifier'
    );
    const supported = fields.filter((field) => field.supported && !field.decisiveMetadata);
    const statuses = fields.filter((field) => field.unannotatedStatus);
    const sealedEvaluation = {
        services: new Set(fields.map((field) => field.serviceId)).size,
        domains: new Set(fields.map((field) => field.domain)).size,
        acceptedRoles: pair(accepted),
        supportedFieldsWithoutMetadata: pair(supported),
        unannotatedStatusFields: pair(statuses),
        unannotatedStatusServices: new Set(statuses.map((field) => field.serviceId)).size,
        unannotatedStatusDomains: new Set(statuses.map((field) => field.domain)).size,
        criticalFalsePositives: fields.filter((field) => field.criticalFalsePositive).length
    };
    return {
        sealedEvaluation,
        gate: evaluateRoleQualityGate(fields),
        rawStatusTopLabelCorrect: {
            correct: statuses.filter((field) => field.rawRole === field.expectedRole).length,
            total: statuses.length
        },
        confusion: fields.reduce((counts, field) => {
            const key = `${field.expectedRole}->${field.acceptedRole}`;
            counts[key] = (counts[key] ?? 0) + 1;
            return counts;
        }, {}),
        fields
    };
}
