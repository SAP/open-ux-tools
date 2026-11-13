import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaRelationship } from '../schema/graph.js';
import type { ExistingMockData, JsonValue, MockDataRow } from '../types.js';
import { generatedRowFlags } from './authored.js';
import { fittedText } from './code-texts.js';
import { propertyValueIsValid } from './constraints.js';
import { inFacetForm } from '../spec/facets.js';

/**
 * A field of a referencing entity whose value is a value of the row it references: the text of the referenced
 * thing (`text`), or a property of the referenced row's semantic key repeated beside the reference
 * (`semantic-key`).
 */
export interface ReferencedValueLink {
    relationship: SchemaRelationship;
    kind: 'text' | 'semantic-key';
    /** The field of the referencing (source) entity. */
    sourceField: string;
    /** The field of the referenced (target) entity. */
    targetField: string;
}

/**
 * The name of the local text field of a property: its text link when that names a property of the same
 * entity, not a navigation path.
 *
 * @param entity schema entity
 * @param propertyName property name
 * @returns the text field name, or undefined
 */
function localText(entity: SchemaEntity, propertyName: string): string | undefined {
    const text = entity.properties.find(({ name }) => name === propertyName)?.links?.text;
    return text && text !== propertyName && entity.properties.some(({ name }) => name === text) ? text : undefined;
}

const linkCache = new WeakMap<SchemaGraph, ReadonlyArray<ReferencedValueLink>>();

/**
 * Whether a text field is the text of a key of its own entity other than the given property: it then names
 * the row itself, so it is not the text of a reference too (CAP gives a foreign key the text annotation of
 * the key it references, which in a self-reference names the row's own text field).
 *
 * @param entity schema entity
 * @param text the text field name
 * @param propertyName the referencing property
 * @returns true when another key of the entity has this text
 */
function namesOwnRow(entity: SchemaEntity, text: string, propertyName: string): boolean {
    return entity.properties.some(({ isKey, name, links }) => isKey && name !== propertyName && links?.text === text);
}

/**
 * The text links of one relationship: it maps a property that has a text field (`Common.Text`, `sap:text`)
 * to a property of the target that has one too, so both texts name the same referenced thing. A text field
 * that names the referencing row itself is no link.
 *
 * @param relationship the relationship
 * @param source the referencing entity
 * @param target the referenced entity
 * @returns the links
 */
function textLinks(
    relationship: SchemaRelationship,
    source: SchemaEntity,
    target: SchemaEntity
): ReferencedValueLink[] {
    return relationship.mappings.flatMap(({ sourceProperty, targetProperty }) => {
        const sourceField = localText(source, sourceProperty);
        const targetField = localText(target, targetProperty);
        return sourceField && targetField && !namesOwnRow(source, sourceField, sourceProperty)
            ? [{ relationship, kind: 'text' as const, sourceField, targetField }]
            : [];
    });
}

/**
 * The semantic-key links of one relationship: the referenced entity declares a semantic key, and the
 * referencing entity repeats a property of it under the same name and type without the relationship mapping
 * it (a business identifier beside a technical reference).
 *
 * @param relationship the relationship
 * @param source the referencing entity
 * @param target the referenced entity
 * @param mappedEnds the properties of the referencing entity some relationship maps
 * @returns the links
 */
function semanticKeyLinks(
    relationship: SchemaRelationship,
    source: SchemaEntity,
    target: SchemaEntity,
    mappedEnds: ReadonlySet<string>
): ReferencedValueLink[] {
    return (target.semanticKey ?? []).flatMap((name) => {
        const repeated = source.properties.find((property) => property.name === name);
        const declared = target.properties.find((property) => property.name === name);
        return repeated &&
            declared &&
            !repeated.isKey &&
            !mappedEnds.has(name) &&
            repeated.primitiveType === declared.primitiveType
            ? [{ relationship, kind: 'semantic-key' as const, sourceField: name, targetField: name }]
            : [];
    });
}

/**
 * The fields whose value is a value of the row a relationship references: texts naming the referenced thing and
 * repeated semantic-key properties. The most direct reference wins when several reach one field.
 *
 * @param graph service schema
 * @returns one link per referencing field
 */
export function referencedValueLinks(graph: SchemaGraph): ReadonlyArray<ReferencedValueLink> {
    const cached = linkCache.get(graph);
    if (cached) {
        return cached;
    }
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const mappedEnds = new Map<string, Set<string>>();
    for (const relationship of graph.relationships) {
        const ends = mappedEnds.get(relationship.fromEntitySet) ?? new Set<string>();
        relationship.mappings.forEach(({ sourceProperty }) => ends.add(sourceProperty));
        mappedEnds.set(relationship.fromEntitySet, ends);
    }
    const byField = new Map<string, ReferencedValueLink>();
    for (const relationship of graph.relationships) {
        const source = entities.get(relationship.fromEntitySet);
        const target = entities.get(relationship.toEntitySet);
        if (!source || !target) {
            continue;
        }
        const candidates = [
            ...textLinks(relationship, source, target),
            ...semanticKeyLinks(relationship, source, target, mappedEnds.get(relationship.fromEntitySet) ?? new Set())
        ];
        for (const link of candidates) {
            const key = `${relationship.fromEntitySet}.${link.sourceField}`;
            const kept = byField.get(key);
            if (kept === undefined || relationship.mappings.length < kept.relationship.mappings.length) {
                byField.set(key, link);
            }
        }
    }
    const links = Object.freeze([...byField.values()]);
    linkCache.set(graph, links);
    return links;
}

/**
 * Whether a cell holds a text.
 *
 * @param value cell value
 * @returns true for a non-empty string
 */
function isText(value: JsonValue | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * The JSON of a row's values for the given properties, as a lookup key.
 *
 * @param row the row
 * @param properties the properties
 * @returns the key
 */
function tupleKey(row: MockDataRow, properties: ReadonlyArray<string>): string {
    return JSON.stringify(properties.map((property) => row[property] ?? null));
}

/**
 * A value as a field can hold it: a text cut to the field's length, a string in the form the field's facets
 * give, any other value only when the field accepts it as it is.
 *
 * @param property the field
 * @param value the value
 * @param kind what the value is
 * @returns the value to write, or undefined when the field rejects it
 */
function fittedValue(
    property: SchemaProperty,
    value: JsonValue,
    kind: ReferencedValueLink['kind']
): JsonValue | undefined {
    if (kind === 'text') {
        const fitted = typeof value === 'string' ? fittedText(property, value) : undefined;
        return fitted === undefined ? undefined : inFacetForm(property, fitted);
    }
    const formed = typeof value === 'string' ? inFacetForm(property, value) : value;
    return formed !== undefined && propertyValueIsValid(property, formed) ? formed : undefined;
}

/** What aligning referenced values reads. */
export interface ReferencedValueAlignment {
    graph: SchemaGraph;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Properties that another step fixed, by entity set: never written. */
    fixedProperties?: ReadonlyMap<string, ReadonlySet<string>>;
    /**
     * Properties on either side of a value list, by entity set: owner fields it pairs with value-help columns,
     * and those columns. The value list decides them, so a reference never rewrites them; the referenced row
     * takes such a text instead.
     */
    listedProperties?: ReadonlyMap<string, ReadonlySet<string>>;
    /**
     * Whether a referenced row without a text takes the text of the first generated row that references it,
     * so a text some tier wrote is kept rather than replaced by nothing.
     */
    fillReferenced: boolean;
}

/** The rows after alignment and the properties written, by entity set. */
export interface ReferencedValueResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    written: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * Make every referencing field the value of the row it references, repeated until nothing changes so chains end at the
 * owner. Supplied rows, fixed properties, fields a value list decides and references that select no single row keep
 * their values.
 *
 * @param input the rows and what is fixed
 * @returns the rows and the properties written
 */
export function alignReferencedValues(input: ReferencedValueAlignment): ReferencedValueResult {
    const { graph, existingData, fixedProperties, listedProperties } = input;
    const listed = (entitySet: string, property: string): boolean =>
        Boolean(listedProperties?.get(entitySet)?.has(property));
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const output: Record<string, MockDataRow[]> = Object.fromEntries(
        Object.entries(input.resources).map(([entitySet, rows]) => [entitySet, [...rows]])
    );
    const written = new Map<string, Set<string>>();
    const writableRows = (entitySet: string, property: string): ReadonlyArray<boolean> => {
        const entity = entities.get(entitySet);
        const rows = output[entitySet] ?? [];
        if (!entity || fixedProperties?.get(entitySet)?.has(property)) {
            return rows.map(() => false);
        }
        return generatedRowFlags(entity, rows, existingData);
    };
    const write = (
        entitySet: string,
        index: number,
        property: string,
        value: JsonValue,
        kind: ReferencedValueLink['kind']
    ): boolean => {
        const target = entities.get(entitySet)?.properties.find(({ name }) => name === property);
        const fitted = target === undefined ? undefined : fittedValue(target, value, kind);
        const rows = output[entitySet];
        if (fitted === undefined || rows?.[index] === undefined || rows[index][property] === fitted) {
            return false;
        }
        rows[index] = Object.freeze({ ...rows[index], [property]: fitted });
        written.set(entitySet, (written.get(entitySet) ?? new Set()).add(property));
        return true;
    };
    const apply = ({ relationship, kind, sourceField, targetField }: ReferencedValueLink): boolean => {
        const sourceKeys = relationship.mappings.map(({ sourceProperty }) => sourceProperty);
        const targetKeys = relationship.mappings.map(({ targetProperty }) => targetProperty);
        const sourceRows = output[relationship.fromEntitySet] ?? [];
        const targetRows = output[relationship.toEntitySet] ?? [];
        const targetIndex = new Map<string, number[]>();
        targetRows.forEach((row, index) => {
            const key = tupleKey(row, targetKeys);
            targetIndex.set(key, [...(targetIndex.get(key) ?? []), index]);
        });
        const referenced = sourceRows.map((row) => {
            const matches = targetIndex.get(tupleKey(row, sourceKeys));
            return matches?.length === 1 ? matches[0] : undefined;
        });
        const sourceWritable = writableRows(relationship.fromEntitySet, sourceField);
        const sourceListed = listed(relationship.fromEntitySet, sourceField);
        let changed = false;
        if ((input.fillReferenced || sourceListed) && kind === 'text') {
            const targetWritable = listed(relationship.toEntitySet, targetField)
                ? targetRows.map(() => false)
                : writableRows(relationship.toEntitySet, targetField);
            sourceRows.forEach((row, index) => {
                const target = referenced[index];
                const text = row[sourceField];
                if (
                    sourceWritable[index] &&
                    target !== undefined &&
                    targetWritable[target] &&
                    isText(text) &&
                    (sourceListed || !isText(targetRows[target]?.[targetField]))
                ) {
                    changed = write(relationship.toEntitySet, target, targetField, text, kind) || changed;
                }
            });
        }
        if (sourceListed) {
            return changed;
        }
        sourceRows.forEach((_row, index) => {
            const target = referenced[index];
            const value = target === undefined ? undefined : targetRows[target]?.[targetField];
            const copies = kind === 'text' ? isText(value) : value !== undefined && value !== null;
            if (sourceWritable[index] && copies && value !== undefined) {
                changed = write(relationship.fromEntitySet, index, sourceField, value, kind) || changed;
            }
        });
        return changed;
    };
    const links = referencedValueLinks(graph);
    for (let pass = 0; pass <= links.length; pass++) {
        const changed = links.map(apply).some(Boolean);
        if (!changed) {
            break;
        }
    }
    return {
        resources: Object.freeze(
            Object.fromEntries(Object.entries(output).map(([entitySet, rows]) => [entitySet, Object.freeze(rows)]))
        ),
        written
    };
}
