import { serializeFieldContextV3 } from '../../../packages/mock-data-generator/dist/semantics/field-context.js';
import { familyForServiceId } from './service-family.mjs';
import { permittedForTraining } from './planner-v3-converter.mjs';

/**
 * Join panel adjudications back to queue contexts and emit v3 training rows.
 *
 * Train and calibration rows receive opaque identities (digests) so the trained head never embeds
 * service or field names. Sealed rows keep real identities in a private file for evaluation.
 */

const EVALUATION_ONLY = new Set(['pending-disagreement', 'pending-missing']);
const CONFLICT_REASON = 'conflicting-context-labels';
const LEAKAGE_REASON = 'cross-partition-context-leakage';
// Higher rank keeps a duplicated context: sealed evaluation stays untouched by fitting data, and
// calibration keeps measuring contexts the head did not fit on. Rows are only ever dropped.
const PARTITION_RANK = { sealed: 3, calibration: 2, train: 1 };

/**
 * Drop every row whose serialized context carries more than one label inside one partition.
 *
 * The panel judges fields, not contexts, so two structurally identical fields can receive different
 * labels. Such a context is a panel disagreement at context level: no winner is picked and nothing
 * is relabelled, all of its rows leave the partition and are reported as skipped.
 *
 * @param {object[]} rows rows of one or more partitions
 * @param {(row: object) => string} partitionOf partition of a row
 * @returns {{ kept: object[], dropped: object[] }} split rows
 */
function dropConflictingContexts(rows, partitionOf) {
    const labels = new Map();
    for (const row of rows) {
        const key = `${partitionOf(row)}\u0000${serializeFieldContextV3(row.context)}`;
        labels.set(key, (labels.get(key) ?? new Set()).add(row.label));
    }
    const kept = [];
    const dropped = [];
    for (const row of rows) {
        const key = `${partitionOf(row)}\u0000${serializeFieldContextV3(row.context)}`;
        (labels.get(key).size > 1 ? dropped : kept).push(row);
    }
    return { kept, dropped };
}

/**
 * @param {object} options options
 * @param {object} options.packet adjudication packet (contexts)
 * @param {object} options.adjudication adjudication result
 * @param {object} options.registry canonical registry
 * @param {object} options.splits canonical splits
 * @param {{ digest(kind: string, value: string): string }} options.identity opaque identity mapper
 * @param {string[]} options.roles registered roles
 * @returns {{ fittingRows: object[], sealedRows: object[], skipped: object[], counts: object }} join result
 */
export function joinAdjudicatedQueue({ packet, adjudication, registry, splits, identity, roles }) {
    const contexts = new Map(packet.items.map((item) => [item.itemId, item]));
    const services = new Map((registry.services ?? []).map((service) => [service.id, service]));
    const registered = new Set([...roles, 'unknown']);
    const fittingRows = [];
    const sealedRows = [];
    const skipped = [];
    for (const item of adjudication.items) {
        const context = contexts.get(item.itemId);
        if (!context) throw new TypeError(`adjudicated item ${item.itemId} is absent from the packet`);
        if (item.expectedRole === null || EVALUATION_ONLY.has(item.reviewStatus)) {
            skipped.push({ itemId: item.itemId, partition: context.partition, reason: item.reviewStatus });
            continue;
        }
        if (!registered.has(item.expectedRole))
            throw new TypeError(`adjudicated role ${item.expectedRole} is not registered`);
        const service = services.get(context.serviceId);
        if (!service) throw new TypeError(`service ${context.serviceId} is not registered`);
        if (service.source?.contentChecksum !== context.sourceChecksum) {
            throw new TypeError(`source checksum drift for ${context.serviceId}`);
        }
        const family = familyForServiceId(registry, splits, context.serviceId);
        if (context.partition === 'sealed') {
            if (service.license?.redistributable !== true) {
                skipped.push({ itemId: item.itemId, partition: 'sealed', reason: 'sealed-source-not-redistributable' });
                continue;
            }
            sealedRows.push({
                id: context.fieldId,
                serviceId: context.serviceId,
                group: context.serviceId,
                family,
                domain: context.domain,
                split: context.split,
                label: item.expectedRole,
                supported: item.supported,
                decisiveMetadata: item.decisiveMetadata,
                agreement: item.agreement,
                sourceChecksum: context.sourceChecksum,
                context: context.context
            });
            continue;
        }
        if (service.evaluationOnly === true || !permittedForTraining(service)) {
            skipped.push({
                itemId: item.itemId,
                partition: context.partition,
                reason: 'source-not-authorized-for-training'
            });
            continue;
        }
        fittingRows.push({
            id: identity.digest('field', `${context.serviceId}|${context.fieldId}`),
            group: identity.digest('service', context.serviceId),
            family: identity.digest('family', family),
            partition: context.partition,
            domain: context.domain,
            label: item.expectedRole,
            agreement: item.agreement,
            context: context.context
        });
    }
    const fitting = dropConflictingContexts(fittingRows, (row) => row.partition);
    const sealed = dropConflictingContexts(sealedRows, () => 'sealed');
    for (const row of fitting.dropped) {
        skipped.push({ itemId: row.id, partition: row.partition, reason: CONFLICT_REASON });
    }
    for (const row of sealed.dropped) {
        skipped.push({ itemId: row.id, partition: 'sealed', reason: CONFLICT_REASON });
    }
    const owner = new Map();
    const tagged = [
        ...sealed.kept.map((row) => ({ row, partition: 'sealed' })),
        ...fitting.kept.map((row) => ({ row, partition: row.partition }))
    ];
    for (const { row, partition } of tagged) {
        const serialized = serializeFieldContextV3(row.context);
        if ((PARTITION_RANK[owner.get(serialized)] ?? 0) < PARTITION_RANK[partition]) owner.set(serialized, partition);
    }
    const leaked = ({ row, partition }) => owner.get(serializeFieldContextV3(row.context)) !== partition;
    for (const entry of tagged.filter(leaked)) {
        skipped.push({ itemId: entry.row.id, partition: entry.partition, reason: LEAKAGE_REASON });
    }
    sealed.kept = sealed.kept.filter((row) => !leaked({ row, partition: 'sealed' }));
    fitting.kept = fitting.kept.filter((row) => !leaked({ row, partition: row.partition }));
    const countBy = (rows, key) => rows.reduce((acc, row) => ({ ...acc, [row[key]]: (acc[row[key]] ?? 0) + 1 }), {});
    return {
        fittingRows: fitting.kept,
        sealedRows: sealed.kept,
        skipped,
        counts: {
            fitting: fitting.kept.length,
            sealed: sealed.kept.length,
            skipped: skipped.length,
            fittingByPartition: countBy(fitting.kept, 'partition'),
            fittingByLabel: countBy(fitting.kept, 'label'),
            sealedByLabel: countBy(sealed.kept, 'label'),
            skippedByReason: countBy(skipped, 'reason')
        }
    };
}
