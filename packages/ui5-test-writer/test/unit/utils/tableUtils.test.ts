import { getColumnIdentifier, transformTableColumns, extractTableColumnsFromNode } from '../../../src/utils/tableUtils';
import type { TreeAggregation } from '@sap/ux-specification/dist/types/src/parser';

describe('getColumnIdentifier()', () => {
    test('returns Value key for a standard column', () => {
        const column = {
            schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
        };
        expect(getColumnIdentifier(column)).toBe('ProductID');
    });

    test('returns Key entry for a custom column', () => {
        const column = {
            custom: true,
            schema: { keys: [{ name: 'Key', value: 'myCustomCol' }] }
        };
        expect(getColumnIdentifier(column)).toBe('myCustomCol');
    });

    test('returns undefined when standard column has no Value key', () => {
        const column = {
            schema: { keys: [{ name: 'Label', value: 'Something' }] }
        };
        expect(getColumnIdentifier(column)).toBeUndefined();
    });

    test('returns undefined when custom column has no Key entry', () => {
        const column = {
            custom: true,
            schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
        };
        expect(getColumnIdentifier(column)).toBeUndefined();
    });
});

describe('transformTableColumns()', () => {
    test('maps standard columns using Value key with header from description', () => {
        const columnAggregations = {
            'ProductID::col': {
                description: 'Product ID',
                schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
            },
            'Name::col': {
                description: 'Name',
                schema: { keys: [{ name: 'Value', value: 'Name' }] }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            ProductID: { header: 'Product ID' },
            Name: { header: 'Name' }
        });
    });

    test('maps custom column using Key entry', () => {
        const columnAggregations = {
            myCustomCol: {
                custom: true,
                description: 'Custom Col',
                schema: { keys: [{ name: 'Key', value: 'customColumn1' }] }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            customColumn1: { header: 'Custom Col' }
        });
    });

    test('omits header when description is absent', () => {
        const columnAggregations = {
            'ProductID::col': {
                schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            ProductID: {}
        });
    });

    test('falls back to index as key when identifier cannot be determined', () => {
        const columnAggregations = {
            unknownCol: {
                description: 'Unknown',
                schema: { keys: [{ name: 'Label', value: 'something' }] }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            '0': { header: 'Unknown' }
        });
    });

    test('returns empty object for empty input', () => {
        expect(transformTableColumns({})).toEqual({});
    });
});

function makeNode(columnItems: Record<string, unknown>): TreeAggregation {
    return {
        aggregations: {
            table: {
                aggregations: {
                    columns: {
                        aggregations: columnItems
                    }
                }
            }
        }
    } as unknown as TreeAggregation;
}

describe('extractTableColumnsFromNode()', () => {
    test('extracts columns from a node with a table aggregation', () => {
        const node = makeNode({
            'ProductID::col': {
                description: 'Product ID',
                schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
            },
            'Name::col': {
                description: 'Name',
                schema: { keys: [{ name: 'Value', value: 'Name' }] }
            }
        });
        expect(extractTableColumnsFromNode(node)).toEqual({
            ProductID: { header: 'Product ID' },
            Name: { header: 'Name' }
        });
    });

    test('extracts a custom column from a node', () => {
        const node = makeNode({
            myCol: {
                custom: true,
                description: 'Custom Col',
                schema: { keys: [{ name: 'Key', value: 'customColumn1' }] }
            }
        });
        expect(extractTableColumnsFromNode(node)).toEqual({
            customColumn1: { header: 'Custom Col' }
        });
    });

    test('returns empty object when node has no table aggregation', () => {
        const node = { aggregations: {} } as unknown as TreeAggregation;
        expect(extractTableColumnsFromNode(node)).toEqual({});
    });

    test('returns empty object when table has no columns aggregation', () => {
        const node = {
            aggregations: { table: { aggregations: {} } }
        } as unknown as TreeAggregation;
        expect(extractTableColumnsFromNode(node)).toEqual({});
    });
});
