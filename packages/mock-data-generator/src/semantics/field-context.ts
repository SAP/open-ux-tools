import { createHash } from 'node:crypto';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { FieldContextV3, JsonValue, SemanticClassifierInput } from '../types.js';

export const FIELD_CONTEXT_SERIALIZER_VERSION = 'field-context-v3-priority-text-v4' as const;
export const FIELD_CONTEXT_SERIALIZER_FINGERPRINT = createHash('sha256')
    .update(FIELD_CONTEXT_SERIALIZER_VERSION)
    .digest('hex');

function compareText(left: string, right: string): number {
    if (left < right) {
        return -1;
    }
    return left > right ? 1 : 0;
}

function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record)
            .sort(compareText)
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function normalizedAnnotations(property: SchemaProperty): SemanticClassifierInput['annotations'] {
    return Object.freeze(
        property.annotations
            .map((annotation) =>
                Object.freeze({
                    term: annotation.term,
                    ...(annotation.value === undefined ? {} : { value: annotation.value as JsonValue })
                })
            )
            .sort((left, right) =>
                compareText(`${left.term}:${canonicalJson(left.value)}`, `${right.term}:${canonicalJson(right.value)}`)
            )
    );
}

function linkedMetadataPaths(property: SchemaProperty): string[] {
    return [
        ...new Set(
            [
                property.links?.text,
                property.links?.unit,
                property.links?.currency,
                property.links?.valueListCollection,
                ...property.annotations.flatMap((annotation) => {
                    const term = annotation.term.toLowerCase();
                    return typeof annotation.value === 'string' &&
                        (term.endsWith('.text') || term.endsWith('.unit') || term.endsWith('.currency'))
                        ? [annotation.value]
                        : [];
                })
            ].filter((path): path is string => path !== undefined)
        )
    ].sort(compareText);
}

/**
 * Build the classifier context from the same canonical graph used for generation.
 *
 * @param graph
 * @param entity
 * @param property
 */
export function createFieldContextV3(
    graph: SchemaGraph,
    entity: SchemaEntity,
    property: SchemaProperty
): FieldContextV3 {
    const relationshipParticipation = graph.relationships
        .flatMap((relationship) => [
            ...relationship.mappings.flatMap((mapping) =>
                relationship.fromEntitySet === entity.entitySetName && mapping.sourceProperty === property.name
                    ? [
                          {
                              relationship: relationship.name,
                              direction: 'source' as const,
                              property: mapping.targetProperty
                          }
                      ]
                    : []
            ),
            ...relationship.mappings.flatMap((mapping) =>
                relationship.toEntitySet === entity.entitySetName && mapping.targetProperty === property.name
                    ? [
                          {
                              relationship: relationship.name,
                              direction: 'target' as const,
                              property: mapping.sourceProperty
                          }
                      ]
                    : []
            )
        ])
        .sort((left, right) =>
            compareText(
                `${left.relationship}:${left.direction}:${left.property}`,
                `${right.relationship}:${right.direction}:${right.property}`
            )
        );
    return Object.freeze({
        inputFormat: 'v3',
        entityName: entity.name,
        propertyName: property.name,
        primitiveType: property.primitiveType,
        nullable: property.nullable,
        isKey: property.isKey,
        facets: Object.freeze({
            ...(property.maxLength === undefined ? {} : { maxLength: property.maxLength }),
            ...(property.precision === undefined ? {} : { precision: property.precision }),
            ...(property.scale === undefined ? {} : { scale: property.scale }),
            ...(property.numericMinimum === undefined ? {} : { numericMinimum: property.numericMinimum }),
            ...(property.numericMaximum === undefined ? {} : { numericMaximum: property.numericMaximum })
        }),
        ...(property.label ? { label: property.label } : {}),
        ...(property.description ? { description: property.description } : {}),
        annotations: normalizedAnnotations(property),
        ...(property.dataElement ? { dataElement: property.dataElement } : {}),
        linkedMetadataPaths: Object.freeze(linkedMetadataPaths(property)),
        relationshipParticipation: Object.freeze(relationshipParticipation),
        neighbors: Object.freeze(
            entity.properties
                .map((candidate) => candidate.name)
                .filter((name) => name !== property.name)
                .sort(compareText)
                .slice(0, 8)
        )
    });
}

/**
 * Split a technical identifier into the words a sentence encoder was trained on:
 * `BookingStatus_code` becomes `Booking Status code`, `ORDER_ID` becomes `ORDER ID`.
 *
 * @param identifier
 */
function identifierWords(identifier: string): string {
    return identifier
        .replace(/[_\-./]+/gu, ' ')
        .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2')
        .replace(/\s+/gu, ' ')
        .trim();
}

/**
 * Serialize classifier input identically for training data and runtime inference.
 *
 * The text is a short natural-language rendering of the field: the frozen sentence encoder reads
 * words, not pipe-delimited technical fields, so identity comes first as words, then the
 * structural facts, then the authored label, data element and description, then the identifier's
 * head noun. Neighbours, facets, links and annotations stay in the context for metadata
 * arbitration but are not rendered: they dilute the 64-WordPiece budget without adding role
 * evidence the encoder can use.
 *
 * @param context
 */
export function serializeFieldContextV3(context: FieldContextV3): string {
    if (context.inputFormat !== 'v3') {
        throw new TypeError('FieldContextV3 inputFormat must be v3');
    }
    const compact = (value: string, length: number): string =>
        value
            .replace(/[|;\s]+/gu, ' ')
            .trim()
            .slice(0, length);
    const structure = [
        context.primitiveType,
        ...(context.isKey ? ['key'] : []),
        ...(context.nullable ? [] : ['required'])
    ].join(', ');
    // The identifier's head noun (its last word) is what a name means: `BookingStatus` is a
    // status, `BookingStatusName` is a name. Mean pooling cannot weigh one token, so the head noun
    // is stated once more as a short clause.
    const propertyWords = identifierWords(context.propertyName);
    const headNoun = propertyWords.split(' ').at(-1)?.toLowerCase();
    return [
        `${compact(propertyWords, 64)} (${structure}) in ${compact(identifierWords(context.entityName), 64)}`,
        ...(context.label ? [`label ${compact(context.label, 48)}`] : []),
        ...(context.dataElement ? [`data element ${compact(identifierWords(context.dataElement), 32)}`] : []),
        ...(context.description ? [compact(context.description, 80)] : []),
        ...(headNoun ? [`a ${headNoun} field`] : [])
    ].join('; ');
}
