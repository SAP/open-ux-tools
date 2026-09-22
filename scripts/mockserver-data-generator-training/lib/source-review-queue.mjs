import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import {
    createFieldContextV3,
    serializeFieldContextV3
} from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import { runtimeGraphFromSchemaGraph } from './authorized-v3-converter.mjs';
import { partitionForSplit } from './context-statistics.mjs';
import { checkedGraph } from './incumbent-role-converter.mjs';
import { permittedForTraining } from './planner-v3-converter.mjs';
import { familyForServiceId } from './service-family.mjs';

const FITTING_FORMATS = new Set(['csn', 'edmx', 'schema-graph']);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Whether a registered service may supply fields for a train or calibration review queue. Checked
 * before any file access, so records whose source is not permitted are never read.
 *
 * @param {object} service registry record
 * @returns {boolean} true when the service is a permitted, non-evaluation, parseable training source
 */
export function fittingSourceAllowed(service) {
    return (
        service?.evaluationOnly !== true &&
        permittedForTraining(service) &&
        FITTING_FORMATS.has(service?.source?.format)
    );
}

/**
 * The opaque review identity of a field, identical to the adjudication packet's `itemId`.
 *
 * @param {string} serviceId registry service id
 * @param {string} fieldId field id within the service
 * @returns {string} sha256 item id
 */
export function reviewItemId(serviceId, fieldId) {
    return sha256(`${serviceId}|${fieldId}`);
}

/**
 * Keys that identify what the model actually sees for a context: the serialized text, and the token
 * ids after the encoder's truncation (two different texts can truncate to the same input).
 *
 * @param {object} context v3 field context
 * @param {{ encodeForModel(text: string): { inputIds: readonly number[] } }} tokenizer runtime tokenizer
 * @returns {{ textKey: string, tokenKey: string }} content keys
 */
export function inputKeys(context, tokenizer) {
    const serialized = serializeFieldContextV3(context);
    return {
        textKey: sha256(serialized),
        tokenKey: sha256(tokenizer.encodeForModel(serialized).inputIds.join(','))
    };
}

async function verifiedBytes(root, service) {
    const sourcePath = resolve(root, service.source.uri);
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
    return bytes;
}

function queueItem(service, split, fieldId, context) {
    return {
        fieldId,
        serviceId: service.id,
        split,
        domain: service.businessDomainFamily ?? 'unclassified',
        candidateRole: null,
        reviewStatus: 'pending',
        priorPlannerStatus: null,
        context,
        sourceChecksum: service.source.contentChecksum
    };
}

/**
 * Every reviewable field of one train or calibration service, parsed from its checksum-verified
 * source. Field ids follow the planner convention so existing review identities stay comparable:
 * `property:<serviceName>/<entitySet>/<property>` for EDMX and CSN, the property node id for schema
 * graphs.
 *
 * @param {object} options inputs
 * @param {string} options.root absolute source root that registry URIs resolve against
 * @param {{ services: object[] }} options.registry overlay registry
 * @param {{ assignments: Record<string, string>, clusters?: string[][] }} options.splits overlay splits
 * @param {string} options.serviceId service to read
 * @returns {Promise<{ serviceId: string, split: string, partition: string, items: object[] }>} queue items
 */
export async function serviceFieldItems({ root, registry, splits, serviceId }) {
    const service = registry.services.find((candidate) => candidate.id === serviceId);
    if (!service) throw new TypeError(`service ${serviceId} is not registered`);
    if (!fittingSourceAllowed(service)) throw new TypeError(`service ${serviceId} is not a permitted training source`);
    const split = splits.assignments?.[serviceId];
    const partition = partitionForSplit(split);
    if (partition !== 'train' && partition !== 'calibration') {
        throw new TypeError(`service ${serviceId} is assigned to ${String(split)}, not train or calibration`);
    }
    // Fails fast on a family that spans splits or names an unregistered service.
    familyForServiceId(registry, splits, serviceId);
    const items = [];
    if (service.source.format === 'schema-graph') {
        const schemaGraph = JSON.parse((await verifiedBytes(root, service)).toString('utf8'));
        const runtimeGraph = runtimeGraphFromSchemaGraph(schemaGraph);
        for (const entityNode of (schemaGraph.nodes ?? []).filter((node) => node.kind === 'entity')) {
            const entity = runtimeGraph.entities.find((candidate) => candidate.entitySetName === entityNode.id);
            if (!entity) continue;
            for (const propertyNode of schemaGraph.nodes.filter(
                (node) => node.kind === 'property' && node.entityId === entityNode.id
            )) {
                const property = entity.properties.find((candidate) => candidate.name === propertyNode.name);
                if (property)
                    items.push(
                        queueItem(service, split, propertyNode.id, createFieldContextV3(runtimeGraph, entity, property))
                    );
            }
        }
    } else {
        const graph = await checkedGraph(root, service);
        const serviceName = service.source.serviceName ?? service.id;
        // Planner ids: EDMX uses <namespace>/<entity type>, CSN uses the entity set name.
        const entityPath = (entity) =>
            service.source.format === 'edmx'
                ? [graph.namespace, entity.name].filter(Boolean).join('/')
                : (entity.entitySetName ?? entity.name);
        for (const entity of graph.entities) {
            for (const property of entity.properties) {
                const fieldId = `property:${serviceName}/${entityPath(entity)}/${property.name}`;
                items.push(queueItem(service, split, fieldId, createFieldContextV3(graph, entity, property)));
            }
        }
    }
    return { serviceId, split, partition, items };
}

/**
 * A deterministic uniform sample of one service's fields that never repeats what the model has already
 * seen: items are ordered by a salted hash (independent of any model), excluded item ids and content
 * keys are skipped, and a token sequence is taken at most once.
 *
 * @param {object[]} items queue items of one service
 * @param {object} options selection options
 * @param {number} options.perService maximum items to keep
 * @param {string} options.seed salt for the order
 * @param {{ encodeForModel(text: string): { inputIds: readonly number[] } }} options.tokenizer runtime tokenizer
 * @param {Set<string>} [options.excludeItemIds] review item ids already judged
 * @param {Set<string>} [options.excludeContentKeys] text or token keys already judged or sealed; updated with the selection
 * @returns {object[]} selected items
 */
export function selectUniform(
    items,
    { perService, seed, tokenizer, excludeItemIds = new Set(), excludeContentKeys = new Set() }
) {
    if (!Number.isSafeInteger(perService) || perService <= 0)
        throw new TypeError('perService must be a positive integer');
    const ordered = items
        .map((item) => ({ item, order: sha256(`${seed}|${item.serviceId}|${item.fieldId}`) }))
        .sort((left, right) => left.order.localeCompare(right.order));
    const selected = [];
    for (const { item } of ordered) {
        if (selected.length >= perService) break;
        if (excludeItemIds.has(reviewItemId(item.serviceId, item.fieldId))) continue;
        const { textKey, tokenKey } = inputKeys(item.context, tokenizer);
        if (excludeContentKeys.has(textKey) || excludeContentKeys.has(tokenKey)) continue;
        excludeContentKeys.add(textKey);
        excludeContentKeys.add(tokenKey);
        selected.push(item);
    }
    return selected;
}
