import type { TreeAggregation, TreeAggregations } from '@sap/ux-specification/dist/types/src/parser/index.js';
import { getAggregations, parseDataFieldForAnnotationName } from './modelUtils.js';
import type { ContactCardField, TableColumn, TableColumnFeatureData } from '../types.js';

type ColumnModelItem = {
    custom?: boolean;
    description?: string;
    schema: { keys: { name: string; value: string }[] };
    properties?: { availability?: { value?: string } };
};

export type ColumnAggregations = TreeAggregations & {
    [key: string]: ColumnModelItem;
};

/**
 * Returns true when the column is rendered in the table by default. Columns flagged as `Adaptation`
 * (only reachable via end-user table settings) or `Hidden` are excluded from generated assertions.
 *
 * @param column - column item from ux specification
 * @returns true if the column is shown by default; false for Adaptation/Hidden columns
 */
function isDefaultAvailableColumn(column: ColumnModelItem): boolean {
    const availability = column.properties?.availability?.value;
    return availability === undefined || availability === 'Default';
}

/**
 * Gets the identifier of a column for OPA5 tests, matching the rendered MDC column's `propertyKey`.
 * Custom columns use the `Key` schema entry; standard columns use the `Value` schema entry; for
 * annotation-driven entries that carry no `Value` (e.g. Contact-card columns), the column aggregation
 * key is used.
 *
 * @param column - column item from ux specification
 * @param columnKey - aggregation key of the column in its parent `columns` aggregation
 * @returns identifier of the column for OPA5 tests; undefined if no identifier can be determined
 */
export function getColumnIdentifier(column: ColumnModelItem, columnKey?: string): string | undefined {
    const schemaKeyName = column.custom ? 'Key' : 'Value';
    return column.schema.keys.find((k) => k.name === schemaKeyName)?.value ?? (column.custom ? undefined : columnKey);
}

/**
 * Transforms column aggregations from the ux specification model into a map of columns for OPA5 tests.
 *
 * @param columnAggregations - column aggregations from the ux specification model
 * @returns a map of column identifiers to column state objects for use with iCheckColumns()
 */
export function transformTableColumns(columnAggregations: ColumnAggregations): TableColumnFeatureData {
    const columns: TableColumnFeatureData = {};
    Object.entries(columnAggregations).forEach(([columnKey, column], index) => {
        if (!isDefaultAvailableColumn(column)) {
            return;
        }
        const id = getColumnIdentifier(column, columnKey) ?? String(index);
        const state: TableColumn = {};
        if (column.description) {
            state['header'] = column.description;
        }
        columns[id] = state;
    });
    return columns;
}

/**
 * Resolves the table node that actually carries `columns`/`toolBar` aggregations.
 * Single-table List Reports and Object Page sections expose these directly under `table`.
 * Multi-view List Reports nest one table node per tab under `table.views[key]`; the first
 * non-empty (non-custom) view node is returned, matching the default table tab.
 *
 * @param node - tree aggregation node that exposes a 'table' aggregation
 * @returns the table node holding column/toolbar aggregations, or undefined if none is found
 */
export function resolvePrimaryTableNode(node: TreeAggregation): TreeAggregation | undefined {
    const tableAggregation = getAggregations(node)['table'];
    if (!tableAggregation) {
        return undefined;
    }
    const tableChildren = getAggregations(tableAggregation);
    if (tableChildren['columns']) {
        return tableAggregation;
    }
    // Multi-view List Report: per-tab nodes live under `views`; return the first with columns, else undefined.
    const views = tableChildren['views'];
    if (!views) {
        return undefined;
    }
    const viewNodes = getAggregations(views);
    for (const key of Object.keys(viewNodes)) {
        const viewNode = viewNodes[key] as TreeAggregation;
        if (getAggregations(viewNode)['columns']) {
            return viewNode;
        }
    }
    return undefined;
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
    const tableNode = resolvePrimaryTableNode(node);
    if (!tableNode) {
        return {};
    }
    const columnsAggregation = getAggregations(tableNode)['columns'];
    if (!columnsAggregation) {
        return {};
    }
    const columnItems = getAggregations(columnsAggregation);
    return transformTableColumns(columnItems as ColumnAggregations);
}

/**
 * Extracts Contact-card columns from a spec model node that contains a 'table' aggregation.
 *
 * @param node - tree aggregation node that exposes a 'table' aggregation
 * @returns array of Contact-card field descriptors for use with iClickLink/iCheckLink
 */
export function extractContactCardColumnsFromNode(node: TreeAggregation): ContactCardField[] {
    const tableNode = resolvePrimaryTableNode(node);
    if (!tableNode) {
        return [];
    }
    const columnsAggregation = getAggregations(tableNode)['columns'];
    if (!columnsAggregation) {
        return [];
    }
    const columnItems = getAggregations(columnsAggregation) as ColumnAggregations;
    const contactColumns: ContactCardField[] = [];
    Object.entries(columnItems).forEach(([columnKey, column]) => {
        const parsed = parseDataFieldForAnnotationName(columnKey);
        if (parsed?.targetAnnotation === 'Contact' && isDefaultAvailableColumn(column)) {
            contactColumns.push({ property: columnKey });
        }
    });
    return contactColumns;
}
