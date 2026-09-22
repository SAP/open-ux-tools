import { createHash } from 'node:crypto';

/**
 * Build blinded field-to-value relevance review candidates from approved public value rows.
 *
 * Positive candidates pair a field with a value observed for it. Hard-negative candidates pair the
 * same field with a same-type value from a different service group. Judges see neither the origin
 * nor the intended class. Output contains raw values and must stay in the private directory.
 */

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Resolve an approved-values field id against a runtime graph.
 *
 * @param {object} graph runtime schema graph
 * @param {string} entityId value-row entity id
 * @param {string} fieldId value-row field id
 * @returns {{ entity: object, property: object } | undefined} resolution
 */
export function resolveValueField(graph, entityId, fieldId) {
    const propertyName = fieldId.split('/').at(-1);
    const entityName = entityId.split('/').at(-1);
    const candidates = graph.entities.filter(
        (entity) =>
            entity.entitySetName === entityId || entity.name === entityName || entity.entitySetName === entityName
    );
    const matches = candidates.flatMap((entity) =>
        entity.properties.filter((property) => property.name === propertyName).map((property) => ({ entity, property }))
    );
    return matches.length === 1 ? matches[0] : undefined;
}

function orderKey(seed, value) {
    return sha256(`${seed}|${value}`);
}

function fieldRequest(property) {
    return {
        name: property.name,
        primitiveType: property.primitiveType,
        nullable: property.nullable !== false,
        ...(property.isKey ? { isKey: true } : {}),
        ...(property.label ? { label: property.label } : {}),
        ...(property.description ? { description: property.description } : {}),
        ...(property.maxLength === undefined ? {} : { maxLength: property.maxLength })
    };
}

const usableValue = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 96;

/**
 * Collect observed string values per eligible field.
 *
 * @param {object} options options
 * @param {string} options.serviceGroup owning service id
 * @param {object} options.graph runtime graph
 * @param {object[]} options.rows approved value rows ({ entityId, values })
 * @returns {Map<string, { entity: object, property: object, values: Map<string, string> }>} fields keyed by field id
 */
export function collectFieldValues({ serviceGroup, graph, rows }) {
    const fields = new Map();
    for (const row of rows) {
        const keyProperties = [];
        for (const [fieldId, value] of Object.entries(row.values ?? {})) {
            const resolved = resolveValueField(graph, row.entityId, fieldId);
            if (!resolved) continue;
            if (resolved.property.isKey) keyProperties.push({ name: resolved.property.name, value });
        }
        const key = keyProperties.length === 1 ? keyProperties[0] : undefined;
        for (const [fieldId, value] of Object.entries(row.values ?? {})) {
            const resolved = resolveValueField(graph, row.entityId, fieldId);
            if (
                !resolved ||
                resolved.property.isKey ||
                resolved.property.primitiveType !== 'string' ||
                !usableValue(value)
            )
                continue;
            const entry = fields.get(fieldId) ?? {
                serviceGroup,
                entity: resolved.entity,
                property: resolved.property,
                values: new Map()
            };
            if (!entry.values.has(value)) entry.values.set(value, key ? String(key.value) : '');
            entry.keyProperty = key?.name ?? entry.keyProperty ?? '';
            fields.set(fieldId, entry);
        }
    }
    return fields;
}

function pairFor(entry, value, linkedCodeValue) {
    const serviceId = entry.serviceGroup;
    return {
        service: { alias: serviceId, urlPath: `/${serviceId}`, odataVersion: '4.0' },
        resource: entry.entity.entitySetName,
        entity: entry.entity.name,
        field: fieldRequest(entry.property),
        value,
        linkedCode: { property: entry.keyProperty ?? '', value: linkedCodeValue ?? '' },
        textLink: { codeProperty: entry.keyProperty ?? '', textProperty: entry.property.name },
        relatedResources: []
    };
}

/**
 * Sample positive and cross-domain negative candidates for one partition.
 *
 * @param {object} options options
 * @param {string} options.partition partition name
 * @param {Map<string, object>} options.ownerFields fields of the owning groups in this partition
 * @param {Map<string, object>} options.donorFields fields whose values may serve as negatives
 * @param {number} options.positives positive candidate count
 * @param {number} options.negatives negative candidate count
 * @param {string} options.seed deterministic seed
 * @param {number} [options.valuesPerField] positive values per field cap
 * @param {'cross-domain'|'kind-mismatch'} [options.negativeKind] how negatives are drawn
 * @returns {object[]} candidates with private origin metadata
 */
/**
 * Coarse shape of a value: character class, word count and length buckets. Used to pick
 * `kind-mismatch` negatives, values whose shape clearly differs from what the field holds.
 *
 * @param {string} value candidate value
 * @returns {string} shape signature
 */
export function valueShape(value) {
    const text = String(value).trim();
    const charset = /^[0-9.,\-\s]+$/u.test(text)
        ? 'numeric'
        : /^[A-Z0-9_\-./]+$/u.test(text)
          ? 'code'
          : /^[\p{L}\s'.\-]+$/u.test(text)
            ? 'words'
            : 'mixed';
    const tokens = text.split(/\s+/u).filter(Boolean).length;
    const words = tokens <= 1 ? '1' : tokens <= 3 ? '2-3' : '4+';
    const length = text.length <= 4 ? 'xs' : text.length <= 12 ? 's' : text.length <= 40 ? 'm' : 'l';
    return `${charset}|${words}|${length}`;
}

function dominantShape(entry) {
    const counts = new Map();
    for (const value of entry.values.keys()) counts.set(valueShape(value), (counts.get(valueShape(value)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
}

function shapesDiffer(left, right) {
    const a = left.split('|');
    const b = right.split('|');
    return a.filter((part, index) => part !== b[index]).length >= 2;
}

export function sampleRelevanceCandidates({
    partition,
    ownerFields,
    donorFields,
    positives,
    negatives,
    seed,
    valuesPerField = 4,
    negativeKind = 'cross-domain'
}) {
    if (!['cross-domain', 'kind-mismatch'].includes(negativeKind))
        throw new TypeError(`unknown negative kind ${negativeKind}`);
    const owners = [...ownerFields.entries()].sort((a, b) => orderKey(seed, a[0]).localeCompare(orderKey(seed, b[0])));
    if (owners.length === 0) throw new TypeError(`partition ${partition} has no eligible owner fields`);
    const positiveCandidates = [];
    for (let round = 0; round < valuesPerField && positiveCandidates.length < positives; round += 1) {
        for (const [fieldId, entry] of owners) {
            const values = [...entry.values.keys()].sort((a, b) =>
                orderKey(`${seed}|${fieldId}`, a).localeCompare(orderKey(`${seed}|${fieldId}`, b))
            );
            const value = values[round];
            if (value === undefined) continue;
            positiveCandidates.push({
                fieldId,
                entry,
                value,
                linkedCodeValue: entry.values.get(value),
                origin: 'observed',
                donorGroup: entry.serviceGroup
            });
            if (positiveCandidates.length >= positives) break;
        }
    }
    const donorPool = [...donorFields.entries()]
        .flatMap(([donorFieldId, donor]) =>
            [...donor.values.keys()].map((value) => ({ donorFieldId, donorGroup: donor.serviceGroup, value }))
        )
        .sort((a, b) =>
            orderKey(seed, `${a.donorGroup}|${a.donorFieldId}|${a.value}`).localeCompare(
                orderKey(seed, `${b.donorGroup}|${b.donorFieldId}|${b.value}`)
            )
        );
    const negativeCandidates = [];
    // A (field, value) pair may be reachable through more than one donor; each one is sampled once.
    const chosen = new Set(positiveCandidates.map((candidate) => `${candidate.fieldId}\u0000${candidate.value}`));
    let cursor = 0;
    for (let index = 0; negativeCandidates.length < negatives && index < negatives * 4; index += 1) {
        const [fieldId, entry] = owners[index % owners.length];
        let attempts = 0;
        while (attempts < donorPool.length) {
            const donor = donorPool[cursor % donorPool.length];
            cursor += 1;
            attempts += 1;
            if (donor.donorGroup === entry.serviceGroup || entry.values.has(donor.value)) continue;
            // kind-mismatch: the donor value must look like a different kind of thing than the
            // field's own values (at least two of charset, word count and length differ).
            if (negativeKind === 'kind-mismatch' && !shapesDiffer(dominantShape(entry) ?? '', valueShape(donor.value)))
                continue;
            if (chosen.has(`${fieldId}\u0000${donor.value}`)) continue;
            chosen.add(`${fieldId}\u0000${donor.value}`);
            const linkedCodeValue = [...entry.values.values()][negativeCandidates.length % entry.values.size] ?? '';
            negativeCandidates.push({
                fieldId,
                entry,
                value: donor.value,
                linkedCodeValue,
                origin: negativeKind,
                donorGroup: donor.donorGroup
            });
            break;
        }
    }
    return [...positiveCandidates, ...negativeCandidates].map((candidate) => ({
        id: sha256(
            `${partition}|${candidate.entry.serviceGroup}|${candidate.fieldId}|${candidate.value}|${candidate.origin}|${candidate.donorGroup}`
        ),
        partition,
        serviceGroup: candidate.entry.serviceGroup,
        origin: candidate.origin,
        donorGroup: candidate.donorGroup,
        pair: pairFor(candidate.entry, candidate.value, candidate.linkedCodeValue)
    }));
}

/**
 * Join relevance judgments to candidates and produce trainer records.
 *
 * Observed pairs judged irrelevant and cross-domain pairs judged relevant keep the judges' decision;
 * the former are dropped because the trainer only admits reviewed cross-domain negatives.
 *
 * @param {object[]} candidates private candidates
 * @param {Map<string, { relevant: boolean, agreement: string }>} consensus majority decisions by id
 * @returns {{ records: object[], dropped: Record<string, number> }} trainer input
 */
export function reviewedRelevanceRecords(candidates, consensus) {
    const records = [];
    const dropped = {};
    const drop = (reason) => {
        dropped[reason] = (dropped[reason] ?? 0) + 1;
    };
    for (const candidate of candidates) {
        const decision = consensus.get(candidate.id);
        if (!decision) {
            drop('no-consensus');
            continue;
        }
        if (decision.relevant) {
            records.push({
                id: candidate.id,
                serviceGroup: candidate.serviceGroup,
                partition: candidate.partition,
                reviewed: true,
                relevant: true,
                pair: candidate.pair
            });
        } else if (candidate.origin === 'cross-domain' || candidate.origin === 'kind-mismatch') {
            records.push({
                id: candidate.id,
                serviceGroup: candidate.serviceGroup,
                partition: candidate.partition,
                reviewed: true,
                relevant: false,
                negativeKind: candidate.origin,
                pair: candidate.pair
            });
        } else {
            drop('observed-pair-judged-irrelevant');
        }
    }
    return { records, dropped };
}
