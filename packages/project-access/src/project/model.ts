export function getListReportPage(pages: Record<string, any>): any {
    for (const pageKey in pages) {
        const page = pages[pageKey] as Record<string, any>;
        if (page.pageType === 'ListReport') {
            return page;
        }
    }
    return null;
}

export function getObjectPages(pages: Record<string, any>): any[] {
    const objectPages: any[] = [];
    for (const pageKey in pages) {
        const page = pages[pageKey] as Record<string, any>;
        if (page.pageType === 'ObjectPage') {
            objectPages.push(page);
        }
    }
    return objectPages;
}

export function getAggregations(node: any): any {
    if (node && typeof node === 'object' && 'aggregations' in node) {
        return node.aggregations;
    }
    return {};
}

export function getSelectionFieldItems(selectionFieldsAgg: any): any[] {
    if (selectionFieldsAgg && typeof selectionFieldsAgg === 'object') {
        const items: string[] = [];
        for (const itemKey in selectionFieldsAgg) {
            items.push(selectionFieldsAgg[itemKey].description);
        }
        return items;
    }
    return [];
}

export function getFilterFields(model: { root: any }): string[] {
    const root = model.root;
    const filterBar = getAggregations(root)['filterBar'];
    const filterBarAggregations = getAggregations(filterBar);
    const selectionFields = filterBarAggregations['selectionFields'];
    const selectionFieldsAggregations = getAggregations(selectionFields);
    return getSelectionFieldItems(selectionFieldsAggregations);
}

export function getTableColumns(model: { root: any }): Record<string, any> {
    const root = model.root;
    const table = getAggregations(root)['table'];
    const tableAggregations = getAggregations(table);
    const columns = tableAggregations['columns'];
    const columnAggregations = getAggregations(columns);
    return columnAggregations;
}
