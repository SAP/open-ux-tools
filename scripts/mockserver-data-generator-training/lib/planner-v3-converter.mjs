import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { parseCsn } from '../../../packages/mock-data-generator/dist/schema/csn.js';
import { parseEdmx } from '../../../packages/mock-data-generator/dist/schema/edmx.js';
import { createFieldContextV3 } from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import { SEMANTIC_ROLE_REGISTRY } from '../../../packages/mock-data-generator/dist/semantics/role-registry.js';
import { runtimeGraphFromSchemaGraph } from './authorized-v3-converter.mjs';
import { familyFor } from './service-family.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function permittedForTraining(service) {
    const direct =
        service.license?.redistributable === true && ['Apache-2.0', 'MIT'].includes(service.license.identifier);
    const internal =
        service.license?.identifier === 'INTERNAL-OWNER-AUTHORIZATION' &&
        service.trainingAuthorization?.scope === 'structural-metadata-only' &&
        service.trainingAuthorization?.privacyReview?.status === 'passed';
    return direct || internal;
}

function parsedGraph(source, bytes) {
    const content = bytes.toString('utf8');
    if (source.format === 'edmx') return parseEdmx(content);
    if (source.format === 'csn') return parseCsn(content);
    if (source.format === 'schema-graph') return runtimeGraphFromSchemaGraph(JSON.parse(content));
    throw new TypeError(`unsupported planner source format: ${String(source.format)}`);
}

function fieldFromId(graph, serviceId, fieldId) {
    const prefix = `property:${serviceId}/`;
    if (!fieldId.startsWith(prefix)) return [];
    const path = fieldId.slice(prefix.length);
    return graph.entities.flatMap((entity) =>
        entity.properties.flatMap((property) => {
            const candidates = [entity.name, entity.entitySetName].map((name) => `${name}/${property.name}`);
            return candidates.some((candidate) => path === candidate || path.endsWith(`/${candidate}`))
                ? [{ entity, property }]
                : [];
        })
    );
}

/** Project one reviewed planner service through its checksum-verified schema into runtime v3 contexts. */
export async function convertPlannerServiceV3({
    dataset,
    registry,
    splits,
    serviceId,
    mapping,
    root,
    purpose,
    includeReviewQueue = false,
    reviewQueueFilter
}) {
    if (!isAbsolute(root)) throw new TypeError('planner source root must be absolute');
    if (!['train', 'calibration', 'evaluation'].includes(purpose))
        throw new TypeError('unsupported planner conversion purpose');
    if (mapping?.format !== 'mockgen-v3-descriptor-role-mapping' || mapping?.status !== 'machine-proposed-unreviewed') {
        throw new TypeError('planner conversion requires the versioned development role mapping');
    }
    const service = registry.services?.find((candidate) => candidate.id === serviceId);
    const partition = dataset.services?.find((candidate) => candidate.serviceId === serviceId);
    if (!service || !partition) throw new TypeError('planner service is absent from the registry or partition');
    if (splits?.assignments?.[serviceId] !== partition.split) {
        throw new TypeError('planner partition has a canonical split mismatch');
    }
    if (purpose === 'train' && partition.split !== 'train') throw new TypeError('planner split is not train');
    if (purpose === 'calibration' && partition.split !== 'calibration')
        throw new TypeError('planner split is not calibration');
    if (purpose === 'evaluation' && ['train', 'calibration'].includes(partition.split))
        throw new TypeError('training or calibration split is not evaluation');
    if (purpose !== 'evaluation' && (service.evaluationOnly === true || !permittedForTraining(service))) {
        throw new TypeError('planner source is not authorized for derivative training');
    }
    if (purpose === 'evaluation' && service.license?.redistributable !== true) {
        throw new TypeError('planner evaluation source requires explicit public rights');
    }
    const sourcePath = resolve(root, service.source.uri);
    const relativePath = relative(root, sourcePath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        throw new TypeError('planner source path escapes the source root');
    }
    const physicalRoot = await realpath(root);
    const physicalPath = await realpath(sourcePath);
    const physicalRelative = relative(physicalRoot, physicalPath);
    if (physicalRelative.startsWith('..') || isAbsolute(physicalRelative)) {
        throw new TypeError('planner source path escapes the source root');
    }
    const sourceBytes = await readFile(physicalPath);
    if (sha256(sourceBytes) !== service.source.contentChecksum) {
        throw new TypeError(`source checksum mismatch for ${serviceId}`);
    }
    const graph = parsedGraph(service.source, sourceBytes);
    const rows = [];
    const skipped = [];
    const reviewQueue = [];
    for (const property of partition.properties ?? []) {
        // This offline queue is for adjudication only. It never supplies runtime routing labels.
        const queueEligible = reviewQueueFilter
            ? reviewQueueFilter(property)
            : /status/iu.test(property.fieldId?.split('/').at(-1) ?? '');
        if (includeReviewQueue && queueEligible) {
            const queueMatches = fieldFromId(graph, service.source.serviceName ?? serviceId, property.fieldId);
            if (queueMatches.length === 1) {
                const { entity, property: schemaProperty } = queueMatches[0];
                reviewQueue.push({
                    fieldId: property.fieldId,
                    serviceId,
                    split: partition.split,
                    domain: service.businessDomainFamily ?? 'unclassified',
                    candidateRole: null,
                    reviewStatus: 'pending',
                    priorPlannerStatus: property.adjudicationStatus ?? null,
                    context: createFieldContextV3(graph, entity, schemaProperty),
                    sourceChecksum: service.source.contentChecksum
                });
            }
        }
        if (property.targetObserved !== true || property.adjudicationStatus !== 'llm-consensus-reviewed') continue;
        const descriptor = dataset.descriptorTexts?.[property.descriptorIndex];
        const title = typeof descriptor === 'string' ? descriptor.split('\n')[0].trim() : undefined;
        // Planner semanticUnknown means no value-planner descriptor, not a reviewed role abstention.
        const label = title === undefined ? undefined : mapping.mappings[title];
        if (!label) {
            skipped.push({ fieldId: property.fieldId, reason: 'no-reviewed-role-mapping' });
            continue;
        }
        if (label !== 'unknown' && !SEMANTIC_ROLE_REGISTRY[label]) {
            throw new TypeError(`unregistered mapped role: ${label}`);
        }
        const matches = fieldFromId(graph, service.source.serviceName ?? serviceId, property.fieldId);
        if (matches.length !== 1) {
            skipped.push({ fieldId: property.fieldId, reason: 'schema-field-not-unique' });
            continue;
        }
        const { entity, property: schemaProperty } = matches[0];
        rows.push({
            id: property.fieldId,
            group: serviceId,
            family: familyFor(registry, splits, service),
            label,
            context: createFieldContextV3(graph, entity, schemaProperty),
            source: {
                serviceId,
                sourceUri: service.source.uri,
                sourceChecksum: service.source.contentChecksum,
                graphFingerprint: service.graphFingerprint,
                adjudicationStatus: property.adjudicationStatus,
                mappingStatus: mapping.status
            }
        });
    }
    return {
        qualification: {
            status: 'unqualified',
            reason: 'Planner descriptor-to-role mapping is machine-proposed; no sealed v3 evaluation is claimed.'
        },
        partition: partition.split,
        serviceId,
        rows,
        skipped,
        ...(includeReviewQueue ? { reviewQueue } : {})
    };
}
