import { createHash } from 'node:crypto';
import {
    classifySchema,
    semanticPropertyKey
} from '../../../packages/mock-data-generator/dist/semantics/classifier.js';
import { arbitrateSemanticClassifications } from '../../../packages/mock-data-generator/dist/semantics/lexical-fallback.js';
import { serializeFieldContextV3 } from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import { evaluateRoleQualityGate } from './role-quality-gate.mjs';

/**
 * Sealed role evaluation with exact runtime parity.
 *
 * Each sealed field is routed by the packaged runtime path: v3 classification with per-field
 * failure isolation, then semantic-v2 arbitration. Metrics are emitted in the exact shape the
 * release gate reads. Rows never leave the private directory; the report carries counts and a
 * dataset fingerprint only.
 */

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

/**
 * Fingerprint the sealed dataset independently of evaluation output.
 *
 * @param {object[]} rows sealed rows
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
                    serialized: serializeFieldContextV3(row.context),
                    sourceChecksum: row.sourceChecksum
                }))
                .sort((a, b) => `${a.serviceId}|${a.id}`.localeCompare(`${b.serviceId}|${b.id}`))
        )
    );
}

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

const decisiveSources = new Set(['metadata']);

/**
 * Per-field routing decisions for one sealed service.
 *
 * @param {object} options options
 * @param {object} options.graph runtime schema graph
 * @param {object[]} options.rows sealed rows of this service
 * @param {object} options.classifier runtime semantic classifier
 * @param {AbortSignal} [options.signal] cancellation
 * @returns {Promise<object[]>} decisions
 */
import { semanticRoleCompatibility } from '../../../packages/mock-data-generator/dist/semantics/role-registry.js';

export async function routeSealedService({ graph, rows, classifier, signal = new AbortController().signal }) {
    const run = await classifySchema(graph, classifier, signal, { isolateFailures: true });
    const arbitrated = arbitrateSemanticClassifications(graph, run.classifications);
    const metadataOnly = arbitrateSemanticClassifications(graph, new Map());
    return rows.map((row) => {
        const match = findProperty(graph, row.context);
        if (!match) return { row, missing: true };
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
            // Runtime policy for the expected role on this property: a role the registry forbids
            // here (key policy, incompatible type) can never be routed by any classifier.
            expectedPolicy:
                row.label === 'unknown' ? 'compatible' : semanticRoleCompatibility(row.label, match.property),
            rawRole: raw?.role ?? 'unknown',
            rawConfidence: raw?.confidence ?? 0,
            rawRouteThreshold: raw?.routeThreshold,
            predictionSetSize: raw?.predictionSetSize,
            decisiveMetadata: Boolean(metadata && metadata.role !== 'unknown' && decisiveSources.has(metadata.source))
        };
    });
}

/**
 * Convert decisions into gate fields and the release-gate evaluation shape.
 *
 * @param {object} options options
 * @param {object[]} options.decisions decisions from routeSealedService
 * @param {string[]} options.claimedLabels labels the head claims
 * @param {Record<string, { family: string }>} options.registryRoles role registry
 * @returns {object} report
 */
export function summarizeSealedDecisions({ decisions, claimedLabels, registryRoles }) {
    const family = (role) => (role === 'unknown' ? 'abstention' : (registryRoles[role]?.family ?? 'unregistered'));
    const claimed = new Set(claimedLabels);
    const missing = decisions.filter((decision) => decision.missing).length;
    if (missing > 0) throw new TypeError(`${missing} sealed fields could not be located in their verified source`);
    const fields = decisions.map(
        ({
            row,
            acceptedRole,
            acceptedSource,
            abstentionReason,
            primitiveType,
            isKey,
            expectedPolicy,
            decisiveMetadata,
            rawRole,
            rawConfidence,
            rawRouteThreshold,
            predictionSetSize
        }) => {
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
                primitiveType,
                isKey,
                ...(expectedPolicy === undefined ? {} : { expectedPolicy }),
                policyExcluded,
                rawRole,
                // Diagnostics for the audit record: why arbitration accepted or rejected the raw role.
                rawConfidence: Number((rawConfidence ?? 0).toFixed(4)),
                ...(rawRouteThreshold === undefined ? {} : { rawRouteThreshold: Number(rawRouteThreshold.toFixed(4)) }),
                ...(predictionSetSize === undefined ? {} : { predictionSetSize }),
                supported: expected !== 'unknown' && claimed.has(expected) && !policyExcluded,
                decisiveMetadata,
                unannotatedStatus: family(expected) === 'status' && !decisiveMetadata && !policyExcluded,
                // Precision and critical false positives qualify the classifier: only its own
                // accepted decisions count. Metadata and lexical decisions are deterministic runtime
                // policy covered by unit tests and the lexical audit; they are reported separately.
                criticalFalsePositive:
                    acceptedSource === 'classifier' &&
                    acceptedRole !== expected &&
                    acceptedRole !== 'unknown' &&
                    (expected === 'unknown' || family(acceptedRole) !== family(expected))
            };
        }
    );
    const pair = (subset) => ({
        correct: subset.filter((field) => field.acceptedRole === field.expectedRole).length,
        total: subset.length
    });
    const accepted = fields.filter(
        (field) => field.acceptedRole !== 'unknown' && field.acceptedSource === 'classifier'
    );
    const nonClassifier = fields.filter(
        (field) => field.acceptedRole !== 'unknown' && field.acceptedSource !== 'classifier'
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
    const nonClassifierDecisions = {
        ...pair(nonClassifier),
        bySource: Object.fromEntries(
            [...new Set(nonClassifier.map((field) => field.acceptedSource))].map((source) => [
                source,
                pair(nonClassifier.filter((field) => field.acceptedSource === source))
            ])
        ),
        contradictions: nonClassifier
            .filter((field) => field.acceptedRole !== field.expectedRole && field.expectedRole !== 'unknown')
            .map((field) => ({
                id: field.id,
                expectedRole: field.expectedRole,
                acceptedRole: field.acceptedRole,
                source: field.acceptedSource
            }))
    };
    const gate = evaluateRoleQualityGate(fields);
    const rawStatus = statuses.filter((field) => field.rawRole === field.expectedRole).length;
    return {
        sealedEvaluation,
        nonClassifierDecisions,
        gate,
        rawStatusTopLabelCorrect: { correct: rawStatus, total: statuses.length },
        confusion: fields.reduce((acc, field) => {
            const key = `${field.expectedRole}->${field.acceptedRole}`;
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {}),
        fields
    };
}
