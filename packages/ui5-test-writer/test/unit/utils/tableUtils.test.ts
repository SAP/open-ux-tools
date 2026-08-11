import {
    getColumnIdentifier,
    transformTableColumns,
    extractTableColumnsFromNode,
    extractContactCardColumnsFromNode
} from '../../../src/utils/tableUtils.js';
import type { ColumnAggregations } from '../../../src/utils/tableUtils.js';
import type { TreeAggregation } from '@sap/ux-specification/dist/types/src/parser';

describe('getColumnIdentifier()', () => {
    test('returns the bound property path for a plain DataField column', () => {
        const column = {
            schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
        };
        expect(getColumnIdentifier(column, 'DataField::ProductID')).toBe('ProductID');
    });

    test('returns Key entry for a custom column', () => {
        const column = {
            custom: true,
            schema: { keys: [{ name: 'Key', value: 'myCustomCol' }] }
        };
        expect(getColumnIdentifier(column, 'someAggregationKey')).toBe('myCustomCol');
    });

    test('returns undefined when standard column has no Value schema entry and no columnKey', () => {
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
        expect(getColumnIdentifier(column, 'someAggregationKey')).toBeUndefined();
    });

    test('returns the full aggregation key for DataFieldForAnnotation Contact-card columns', () => {
        const column = {
            schema: { keys: [{ name: 'Target', value: '_UserContactCard/Communication.Contact' }] }
        };
        expect(getColumnIdentifier(column, 'DataFieldForAnnotation::_UserContactCard::Contact')).toBe(
            'DataFieldForAnnotation::_UserContactCard::Contact'
        );
    });

    test('returns the full aggregation key for non-Contact DataFieldForAnnotation columns', () => {
        const column = {
            schema: { keys: [{ name: 'Target', value: 'FieldGroup#PostalCodeCity' }] }
        };
        expect(getColumnIdentifier(column, 'DataFieldForAnnotation::FieldGroup::PostalCodeCity')).toBe(
            'DataFieldForAnnotation::FieldGroup::PostalCodeCity'
        );
    });
});

describe('transformTableColumns()', () => {
    test('keys plain DataField columns by the bound property path', () => {
        const columnAggregations: ColumnAggregations = {
            'DataField::ProductID': {
                path: [],
                aggregations: {},
                description: 'Product ID',
                schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
            },
            'DataField::Name': {
                path: [],
                aggregations: {},
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
        const columnAggregations: ColumnAggregations = {
            myCustomCol: {
                path: [],
                aggregations: {},
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
        const columnAggregations: ColumnAggregations = {
            'DataField::ProductID': {
                path: [],
                aggregations: {},
                schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            ProductID: {}
        });
    });

    test('falls back to index as key when a custom column has no Key entry', () => {
        const columnAggregations: ColumnAggregations = {
            myCol: {
                path: [],
                aggregations: {},
                custom: true,
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

    test('keys Contact-card columns by their full aggregation key', () => {
        const columnAggregations: ColumnAggregations = {
            'DataField::TravelID': {
                path: [],
                aggregations: {},
                description: 'Travel ID',
                schema: { keys: [{ name: 'Value', value: 'TravelID' }] }
            },
            'DataFieldForAnnotation::_Agency::Contact': {
                path: [],
                aggregations: {},
                description: 'Agency',
                schema: { keys: [{ name: 'Target', value: '_Agency/Communication.Contact' }] }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            TravelID: { header: 'Travel ID' },
            'DataFieldForAnnotation::_Agency::Contact': { header: 'Agency' }
        });
    });

    test('skips columns whose availability is not Default', () => {
        const columnAggregations: ColumnAggregations = {
            'DataField::TravelID': {
                path: [],
                aggregations: {},
                description: 'Travel ID',
                schema: { keys: [{ name: 'Value', value: 'TravelID' }] }
            },
            myCustomColumn: {
                path: [],
                aggregations: {},
                custom: true,
                description: 'Custom Column',
                schema: { keys: [{ name: 'Key', value: 'myCustomColumn' }] },
                properties: { availability: { value: 'Adaptation' } }
            },
            myHiddenColumn: {
                path: [],
                aggregations: {},
                custom: true,
                description: 'Hidden',
                schema: { keys: [{ name: 'Key', value: 'myHiddenColumn' }] },
                properties: { availability: { value: 'Hidden' } }
            },
            'DataField::Default': {
                path: [],
                aggregations: {},
                description: 'Default',
                schema: { keys: [{ name: 'Value', value: 'Default' }] },
                properties: { availability: { value: 'Default' } }
            }
        };
        expect(transformTableColumns(columnAggregations)).toEqual({
            TravelID: { header: 'Travel ID' },
            Default: { header: 'Default' }
        });
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
            'DataField::ProductID': {
                description: 'Product ID',
                schema: { keys: [{ name: 'Value', value: 'ProductID' }] }
            },
            'DataField::Name': {
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

describe('extractContactCardColumnsFromNode()', () => {
    test('extracts a single Contact column keyed by its aggregation key', () => {
        const node = makeNode({
            'DataField::TravelID': {
                schema: { keys: [{ name: 'Value', value: 'TravelID' }] }
            },
            'DataFieldForAnnotation::_Agency::Contact': {
                schema: { keys: [{ name: 'Target', value: '_Agency/@Communication.Contact' }] }
            }
        });
        expect(extractContactCardColumnsFromNode(node)).toEqual([
            { property: 'DataFieldForAnnotation::_Agency::Contact' }
        ]);
    });

    test('extracts multiple Contact columns and ignores regular columns', () => {
        const node = makeNode({
            'DataField::TravelID': {
                schema: { keys: [{ name: 'Value', value: 'TravelID' }] }
            },
            'DataFieldForAnnotation::_Agency::Contact': {
                schema: { keys: [{ name: 'Target', value: '_Agency/@Communication.Contact' }] }
            },
            'DataFieldForAnnotation::_Customer::Contact': {
                schema: { keys: [{ name: 'Target', value: '_Customer/@Communication.Contact' }] }
            },
            'DataFieldForAnnotation::Status::DataPoint': {
                schema: { keys: [{ name: 'Target', value: 'Status/@UI.DataPoint' }] }
            }
        });
        expect(extractContactCardColumnsFromNode(node)).toEqual([
            { property: 'DataFieldForAnnotation::_Agency::Contact' },
            { property: 'DataFieldForAnnotation::_Customer::Contact' }
        ]);
    });

    test('returns empty array when node has no table aggregation', () => {
        const node = { aggregations: {} } as unknown as TreeAggregation;
        expect(extractContactCardColumnsFromNode(node)).toEqual([]);
    });

    test('returns empty array when table has no columns aggregation', () => {
        const node = {
            aggregations: { table: { aggregations: {} } }
        } as unknown as TreeAggregation;
        expect(extractContactCardColumnsFromNode(node)).toEqual([]);
    });

    test('skips Contact-card columns whose availability is not Default', () => {
        const node = makeNode({
            'DataField::TravelID': {
                schema: { keys: [{ name: 'Value', value: 'TravelID' }] }
            },
            'DataFieldForAnnotation::_Agency::Contact': {
                schema: { keys: [{ name: 'Target', value: '_Agency/@Communication.Contact' }] },
                properties: { availability: { value: 'Adaptation' } }
            },
            'DataFieldForAnnotation::_Customer::Contact': {
                schema: { keys: [{ name: 'Target', value: '_Customer/@Communication.Contact' }] }
            }
        });
        expect(extractContactCardColumnsFromNode(node)).toEqual([
            { property: 'DataFieldForAnnotation::_Customer::Contact' }
        ]);
    });

    test('returns empty array when no columns are Contact-annotated', () => {
        const node = makeNode({
            'DataField::TravelID': {
                schema: { keys: [{ name: 'Value', value: 'TravelID' }] }
            }
        });
        expect(extractContactCardColumnsFromNode(node)).toEqual([]);
    });
});
