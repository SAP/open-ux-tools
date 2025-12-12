import type {
    ApplicationModel,
    TreeAggregations,
    TreeAggregation,
    TreeModel
} from '@sap/ux-specification/dist/types/src/parser';

export interface AggregationItem extends TreeAggregation {
    description: string;
}

/**
 * Retrieves all List Report definitions from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of List Report definitions.
 */
export function getListReportPage<T = ApplicationModel['pages'][string]>(applicationModel: ApplicationModel): T | null {
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === 'ListReport') {
            return page as T;
        }
    }
    return null;
}

/**
 * Retrieves all Object Page definitions from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of Object Page definitions.
 */
export function getObjectPages<T = ApplicationModel['pages'][string]>(applicationModel: ApplicationModel): T[] {
    const objectPages: T[] = [];
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === 'ObjectPage') {
            objectPages.push(page as T);
        }
    }
    return objectPages;
}

/**
 * Retrieves the aggregations from the given tree aggregations node.
 *
 * @param node - The tree aggregations node.
 * @returns The aggregations object.
 */
export function getAggregations(node: TreeAggregation): TreeAggregations {
    if (node && typeof node === 'object' && 'aggregations' in node) {
        return node.aggregations;
    }
    return {} as TreeAggregations;
}

/**
 * Retrieves selection field items from the given selection fields aggregation.
 *
 * @param selectionFieldsAgg - The selection fields aggregation containing field definitions.
 * @returns An array of selection field descriptions.
 */
export function getSelectionFieldItems(selectionFieldsAgg: TreeAggregations): string[] {
    if (selectionFieldsAgg && typeof selectionFieldsAgg === 'object') {
        const items: string[] = [];
        for (const itemKey in selectionFieldsAgg) {
            items.push(
                (selectionFieldsAgg[itemKey as keyof TreeAggregation] as unknown as AggregationItem).description
            );
        }
        return items;
    }
    return [];
}

/**
 * Retrieves filter field descriptions from the given tree model.
 *
 * @param pageModel - The tree model containing filter bar definitions.
 * @returns An array of filter field descriptions.
 */
export function getFilterFields(pageModel: TreeModel): string[] {
    const filterBar = getAggregations(pageModel.root)['filterBar'];
    const filterBarAggregations = getAggregations(filterBar);
    const selectionFields = filterBarAggregations['selectionFields'];
    const selectionFieldsAggregations = getAggregations(selectionFields);
    return getSelectionFieldItems(selectionFieldsAggregations);
}

/**
 * Retrieves the table columns aggregation from the given tree model.
 *
 * @param pageModel - The tree model containing table column definitions.
 * @returns The table columns aggregation object.
 */
export function getTableColumns(pageModel: TreeModel): TreeAggregations {
    const table = getAggregations(pageModel.root)['table'];
    const tableAggregations = getAggregations(table);
    const columns = tableAggregations['columns'];
    const columnAggregations = getAggregations(columns);
    return columnAggregations;
}
