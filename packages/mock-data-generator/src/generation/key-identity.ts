import type { PrimitiveType, SchemaEntity, SchemaGraph } from '../schema/graph.js';
import { DRAFT_KEY_PROPERTY_NAMES } from '../spec/draft.js';
import { isNameForm } from './code-texts.js';
import { relationshipEndNames } from './rows.js';

/** Key types whose allocated values identify a row by themselves: a running integer or a UUID. */
const IDENTIFYING_KEY_TYPES: ReadonlySet<PrimitiveType> = new Set(['int', 'guid']);

/** Key types that hold a measure, a flag or a point in time rather than an identifier. */
const DESCRIPTIVE_KEY_TYPES: ReadonlySet<PrimitiveType> = new Set([
    'decimal',
    'bool',
    'date',
    'datetime',
    'datetimeoffset',
    'time'
]);

/**
 * The key properties of an entity that describe a row rather than identify it, such as the name and price columns of a
 * view keyed by every column. Once an integer or UUID key column identifies every row, decimal, boolean, date, time and
 * name-form key columns take values from their meaning; draft keys are never descriptive.
 *
 * @param graph the schema graph, whose relationships fix the columns they map
 * @param entity the entity
 * @returns the names of the descriptive key properties, empty when the key has no identifying column
 */
export function descriptiveKeyNames(graph: SchemaGraph, entity: SchemaEntity): ReadonlySet<string> {
    const keys = entity.properties.filter((property) => property.isKey);
    if (keys.length < 2) {
        return new Set();
    }
    const relationshipEnds = relationshipEndNames(graph, entity);
    // Draft keys follow the draft protocol, so they keep their own values.
    const free = keys.filter(
        (property) =>
            property.enumValues === undefined &&
            !relationshipEnds.has(property.name) &&
            !DRAFT_KEY_PROPERTY_NAMES.has(property.name.toLowerCase())
    );
    if (!free.some((property) => IDENTIFYING_KEY_TYPES.has(property.primitiveType))) {
        return new Set();
    }
    return new Set(
        free
            .filter(
                (property) =>
                    DESCRIPTIVE_KEY_TYPES.has(property.primitiveType) ||
                    (property.primitiveType === 'string' && isNameForm(property))
            )
            .map(({ name }) => name)
    );
}
