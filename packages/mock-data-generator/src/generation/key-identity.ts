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
 * The key properties of an entity that describe a row rather than identify it. A view often declares every
 * column as part of its key (a product's name, unit price and discount next to the product's number); the
 * key is unique as a tuple, so once one key column identifies every row by itself, the others need no
 * allocated values: decimals, booleans, dates and times take the values their meaning gives them, as non-key
 * fields do; a name-form string keeps its allocated value as a floor, since a key cell is never left empty,
 * and the model tier may replace it: a name role never routes a key, so the model is offered the column.
 *
 * A column identifies the rows when it is an integer or UUID key that no relationship or enumeration
 * fixes, so the allocator gives every row its own value. Draft keys are never descriptive. A column describes the row when it is a decimal,
 * boolean, date or time, or a string in name form, and no relationship or enumeration fixes it either.
 * Without an identifying column every key column keeps its allocated value.
 *
 * @param graph the schema graph, whose relationships fix the columns they map
 * @param entity the entity
 * @returns the names of the descriptive key properties, empty when the key has no identifying column
 * @example
 * // A view keyed by (ProductID: int, ProductName: string, UnitPrice: decimal) without relationships
 * descriptiveKeyNames(graph, view); // Set { 'ProductName', 'UnitPrice' }
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
