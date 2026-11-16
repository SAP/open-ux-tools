import type { SchemaEntity, SchemaGraph, SchemaProperty } from './graph.js';

/** Where a field takes its values from: a collection and the column of it that holds them. */
interface ValueSource {
    collection: string;
    column: string;
}

/**
 * The collection a field takes its values from through its own value list: the list's parameter that maps the
 * field itself, in or out.
 *
 * @param field the field
 * @returns the collection and its column, or undefined when the field has no such value list
 */
function ownValueSource(field: SchemaProperty): ValueSource | undefined {
    const collection = field.links?.valueListCollection;
    const parameter = field.links?.valueListParameters?.find(
        ({ direction, localProperty, valueListProperty }) =>
            (direction === 'InOut' || direction === 'Out') &&
            localProperty === field.name &&
            valueListProperty !== undefined
    );
    return collection !== undefined && parameter?.valueListProperty !== undefined
        ? { collection, column: parameter.valueListProperty }
        : undefined;
}

/**
 * The value-help columns that feed a field taking its values from another collection, with that collection: an owner
 * field with a value list of its own, which another value list of the same entity also writes from one of its columns.
 *
 * @param entity the owner entity
 * @returns per value-help collection and column, the sources found for it
 */
function feedingColumns(entity: SchemaEntity): Array<{ collection: string; column: string; source: ValueSource }> {
    const sources = new Map(
        entity.properties.flatMap((field) => {
            const source = ownValueSource(field);
            return source ? [[field.name, source] as const] : [];
        })
    );
    return entity.properties.flatMap((owner) => {
        const collection = owner.links?.valueListCollection;
        return (owner.links?.valueListParameters ?? []).flatMap(({ direction, localProperty, valueListProperty }) => {
            const source = localProperty === undefined ? undefined : sources.get(localProperty);
            return collection !== undefined &&
                (direction === 'InOut' || direction === 'Out') &&
                localProperty !== owner.name &&
                valueListProperty !== undefined &&
                source !== undefined &&
                source.collection !== collection
                ? [{ collection, column: valueListProperty, source }]
                : [];
        });
    });
}

/**
 * Give a value-help column the value list of the field it feeds. When a value list copies one of its columns into an
 * owner field that takes its values from another collection through a value list of its own, the column must hold
 * values of that collection too, or no value-help row can agree with both lists. A column with a value list of its
 * own, of another type, or that two sources claim differently is left as declared.
 *
 * @param graph the parsed schema
 * @returns the schema, with the derived value lists
 */
export function withDerivedValueHelpLinks(graph: SchemaGraph): SchemaGraph {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const derived = new Map<string, ValueSource | null>();
    for (const { collection, column, source } of graph.entities.flatMap(feedingColumns)) {
        const key = `${collection}\u0000${column}`;
        const known = derived.get(key);
        const conflicting =
            known === null ||
            (known !== undefined && (known.collection !== source.collection || known.column !== source.column));
        derived.set(key, conflicting ? null : source);
    }
    let changed = false;
    const linked = graph.entities.map((entity) => {
        const properties = entity.properties.map((column) => {
            const source = derived.get(`${entity.entitySetName}\u0000${column.name}`);
            const sourceColumn = source
                ? entities.get(source.collection)?.properties.find(({ name }) => name === source.column)
                : undefined;
            if (
                !source ||
                !sourceColumn ||
                source.collection === entity.entitySetName ||
                column.links?.valueListCollection !== undefined ||
                column.primitiveType !== sourceColumn.primitiveType
            ) {
                return column;
            }
            changed = true;
            return {
                ...column,
                links: {
                    ...column.links,
                    valueListCollection: source.collection,
                    valueListParameters: [
                        { direction: 'InOut' as const, localProperty: column.name, valueListProperty: source.column }
                    ]
                }
            };
        });
        return properties.some((property, index) => property !== entity.properties[index])
            ? { ...entity, properties }
            : entity;
    });
    return changed ? { ...graph, entities: linked } : graph;
}
