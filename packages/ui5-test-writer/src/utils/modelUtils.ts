import type { Editor } from 'mem-fs-editor';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src/common/page';
import type { ReadAppResult, Specification } from '@sap/ux-specification/dist/types/src';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import type {
    TreeAggregation,
    TreeAggregations,
    TreeModel,
    ApplicationModel
} from '@sap/ux-specification/dist/types/src/parser';
import type { FeatureData, ObjectPageFeatureData, ListReportFeatureData } from '../types';
import { getObjectPageFeatureData } from './objectPageUtils';

export interface AggregationItem extends TreeAggregation {
    description: string;
    schema: {
        keys: { name: string; value: string }[];
    };
}

export interface FieldItem extends AggregationItem {
    name: string;
}

export interface SectionItem extends AggregationItem {
    title?: string;
    custom?: boolean;
    name?: string;
    schema: {
        keys: { name: string; value: string }[];
        dataType?: string;
    };
}

export interface HeaderSectionItem extends SectionItem {
    properties: {
        stashed: {
            freeText: string | boolean;
        };
    };
}

export interface PageWithModelV4WithProperties extends PageWithModelV4 {
    routePattern?: string;
}

/**
 * Gets feature data from the application model using ux-specification.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param fs - optional mem-fs editor instance
 * @param log - optional logger instance
 * @returns feature data extracted from the application model
 */
export async function getFeatureData(basePath: string, fs?: Editor, log?: Logger): Promise<FeatureData> {
    const featureData: FeatureData = {};
    let listReportPageFeatureData: ListReportFeatureData | null = null;
    let objectPageFeatureData: ObjectPageFeatureData[] = [];
    // Read application model to extract control information needed for test generation
    // specification and readApp might not be available due to specification version, fail gracefully
    try {
        // readApp calls createApplicationAccess internally if given a path, but it uses the "live" version of project-access without fs enhancement
        const appAccess = await createApplicationAccess(basePath, { fs: fs });
        const specification = await appAccess.getSpecification<Specification>();
        const appResult: ReadAppResult = await specification.readApp({ app: appAccess, fs: fs });
        listReportPageFeatureData = appResult.applicationModel
            ? getListReportPageFeatureData(appResult.applicationModel, log)
            : listReportPageFeatureData;
        objectPageFeatureData = appResult.applicationModel
            ? await getObjectPageFeatureData(appResult.applicationModel, log)
            : objectPageFeatureData;
    } catch (error) {
        log?.warn(
            'Error analyzing project model using specification. No dynamic tests will be generated. Error: ' +
                (error as Error).message
        );
        return featureData;
    }

    if (!listReportPageFeatureData) {
        log?.warn('List Report page not found in application model. Dynamic tests will not be generated.');
        return featureData;
    }

    // list report page feature data
    featureData.listReport = listReportPageFeatureData;

    // object page feature data
    featureData.objectPages = objectPageFeatureData;

    return featureData;
}

/**
 * Extracts feature data for the List Report page from the application model.
 *
 * @param applicationModel - the application model containing page definitions
 * @param log - optional logger instance
 * @returns a record of List Report feature data
 */
function getListReportPageFeatureData(applicationModel: ApplicationModel, log?: Logger): ListReportFeatureData {
    const featureData: ListReportFeatureData = {};
    const listReportPage = getListReportPage(applicationModel);
    featureData.name = listReportPage?.pageKey;
    if (listReportPage?.page?.model) {
        featureData.filterBarItems = getFilterFieldNames(listReportPage.page.model, log);
        featureData.tableColumns = getTableColumnData(listReportPage.page.model, log);
    }
    return featureData;
}

/**
 * Gets identifier of a column for OPA5 tests.
 * If the column is custom, the identifier is taken from the 'Key' entry in the schema keys.
 * If the column is not custom, the identifier is taken from the 'Value' entry in the schema keys.
 * If no such entry is found, undefined is returned.
 *
 * @param column - column module from ux specification
 * @param column.custom boolean indicating whether the column is custom
 * @param column.schema schema of the column
 * @param column.schema.keys keys of the column; expected to have an entry with the name 'Key' or 'Value'
 * @returns identifier of the column for OPA5 tests; can be the name or index
 */
function getColumnIdentifier(column: {
    custom: boolean;
    schema: { keys: { name: string; value: string }[] };
}): string | undefined {
    const key = column.custom ? 'Key' : 'Value';
    const keyEntry = column.schema.keys.find((entry: { name: string; value: string }) => entry.name === key);
    return keyEntry?.value;
}

/**
 * Transforms column aggregations from the ux specification model into a map of columns for OPA5 tests.
 *
 * @param columnAggregations column aggregations from the ux specification model
 * @returns a map of columns for OPA5 tests
 */
function transformTableColumns(columnAggregations: Record<string, any>): Record<string, any> {
    const columns: Record<string, any> = {};
    Object.values(columnAggregations).forEach((columnAggregation, index) => {
        columns[getColumnIdentifier(columnAggregation) ?? index] = {
            header: columnAggregation.description
            // TODO possibly more reliable properties could be used?
        };
    });
    return columns;
}

/**
 * Retrieves filter field names from the page model using ux-specification.
 *
 * @param pageModel - the tree model containing filter bar definitions
 * @param log - optional logger instance
 * @returns - an array of filter field names
 */
function getFilterFieldNames(pageModel: TreeModel, log?: Logger): string[] {
    let filterBarItems: string[] = [];

    try {
        const filterBarAggregations = getFilterFields(pageModel);
        filterBarItems = getSelectionFieldItems(filterBarAggregations);
    } catch (error) {
        log?.debug(error);
    }

    if (!filterBarItems?.length) {
        log?.warn(
            'Unable to extract filter fields from project model using specification. No filter field tests will be generated.'
        );
    }

    return filterBarItems;
}

/**
 * Retrieves table column data from the page model using ux-specification.
 *
 * @param pageModel - the tree model containing table column definitions
 * @param log - optional logger instance
 * @returns - a map of table columns
 */
function getTableColumnData(
    pageModel: TreeModel,
    log?: Logger
): Record<string, Record<string, string | number | boolean>> {
    let tableColumns: Record<string, Record<string, string | number | boolean>> = {};

    try {
        const columnAggregations = getTableColumns(pageModel);
        tableColumns = transformTableColumns(columnAggregations);
    } catch (error) {
        log?.debug(error);
    }

    if (!tableColumns || !Object.keys(tableColumns).length) {
        log?.warn(
            'Unable to extract table columns from project model using specification. No table column tests will be generated.'
        );
    }

    return tableColumns;
}

/**
 * Retrieves List Report definition from the given application model.
 * Only a single List Report page is expected, so the first match is returned.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An object containing the key and page definition of the List Report, or null if not found.
 */
export function getListReportPage(
    applicationModel: ApplicationModel
): { pageKey: string; page: PageWithModelV4 } | null {
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ListReport) {
            return {
                pageKey,
                page
            };
        }
    }
    return null;
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
export function getFilterFields(pageModel: TreeModel): TreeAggregations {
    const filterBar = getAggregations(pageModel.root)['filterBar'];
    const filterBarAggregations = getAggregations(filterBar);
    const selectionFields = filterBarAggregations['selectionFields'];
    const selectionFieldsAggregations = getAggregations(selectionFields);
    return selectionFieldsAggregations;
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
