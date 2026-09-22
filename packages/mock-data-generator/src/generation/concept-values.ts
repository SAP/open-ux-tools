import { createHash } from 'node:crypto';
import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import type { ConceptBank, JsonValue } from '../types.js';

function hashNumber(value: string): number {
    return createHash('sha256').update(value).digest().readUInt32BE(0);
}

function fitting(values: ReadonlyArray<string>, property: SchemaProperty): ReadonlyArray<string> {
    return property.maxLength === undefined
        ? values
        : values.filter((value) => value.length <= (property.maxLength ?? 0));
}

// A code/text concept writes its text into a column that another column names as its text, or into a
// column wide enough for a description; otherwise the column holds the code.
function holdsText(entity: SchemaEntity, property: SchemaProperty): boolean {
    return entity.properties.some((owner) => owner.links?.text === property.name) || (property.maxLength ?? 0) >= 20;
}

/**
 * A value for a field decided by the classifier's prototype head, taken from its concept's bank.
 * Rows cycle through the bank; the code and text columns of one code/text concept share the same pair
 * in a row, so a row reads coherently. Returns undefined when no bank value fits the column, leaving
 * the field to the typed floor.
 *
 * @param bank concept bank
 * @param entity owning entity
 * @param property field
 * @param rowIndex row being generated
 * @param seed generation seed
 * @returns a value for the cell, or undefined
 */
export function conceptValue(
    bank: ConceptBank,
    entity: SchemaEntity,
    property: SchemaProperty,
    rowIndex: number,
    seed: number
): JsonValue | undefined {
    const rowHash = hashNumber(`${seed}:${entity.entitySetName}:${rowIndex}:concept:${bank.id}`);
    if (bank.valueKind === 'code-text') {
        const pairs = bank.pairs ?? [];
        if (pairs.length === 0) {
            return undefined;
        }
        const pair = pairs[rowHash % pairs.length];
        const value = holdsText(entity, property) ? pair.text : pair.code;
        return property.maxLength === undefined || value.length <= property.maxLength ? value : undefined;
    }
    if (bank.valueKind === 'number' || bank.valueKind === 'decimal') {
        const range = bank.range;
        if (!range) {
            return undefined;
        }
        const fraction = (hashNumber(`${seed}:${entity.entitySetName}:${property.name}:${rowIndex}`) % 10000) / 10000;
        const raw = range.min + fraction * (range.max - range.min);
        const scale = property.primitiveType === 'int' ? 0 : Math.min(range.scale, property.scale ?? range.scale);
        return Number(raw.toFixed(scale));
    }
    const values = fitting(bank.values ?? [], property);
    if (values.length === 0) {
        return undefined;
    }
    return values[hashNumber(`${seed}:${entity.entitySetName}:${property.name}:${rowIndex}`) % values.length];
}
