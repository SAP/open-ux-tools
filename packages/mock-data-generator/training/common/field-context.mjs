import { serializeFieldContextV3 } from './runtime.mjs';

/**
 * Split an identifier into words exactly as the runtime serializer does.
 * @param {string} identifier the identifier
 * @returns {string} the words
 */
function identifierWords(identifier) {
    return identifier
        .replace(/[_\-./]+/gu, ' ')
        .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2')
        .replace(/\s+/gu, ' ')
        .trim();
}

/**
 * Rebuild the runtime v3 field context of a published field from its `field_contexts` record and its
 * published serialized text. The record carries the structure (entity, property, type, facets,
 * neighbours); label, data element and description are read back from the text, where the serializer
 * put them. Annotations, links and relationships are not published and stay empty; the serializer does
 * not render them, so the rebuilt context serializes to the published text.
 * @param {object} record a `field_contexts` record
 * @param {string} text the published serialized text of the field
 * @returns {object} the v3 field context
 */
export function rebuildFieldContext(record, text) {
    const parts = text.split('; ');
    const headNoun = identifierWords(record.property).split(' ').at(-1)?.toLowerCase();
    const tail = headNoun ? `a ${headNoun} field` : undefined;
    const middle = parts.slice(1, tail && parts.at(-1) === tail ? -1 : undefined);
    const take = (prefix) => (middle[0]?.startsWith(prefix) ? middle.shift().slice(prefix.length) : undefined);
    const label = take('label ');
    const dataElement = take('data element ');
    const description = middle.length > 0 ? middle.shift() : undefined;
    const facets = record.facets ?? {};
    return {
        inputFormat: 'v3',
        entityName: record.entity_type,
        propertyName: record.property,
        primitiveType: record.primitive_type,
        nullable: facets.nullable !== false,
        isKey: facets.isKey === true,
        facets: {
            ...(facets.maxLength == null ? {} : { maxLength: facets.maxLength }),
            ...(facets.precision == null ? {} : { precision: facets.precision }),
            ...(facets.scale == null ? {} : { scale: facets.scale })
        },
        ...(label ? { label } : {}),
        ...(description ? { description } : {}),
        annotations: [],
        ...(dataElement ? { dataElement } : {}),
        linkedMetadataPaths: [],
        relationshipParticipation: [],
        neighbors: (record.neighbors ?? []).slice(0, 8)
    };
}

/**
 * Rebuild the contexts of published rows, keeping only those that re-serialize to their published text.
 * @param {Array<{ field_id: string, text: string }>} rows published rows (`rows_head_a`, `sealed_eval`)
 * @param {Map<string, object>} fieldContexts `field_contexts` records by field id
 * @returns {{ contexts: Map<string, object>, unrebuildable: string[] }} contexts by field id and the refused ids
 */
export function rebuildContexts(rows, fieldContexts) {
    const contexts = new Map();
    const unrebuildable = [];
    for (const row of rows) {
        const record = fieldContexts.get(row.field_id);
        const context = record ? rebuildFieldContext(record, row.text) : undefined;
        if (context && serializeFieldContextV3(context) === row.text) {
            contexts.set(row.field_id, context);
        } else {
            unrebuildable.push(row.field_id);
        }
    }
    return { contexts, unrebuildable };
}
