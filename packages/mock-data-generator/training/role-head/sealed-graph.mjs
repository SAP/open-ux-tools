import { rebuildContexts } from '../common/field-context.mjs';
import { createFieldContextV3, parseEdmx, serializeFieldContextV3 } from '../common/runtime.mjs';

const EDM_TYPE = Object.freeze({
    string: 'Edm.String',
    int: 'Edm.Int32',
    decimal: 'Edm.Decimal',
    bool: 'Edm.Boolean',
    guid: 'Edm.Guid',
    date: 'Edm.Date',
    datetime: 'Edm.DateTime',
    datetimeoffset: 'Edm.DateTimeOffset',
    time: 'Edm.TimeOfDay',
    binary: 'Edm.Binary'
});

const XML_ENTITIES = Object.freeze({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' });
const xml = (value) => String(value).replace(/[&<>"']/gu, (character) => XML_ENTITIES[character]);

// Terms whose value the published context already carries (label, description, data element).
const VALUED_TERM_SUFFIXES = ['.label', '.description', '.dataelement', '.quickinfo'];

/**
 * The EDMX property element of one sealed field.
 * @param {{ context: object, terms: string[] }} field context and annotation terms
 * @returns {string} the Property element
 */
function propertyXml({ context, terms }) {
    const type = EDM_TYPE[context.primitiveType];
    if (!type) {
        throw new TypeError(
            `sealed field ${context.entityName}.${context.propertyName} has unsupported type ${context.primitiveType}`
        );
    }
    const { maxLength, precision, scale } = context.facets;
    const attributes = [
        `Name="${xml(context.propertyName)}"`,
        `Type="${type}"`,
        `Nullable="${context.nullable}"`,
        ...(maxLength === undefined ? [] : [`MaxLength="${maxLength}"`]),
        ...(precision === undefined ? [] : [`Precision="${precision}"`]),
        ...(scale === undefined ? [] : [`Scale="${scale}"`])
    ].join(' ');
    const annotations = [
        ['Common.Label', context.label],
        ['Core.Description', context.description],
        ['Common.DataElement', context.dataElement]
    ]
        .filter(([, value]) => value !== undefined)
        .map(([term, value]) => `<Annotation Term="${term}" String="${xml(value)}"/>`)
        .concat(
            terms
                .filter((term) => !VALUED_TERM_SUFFIXES.some((suffix) => term.toLowerCase().endsWith(suffix)))
                .map((term) => `<Annotation Term="${xml(term)}"/>`)
        )
        .join('');
    return `<Property ${attributes}>${annotations}</Property>`;
}

/**
 * The OData V4 metadata of one sealed service, rebuilt from its published fields: one entity type and
 * entity set per entity, one property per sealed field with its type, facets, label, description and
 * data element, and its other annotation terms without values (the dataset publishes terms only).
 * Annotation values, value lists and associations are not published.
 * @param {Array<{ context: object, terms: string[] }>} fields v3 contexts and annotation terms of the sealed fields
 * @returns {string} EDMX document
 */
export function sealedServiceEdmx(fields) {
    const entities = new Map();
    for (const field of fields) {
        entities.set(field.context.entityName, [...(entities.get(field.context.entityName) ?? []), field]);
    }
    const types = [...entities].map(([name, properties]) => {
        const keys = properties.filter(({ context }) => context.isKey);
        const key = keys.length
            ? `<Key>${keys.map(({ context }) => `<PropertyRef Name="${xml(context.propertyName)}"/>`).join('')}</Key>`
            : '';
        return `<EntityType Name="${xml(name)}">${key}${properties.map(propertyXml).join('')}</EntityType>`;
    });
    const sets = [...entities.keys()].map((name) => `<EntitySet Name="${xml(name)}" EntityType="S.${xml(name)}"/>`);
    return (
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices>' +
        `<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="S">${types.join('')}` +
        `<EntityContainer Name="C">${sets.join('')}</EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`
    );
}

/**
 * Group the published sealed fields into services with a rebuilt schema graph each. Every field's runtime
 * context, built from the graph, must serialize to its published text, so the classifier sees exactly
 * the published input.
 * @param {object} options options
 * @param {object[]} options.sealedRows `sealed_eval` records
 * @param {Map<string, object>} options.fieldContexts `field_contexts` records by field id
 * @param {Map<string, object>} options.labels `labels` records by field id (for the domain)
 * @returns {Array<{ serviceId: string, graph: object, rows: object[] }>} services with their sealed rows
 */
export function buildSealedServices({ sealedRows, fieldContexts, labels }) {
    const { contexts, unrebuildable } = rebuildContexts(sealedRows, fieldContexts);
    if (unrebuildable.length > 0) {
        throw new TypeError(`${unrebuildable.length} sealed fields cannot be rebuilt from field_contexts`);
    }
    const byService = new Map();
    for (const row of sealedRows) {
        const domain = labels.get(row.field_id)?.domain;
        if (!domain) {
            throw new TypeError(`sealed field ${row.field_id} has no labels record with a domain`);
        }
        const rows = byService.get(row.service_id) ?? [];
        rows.push({
            id: row.field_id,
            serviceId: row.service_id,
            domain,
            label: row.label,
            text: row.text,
            context: contexts.get(row.field_id),
            terms: fieldContexts.get(row.field_id).annotations_summary?.terms ?? []
        });
        byService.set(row.service_id, rows);
    }
    return [...byService].map(([serviceId, rows]) => {
        const graph = parseEdmx(sealedServiceEdmx(rows));
        for (const row of rows) {
            const entity = graph.entities.find((candidate) => candidate.name === row.context.entityName);
            const property = entity?.properties.find((candidate) => candidate.name === row.context.propertyName);
            if (!property || serializeFieldContextV3(createFieldContextV3(graph, entity, property)) !== row.text) {
                throw new TypeError(`sealed field ${row.id} does not round-trip through its rebuilt metadata`);
            }
        }
        return { serviceId, graph, rows };
    });
}
