import { generatedRowFlags } from '../../src/generation/authored.js';
import type { SchemaEntity, SchemaProperty } from '../../src/schema/graph.js';
import type { ExistingMockData, MockDataRow } from '../../src/types.js';

/**
 * An entity of string properties.
 *
 * @param keys names of the key properties
 * @returns the entity
 */
function entity(keys: ReadonlyArray<string>): SchemaEntity {
    return {
        name: 'Note',
        entitySetName: 'Notes',
        properties: ['Code', 'Text'].map((name): SchemaProperty => ({
            name,
            primitiveType: 'string',
            nullable: !keys.includes(name),
            isKey: keys.includes(name),
            annotations: []
        }))
    };
}

const existing: Readonly<Record<string, ExistingMockData>> = {
    Notes: {
        contributor: { present: false },
        initialRows: { source: 'json', present: true, rows: [{ Code: 'B', Text: 'Supplied' }] }
    }
};

describe('generatedRowFlags', () => {
    it('marks the rows carrying a supplied key as the caller’s', () => {
        // Given a keyed entity and one supplied row
        const rows: MockDataRow[] = [{ Code: 'A' }, { Code: 'B' }, { Code: 'C' }];

        // When the rows are classified, Then only the supplied key is the caller's
        expect(generatedRowFlags(entity(['Code']), rows, existing)).toEqual([true, false, true]);
    });

    it('marks the first rows of an entity without keys, as many as were supplied, as the caller’s', () => {
        // Given an entity without keys whose supplied row is published first
        const rows: MockDataRow[] = [{ Code: 'B', Text: 'Supplied' }, { Code: 'X' }, { Code: 'Y' }];

        // When the rows are classified, Then the supplied row is not rewritten as a generated one
        expect(generatedRowFlags(entity([]), rows, existing)).toEqual([false, true, true]);
    });
});
