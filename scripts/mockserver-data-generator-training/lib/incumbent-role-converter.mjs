import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { parseCsn } from '../../../packages/mock-data-generator/dist/schema/csn.js';
import { parseEdmx } from '../../../packages/mock-data-generator/dist/schema/edmx.js';
import { serializeFieldContextV3 } from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import { SEMANTIC_ROLE_REGISTRY } from '../../../packages/mock-data-generator/dist/semantics/role-registry.js';
import { runtimeGraphFromSchemaGraph } from './authorized-v3-converter.mjs';
import { joinReviewedRole } from './reviewed-role-join.mjs';
import { familyFor } from './service-family.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function trainingAllowed(service) {
    const publiclyLicensed =
        service.license?.redistributable === true && ['Apache-2.0', 'MIT'].includes(service.license.identifier);
    const approvedInternal =
        service.license?.identifier === 'INTERNAL-OWNER-AUTHORIZATION' &&
        service.trainingAuthorization?.scope === 'structural-metadata-only' &&
        service.trainingAuthorization?.privacyReview?.status === 'passed';
    return publiclyLicensed || approvedInternal;
}

function sourceAllowed(service, purpose) {
    return purpose === 'evaluation' ? service.license?.redistributable === true : trainingAllowed(service);
}

function expectedSplit(purpose, split) {
    if (purpose === 'evaluation') {
        return ['known-sap-holdout', 'unseen-sap-holdout', 'non-sap-holdout', 'adversarial-unknown-holdout'].includes(
            split
        );
    }
    return purpose === split;
}

function parseGraph(source, bytes) {
    const content = bytes.toString('utf8');
    if (source.format === 'edmx') return parseEdmx(content);
    if (source.format === 'csn') return parseCsn(content);
    if (source.format === 'schema-graph') return runtimeGraphFromSchemaGraph(JSON.parse(content));
    throw new TypeError(`unsupported incumbent source format: ${String(source.format)}`);
}

export async function checkedGraph(root, service) {
    const sourcePath = resolve(root, service.source.uri);
    const lexicalRelative = relative(root, sourcePath);
    if (lexicalRelative.startsWith('..') || isAbsolute(lexicalRelative)) {
        throw new TypeError(`source path escapes the source root for ${service.id}`);
    }
    const physicalRoot = await realpath(root);
    const physicalPath = await realpath(sourcePath);
    const physicalRelative = relative(physicalRoot, physicalPath);
    if (physicalRelative.startsWith('..') || isAbsolute(physicalRelative)) {
        throw new TypeError(`source path escapes the source root for ${service.id}`);
    }
    const bytes = await readFile(physicalPath);
    if (sha256(bytes) !== service.source.contentChecksum) {
        throw new TypeError(`source checksum mismatch for ${service.id}`);
    }
    return parseGraph(service.source, bytes);
}

/** Convert explicit incumbent judgments; never infer a source/schema binding by name. */
export async function convertIncumbentRoleJudgments({ reviews, bindings, registry, splits, root, purpose }) {
    if (!Array.isArray(reviews) || !Array.isArray(bindings) || !Array.isArray(registry?.services)) {
        throw new TypeError('reviews, bindings and canonical registry services are required');
    }
    if (!isAbsolute(root)) throw new TypeError('incumbent source root must be absolute');
    if (!['train', 'calibration', 'evaluation'].includes(purpose)) {
        throw new TypeError('unsupported incumbent conversion purpose');
    }
    const services = new Map(registry.services.map((service) => [service.id, service]));
    const bindingGroups = new Map();
    for (const binding of bindings) {
        const group = bindingGroups.get(binding.reviewSourceService) ?? [];
        group.push(binding);
        bindingGroups.set(binding.reviewSourceService, group);
    }
    const graphCache = new Map();
    const rows = [];
    const skipped = [];
    for (const [index, review] of reviews.entries()) {
        const skip = (reason) => skipped.push({ index, sourceService: review?.source_service ?? null, reason });
        if (review?.hint === 'REVIEW_ME') {
            skip('unresolved-review');
            continue;
        }
        if (review?.hint !== 'unknown' && !SEMANTIC_ROLE_REGISTRY[review?.hint]) {
            skip('unregistered-role');
            continue;
        }
        const candidates = bindingGroups.get(review.source_service) ?? [];
        if (candidates.length !== 1) {
            skip(candidates.length === 0 ? 'unbound-source' : 'ambiguous-source-binding');
            continue;
        }
        const binding = candidates[0];
        const service = services.get(binding.serviceId);
        if (!service || (binding.sourceChecksum && binding.sourceChecksum !== service.source?.contentChecksum)) {
            skip('source-binding-mismatch');
            continue;
        }
        const split = splits?.assignments?.[service.id];
        if (!expectedSplit(purpose, split)) {
            skip('wrong-canonical-split');
            continue;
        }
        if (!sourceAllowed(service, purpose)) {
            skip('unauthorized-source');
            continue;
        }
        if (service.evaluationOnly === true && purpose !== 'evaluation') {
            skip('evaluation-only-source');
            continue;
        }
        if (!graphCache.has(service.id)) graphCache.set(service.id, await checkedGraph(root, service));
        try {
            const row = joinReviewedRole({
                review,
                binding: {
                    ...binding,
                    graph: graphCache.get(service.id),
                    serviceId: service.id,
                    sourceChecksum: service.source.contentChecksum,
                    reviewKind: binding.reviewKind ?? 'incumbent-real-service-judgment',
                    permission: {
                        derivativeTrainingAllowed: trainingAllowed(service),
                        permittedUses: sourceAllowed(service, 'evaluation') ? ['training', 'evaluation'] : ['training']
                    }
                },
                purpose: purpose === 'evaluation' ? 'evaluation' : 'train'
            });
            rows.push({
                ...row,
                family: familyFor(registry, splits, service),
                partition: split,
                source: { ...row.source, sourceUri: service.source.uri }
            });
        } catch (error) {
            if (/exactly one schema/u.test(error.message)) {
                skip('schema-field-not-unique');
                continue;
            }
            if (/review entity binding mismatch/u.test(error.message)) {
                skip('review-entity-binding-mismatch');
                continue;
            }
            throw error;
        }
    }
    const exclusions = Object.fromEntries(
        [...new Set(skipped.map((entry) => entry.reason))]
            .sort()
            .map((reason) => [reason, skipped.filter((entry) => entry.reason === reason).length])
    );
    return {
        format: 'mockgen-incumbent-role-conversion',
        version: 1,
        qualification: {
            status: 'unqualified',
            reason: 'Source-bound judgments still require adjudication, calibration, and sealed evaluation.'
        },
        purpose,
        counts: { input: reviews.length, accepted: rows.length, exclusions },
        skipped,
        rows
    };
}

/** Reject service-family and exact serialized-context leakage across every partition. */
export function assertRolePartitionIsolation(partitions) {
    const familyOwner = new Map();
    const contextOwner = new Map();
    for (const [partition, rows] of Object.entries(partitions)) {
        for (const row of rows) {
            if (!row.group || !row.family) throw new TypeError('partition rows require service and family identities');
            const familyOwnerPartition = familyOwner.get(row.family);
            if (familyOwnerPartition && familyOwnerPartition !== partition) {
                throw new TypeError(`service family leakage between ${familyOwnerPartition} and ${partition}`);
            }
            familyOwner.set(row.family, partition);
            const serialized = row.serialized ?? serializeFieldContextV3(row.context);
            const contextOwnerRecord = contextOwner.get(serialized);
            if (contextOwnerRecord && contextOwnerRecord.partition !== partition) {
                throw new TypeError(
                    `serialized context leakage between ${contextOwnerRecord.partition} and ${partition}`
                );
            }
            if (contextOwnerRecord && contextOwnerRecord.label !== row.label) {
                throw new TypeError(`conflicting labels for one serialized context in ${partition}`);
            }
            contextOwner.set(serialized, { partition, label: row.label });
        }
    }
    return true;
}
