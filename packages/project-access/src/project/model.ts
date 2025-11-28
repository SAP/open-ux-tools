export function getAggregations(node: any): any {
    if (node && typeof node === 'object') {
        return node.getAggregations();
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

export function getFilterFields(root: any): string[] {
    const filterBar = getAggregations(root)['filterBar'];
    const filterBarAggregations = getAggregations(filterBar);
    const selectionFields = filterBarAggregations['selectionFields'];
    const selectionFieldsAggregations = getAggregations(selectionFields);
    return getSelectionFieldItems(selectionFieldsAggregations);
}
