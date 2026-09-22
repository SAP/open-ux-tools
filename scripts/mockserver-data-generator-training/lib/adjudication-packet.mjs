import { createHash } from 'node:crypto';
import { collectQueueContexts } from './context-statistics.mjs';

export const ADJUDICATION_PACKET_FORMAT = 'mockgen-role-adjudication-packet';
export const ADJUDICATION_PACKET_VERSION = 1;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Build an adjudication packet from review queues.
 *
 * Items carry structural metadata only. The packet is an input for judges, never training data.
 *
 * @param {object} options options
 * @param {object[]} options.queues parsed review queues
 * @param {string[]} options.roles registered semantic role names (post-rename vocabulary)
 * @param {string[]} options.suggestedRoles roles listed first for judges; must be registered
 * @param {string} options.guidelineText frozen labeling guideline
 * @param {(context: object) => string} [options.serialize] runtime serializer for the serialized view
 * @returns {object} packet
 */
export function buildAdjudicationPacket({ queues, roles, suggestedRoles, guidelineText, serialize }) {
    if (!Array.isArray(roles) || roles.length === 0) throw new TypeError('packet requires registered roles');
    if (typeof guidelineText !== 'string' || guidelineText.trim().length < 40)
        throw new TypeError('packet requires a frozen guideline');
    const registered = new Set(roles);
    for (const role of suggestedRoles ?? []) {
        if (!registered.has(role)) throw new TypeError(`suggested role ${role} is not registered`);
    }
    const seen = new Set();
    const items = [];
    for (const item of collectQueueContexts(queues)) {
        const itemId = sha256(`${item.serviceId}|${item.fieldId}`);
        if (seen.has(itemId)) continue;
        seen.add(itemId);
        const field = queues
            .flatMap((queue) => queue.services)
            .flatMap((service) => service.pending)
            .find((candidate) => candidate.fieldId === item.fieldId && candidate.serviceId === item.serviceId);
        items.push({
            itemId,
            serviceId: item.serviceId,
            fieldId: item.fieldId,
            split: item.split,
            partition: item.partition,
            domain: item.domain,
            sourceChecksum: field?.sourceChecksum ?? null,
            priorPlannerStatus: field?.priorPlannerStatus ?? null,
            context: item.context,
            ...(serialize ? { serialized: serialize(item.context) } : {})
        });
    }
    return {
        format: ADJUDICATION_PACKET_FORMAT,
        version: ADJUDICATION_PACKET_VERSION,
        qualification: 'pending-adjudication-not-training-data',
        guidelineSha256: sha256(guidelineText),
        candidateRoles: {
            suggested: [...(suggestedRoles ?? [])],
            abstention: 'unknown',
            registered: [...registered].sort()
        },
        items
    };
}

/**
 * Split packet items into judge batches of bounded size, preserving order.
 *
 * @param {object} packet adjudication packet
 * @param {number} batchSize maximum items per batch
 * @returns {Array<{ batchId: string, items: object[] }>} batches
 */
export function batchPacket(packet, batchSize = 25) {
    if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new TypeError('batch size must be a positive integer');
    const batches = [];
    for (let start = 0; start < packet.items.length; start += batchSize) {
        const items = packet.items.slice(start, start + batchSize);
        batches.push({ batchId: sha256(items.map((item) => item.itemId).join('|')).slice(0, 16), items });
    }
    return batches;
}
