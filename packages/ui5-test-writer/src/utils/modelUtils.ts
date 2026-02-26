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
import {
    type FeatureData,
    type ObjectPageFeatureData,
    type ObjectPageNavigationParents,
    type ListReportFeatureData,
    type HeaderSectionFeatureData
} from '../types';

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
 * Extracts feature data for object pages from the application model.
 *
 * @param applicationModel - the application model containing page definitions
 * @param log - optional logger instance
 * @returns a record of object page feature data
 */
async function getObjectPageFeatureData(
    applicationModel: ApplicationModel,
    log?: Logger
): Promise<ObjectPageFeatureData[]> {
    const objectPageFeatureData: ObjectPageFeatureData[] = [];
    const objectPages = getObjectPages(applicationModel);
    if (!objectPages || Object.keys(objectPages).length === 0) {
        log?.warn('Object Pages not found in application model. Dynamic tests will not be generated for Object Pages.');
        return objectPageFeatureData;
    }

    // attempt to get individual feature data for each object page
    for (const objectPageKey of Object.keys(objectPages)) {
        const objectPage = objectPages[objectPageKey];
        const pageFeatureData: ObjectPageFeatureData = {};

        pageFeatureData.name = objectPageKey;
        pageFeatureData.navigationParents = getObjectPageNavigationParents(objectPageKey, applicationModel);
        // extract header sections (facets)
        pageFeatureData.headerSections = extractObjectPageHeaderSectionsData(objectPage as PageWithModelV4);
        objectPageFeatureData.push(pageFeatureData);
    }

    return objectPageFeatureData;
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
 * Finds parent pages for the object page, and returns their identifiers.
 *
 * @param targetObjectPageKey - key of the target object page
 * @param applicationModel  - the application model containing page definitions
 * @returns navigation data including parent page identifiers
 */
function getObjectPageNavigationParents(
    targetObjectPageKey: string,
    applicationModel: ApplicationModel
): ObjectPageNavigationParents {
    const listReportPageKey = getListReportPageKey(applicationModel);
    const objectPages = getObjectPages(applicationModel);
    const navigationParents: ObjectPageNavigationParents = {
        parentLRName: listReportPageKey ?? '' // app is possibly malformed if no LR found
    };

    Object.keys(objectPages).forEach((objectPageKey) => {
        const objectPage = objectPages[objectPageKey];
        const navigationRoutes = getNavigationRoutes(objectPage as PageWithModelV4);
        const routeToTargetOP = navigationRoutes.find((nav) => nav.route === targetObjectPageKey);
        if (routeToTargetOP) {
            navigationParents.parentOPName = objectPageKey;
            navigationParents.parentOPTableSection = routeToTargetOP.identifier;
        }
    });

    return navigationParents;
}

/**
 *  Extracts header sections data from an object page model.
 *
 * @param objectPage - object page from the application model
 * @returns header sections data
 */
function extractObjectPageHeaderSectionsData(objectPage: PageWithModelV4): HeaderSectionFeatureData[] {
    const headerSections: HeaderSectionFeatureData[] = [];
    if (objectPage.model) {
        const headerAggregation = getAggregations(objectPage.model.root)['header'];
        const sectionsAggregation = getAggregations(headerAggregation)['sections'];
        const sections = getAggregations(sectionsAggregation) as Record<string, HeaderSectionItem>;
        Object.values(sections).forEach((section) => {
            const facetId = getSectionIdentifier(section);
            if (!facetId) {
                // if no identifier can be found for the section, it is not possible to reliably identify it in tests, so skip it
                return;
            }
            const sectionData: HeaderSectionFeatureData = {
                facetId: facetId,
                stashed: getSectionStashedFlag(section),
                custom: section.custom,
                microChart: isSectionMicroChart(section),
                form: isFormSection(section),
                // collection: false // TODO: find out how to identify collection facets
                title: section.title
            };
            if (sectionData.form) {
                sectionData.fields = getHeaderSectionFormFields(section);
            }
            headerSections.push(sectionData);
        });
    }
    return headerSections;
}

/**
 * Gets the identifier of a section for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests
 */
function getSectionIdentifier(section: SectionItem): string | undefined {
    return getSectionIdentifierFromKey(section) ?? getSectionIdentifierFromTitle(section);
}

/**
 * Gets the identifier of a section from the 'ID' entry in the schema keys for OPA5 tests.
 * If no such entry is found, undefined is returned.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests; can be undefined if no 'ID' entry is found
 */
function getSectionIdentifierFromKey(section: SectionItem): string | undefined {
    const keyEntry = section?.schema?.keys?.find((key) => key.name === 'ID');
    return keyEntry ? keyEntry.value.replace('#', '::') : undefined;
}

/**
 * Gets the identifier of a section from its title for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests; can be undefined if title is not in expected format
 */
function getSectionIdentifierFromTitle(section: SectionItem): string | undefined {
    return section.title?.slice(section.title?.lastIndexOf('.') + 1).replace('#', '::') ?? undefined;
}

/**
 * Gets the stashed flag of a header section for OPA5 tests.
 *
 * @param headerSection - header section entry from ux specification
 * @returns stashed flag of the header section for OPA5 tests; can be a boolean or a string depending on the specification version
 */
function getSectionStashedFlag(headerSection: HeaderSectionItem): string | boolean {
    return headerSection?.properties?.stashed?.freeText ?? false;
}

/**
 * Gets form fields of a header section for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns an array of form fields with their identifiers and bound properties for OPA5 tests
 */
function getHeaderSectionFormFields(section: HeaderSectionItem): HeaderSectionFeatureData['fields'] {
    const formFields: HeaderSectionFeatureData['fields'] = [];
    const formAggregation = getAggregations(section)?.form as AggregationItem;
    const fieldsAggregation = getAggregations(formAggregation)?.fields as AggregationItem;
    const fields = getAggregations(fieldsAggregation) as Record<string, FieldItem>;
    if (fields) {
        Object.keys(fields).forEach((fieldKey) => {
            const field = fields[fieldKey];
            if (field?.name) {
                formFields.push({
                    fieldGroupQualifier: getFieldGroupQualifier(formAggregation),
                    field: field.schema.keys.find((key) => key.name === 'Value')?.value
                });
            }
        });
    }
    return formFields;
}

/**
 * Gets the field group qualifier of a form aggregation for OPA5 tests.
 *
 * @param formAggregation - form aggregation entry from ux specification
 * @returns field group qualifier for OPA5 tests; can be undefined if not found
 */
function getFieldGroupQualifier(formAggregation: AggregationItem): string | undefined {
    const fullTarget = formAggregation?.schema?.keys?.find((key) => key.name === 'Target')?.value;
    return fullTarget?.split('#')[1];
}

/**
 * Checks if the section contains a microChart based on it's name.
 *
 * @param section - section entry from ux specification
 * @returns true if the section seems to contain a microChart, false otherwise
 */
function isSectionMicroChart(section: SectionItem): boolean {
    return section?.schema?.dataType === 'ChartDefinition';
}

/**
 * Checks if the section contains a form based on it's aggregations.
 *
 * @param section - section entry from ux specification
 * @returns true if the section seems to contain a form, false otherwise
 */
function isFormSection(section: SectionItem): boolean {
    return getAggregations(section)?.form !== undefined;
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
 * Retrieves the key of the List Report page from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns The key of the List Report page, or null if not found.
 */
function getListReportPageKey(applicationModel: ApplicationModel): string | null {
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ListReport) {
            return pageKey;
        }
    }
    return null;
}

/**
 * Retrieves all Object Page definitions from the given application model, as long as the page is reachable via standard navigation routes.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of Object Page definitions.
 */
export function getObjectPages(applicationModel: ApplicationModel): { [key: string]: PageWithModelV4 } {
    const objectPages: { [key: string]: PageWithModelV4 } = {};
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ObjectPage) {
            objectPages[pageKey] = page;
        }
    }
    return objectPages;
}

/**
 * Retrieves navigation targets from the given page model.
 *
 * @param pageModel - The page model containing navigation definitions.
 * @returns An array of navigation target identifiers.
 */
function getNavigationRoutes(pageModel: PageWithModelV4): { identifier: string; route: string }[] {
    const navigationTargets: { identifier: string; route: string }[] = [];
    if (!pageModel?.navigation) {
        return navigationTargets;
    }

    Object.keys(pageModel.navigation).map((navigationKey) => {
        if (pageModel.navigation) {
            const navigationEntry = pageModel.navigation[navigationKey];
            navigationTargets.push({
                identifier: navigationKey,
                route:
                    typeof navigationEntry === 'string' ? navigationEntry : (navigationEntry as { route: string }).route
            });
        }
    });

    return navigationTargets;
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
