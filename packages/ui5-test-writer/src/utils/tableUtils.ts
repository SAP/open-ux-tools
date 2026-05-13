import type { TreeAggregation, TreeAggregations } from '@sap/ux-specification/dist/types/src/parser/index.js';
import { getAggregations } from './modelUtils.js';
import type { TableColumn, TableColumnFeatureData } from '../types.js';

type ColumnModelItem = {
    custom?: boolean;
    description?: string;
    schema: { keys: { name: string; value: string }[] };
};

export type ColumnAggregations = TreeAggregations & {
    [key: string]: ColumnModelItem;
};

/**
 * Gets the identifier of a column for OPA5 tests.
 * Custom columns use the 'Key' entry; standard columns use the 'Value' entry from the schema keys.
 *
 * @param column - column item from ux specification
 * @returns identifier of the column for OPA5 tests; undefined if no matching key entry is found
 */
export function getColumnIdentifier(column: ColumnModelItem): string | undefined {
    const key = column.custom ? 'Key' : 'Value';
    return column.schema.keys.find((k) => k.name === key)?.value;
}

/**
 * Transforms column aggregations from the ux specification model into a map of columns for OPA5 tests.
 * Each column entry includes the column header label for display verification.
 *
 * @param columnAggregations - column aggregations from the ux specification model
 * @returns a map of column identifiers to column state objects for use with iCheckColumns()
 */
export function transformTableColumns(columnAggregations: ColumnAggregations): TableColumnFeatureData {
    const columns: TableColumnFeatureData = {};
    Object.values(columnAggregations).forEach((column, index) => {
        const id = getColumnIdentifier(column) ?? String(index);
        const state: TableColumn = {};
        if (column.description) {
            state['header'] = column.description;
        }
        columns[id] = state;
    });
    return columns;
}

/**
 * Extracts table column data from a spec model node that contains a 'table' aggregation.
 * Covers both page-level nodes (List Report, FPM) via their root and section-level nodes
 * (Object Page body sections) — both are TreeAggregation nodes that expose a 'table' aggregation.
 *
 * @param node - tree aggregation node that exposes a 'table' aggregation
 * @returns a map of column identifiers to column state objects for use with iCheckColumns()
 */
export function extractTableColumnsFromNode(node: TreeAggregation): TableColumnFeatureData {
    const tableAggregation = getAggregations(node)['table'];
    if (!tableAggregation) {
        return {};
    }
    const columnsAggregation = getAggregations(tableAggregation)['columns'];
    if (!columnsAggregation) {
        return {};
    }
    const columnItems = getAggregations(columnsAggregation);
    return transformTableColumns(columnItems as ColumnAggregations);
}
