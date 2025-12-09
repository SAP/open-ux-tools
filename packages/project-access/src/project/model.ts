// TODO replace custom types with 'official' imported type from ux-specification when available
type UxSpecModelNode = {
    aggregations: Record<string, UxSpecModelNode>;
    [key: string]: any;
};

type PageModel = UxSpecModelNode & {
    pageType: string;
    root: UxSpecModelNode;
    [key: string]: any;
};

export type ApplicationSpecification = {
    applicationModel: {
        pages: Record<string, PageModel>;
    };
    [key: string]: any;
};

/**
 * Gets the model of ListReport page from the ux specification.
 *
 * @param applicationSpecification ux specification
 * @returns page of ListReport type
 */
export function getListReportPage(applicationSpecification: ApplicationSpecification): PageModel | null {
    for (const pageKey in applicationSpecification.applicationModel.pages) {
        const page = applicationSpecification.applicationModel.pages[pageKey];
        if (page.pageType === 'ListReport') {
            return page;
        }
    }
    return null;
}

/**
 * Gets the model of all ObjectPage pages from the ux specification.
 *
 * @param applicationSpecification ux specification
 * @returns array of pages of ObjectPage type
 */
export function getObjectPages(applicationSpecification: ApplicationSpecification): PageModel[] {
    const objectPages: PageModel[] = [];
    for (const pageKey in applicationSpecification.applicationModel.pages) {
        const page = applicationSpecification.applicationModel.pages[pageKey];
        if (page.pageType === 'ObjectPage') {
            objectPages.push(page);
        }
    }
    return objectPages;
}

/**
 * Gets the aggregations of a node in the ux specification model.
 *
 * @param node ux specification model node
 * @returns aggregations of the node
 */
export function getAggregations(node: UxSpecModelNode): Record<string, UxSpecModelNode> {
    if (node && typeof node === 'object' && 'aggregations' in node) {
        return node.aggregations;
    }
    return {};
}

/**
 * Gets the selection field items from the selection fields aggregation.
 *
 * @param selectionFieldsAgg selection fields aggregation
 * @returns array of selection field item descriptions
 */
export function getSelectionFieldItems(selectionFieldsAgg: Record<string, UxSpecModelNode>): string[] {
    if (selectionFieldsAgg && typeof selectionFieldsAgg === 'object') {
        const items: string[] = [];
        for (const itemKey in selectionFieldsAgg) {
            items.push(selectionFieldsAgg[itemKey].description);
        }
        return items;
    }
    return [];
}

/**
 * Gets the filter fields from the ux specification model.
 *
 * @param model ux specification page model
 * @param model.root root of the ux specification page model
 * @returns array of filter field descriptions
 */
export function getFilterFields(model: PageModel): string[] {
    const root = model.root;
    const filterBar = getAggregations(root)['filterBar'];
    const filterBarAggregations = getAggregations(filterBar);
    const selectionFields = filterBarAggregations['selectionFields'];
    const selectionFieldsAggregations = getAggregations(selectionFields);
    return getSelectionFieldItems(selectionFieldsAggregations);
}

/**
 * Gets the table columns from the ux specification page model.
 *
 * @param model ux specification page model
 * @param model.root root of the ux specification page model
 * @returns columns aggregation of the table in the ux specification page model
 */
export function getTableColumns(model: PageModel): Record<string, any> {
    const root = model.root;
    const table = getAggregations(root)['table'];
    const tableAggregations = getAggregations(table);
    const columns = tableAggregations['columns'];
    const columnAggregations = getAggregations(columns);
    return columnAggregations;
}
