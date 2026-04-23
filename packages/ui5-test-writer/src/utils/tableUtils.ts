import type { TreeAggregation } from '@sap/ux-specification/dist/types/src/parser';
import { getAggregations } from './modelUtils';

type ColumnSpec = {
    custom?: boolean;
    description?: string;
    schema: { keys: { name: string; value: string }[] };
};

/**
 * Gets the identifier of a column for OPA5 tests.
 * Custom columns use the 'Key' entry; standard columns use the 'Value' entry from the schema keys.
 *
 * @param column - column item from ux specification
 * @returns identifier of the column for OPA5 tests; undefined if no matching key entry is found
 */
export function getColumnIdentifier(column: ColumnSpec): string | undefined {
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
export function transformTableColumns(
    columnAggregations: Record<string, ColumnSpec>
): Record<string, Record<string, string | number | boolean>> {
    const columns: Record<string, Record<string, string | number | boolean>> = {};
    Object.values(columnAggregations).forEach((col, index) => {
        const id = getColumnIdentifier(col) ?? String(index);
        const state: Record<string, string | number | boolean> = {};
        if (col.description) {
            state['header'] = col.description;
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
export function extractTableColumnsFromNode(
    node: TreeAggregation
): Record<string, Record<string, string | number | boolean>> {
    const tableAggregation = getAggregations(node)['table'];
    if (!tableAggregation) {
        return {};
    }
    const columnsAggregation = getAggregations(tableAggregation)['columns'];
    const columnItems = getAggregations(columnsAggregation);
    return transformTableColumns(columnItems as unknown as Record<string, ColumnSpec>);
}
