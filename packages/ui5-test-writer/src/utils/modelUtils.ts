import type { Editor } from 'mem-fs-editor';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Manifest } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src/common/index.js';
import type { ReadAppResult, Specification } from '@sap/ux-specification/dist/types/src/index.js';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application.js';
import type {
    TreeAggregation,
    TreeAggregations,
    TreeModel,
    ApplicationModel
} from '@sap/ux-specification/dist/types/src/parser/index.js';
import type { AppFeatures, FPMFeatures } from '../types.js';
import { getObjectPageFeatures, getObjectPages } from './objectPageUtils.js';
import { getFilterFieldNames, getListReportFeatures } from './listReportUtils.js';
import { extractTableColumnsFromNode } from './tableUtils.js';

export interface AggregationItem extends TreeAggregation {
    description: string;
    schema: {
        keys: { name: string; value: string }[];
        dataType?: string;
    };
}

export interface FieldItem extends AggregationItem {
    name: string;
}

export interface SectionItem extends AggregationItem {
    title?: string;
    custom?: boolean;
    name?: string;
    order?: number;
    schema: {
        keys: { name: string; value: string }[];
        dataType?: string;
    };
}

export interface BodySectionItem extends SectionItem {
    isTable?: boolean;
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
 * Gets app features from the application model using ux-specification.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param fs - optional mem-fs editor instance
 * @param log - optional logger instance
 * @param metadata - optional metadata for the OPA test generation
 * @param manifest - optional application manifest, used to detect ALP configuration
 * @returns feature data extracted from the application model
 */
export async function getAppFeatures(
    basePath: string,
    fs?: Editor,
    log?: Logger,
    metadata?: string,
    manifest?: Manifest
): Promise<AppFeatures> {
    const featureData: AppFeatures = {};

    let listReportPage: PageWithModelV4 | null = null;
    let objectPages: PageWithModelV4[] | null = null;
    let fpmPage: PageWithModelV4 | null = null;
    let projectMetadata = metadata;
    // Read application model to extract control information needed for test generation
    // specification and readApp might not be available due to specification version, fail gracefully
    try {
        // readApp calls createApplicationAccess internally if given a path, but it uses the "live" version of project-access without fs enhancement
        const appAccess = await createApplicationAccess(basePath, { fs: fs });
        const specification = await appAccess.getSpecification<Specification>();
        const appModel: ReadAppResult = await specification.readApp({ app: appAccess, fs: fs });

        if (!projectMetadata) {
            const metadataPath = appAccess.project?.apps['']?.services?.mainService?.local;
            if (metadataPath) {
                projectMetadata = fs?.read(metadataPath);
            }
        }

        listReportPage = appModel?.applicationModel ? getListReportPage(appModel.applicationModel) : listReportPage;
        objectPages = appModel?.applicationModel ? getObjectPages(appModel.applicationModel) : objectPages;
        fpmPage = appModel?.applicationModel ? getFPMPage(appModel.applicationModel, log) : fpmPage;
    } catch (error) {
        log?.warn(
            'Error analyzing project model using specification. No dynamic tests will be generated. Error: ' +
                (error as Error).message
        );
        return featureData;
    }

    if (!listReportPage && !objectPages && !fpmPage) {
        log?.warn('Pages not found in application model. Dynamic tests will not be generated.');
        return featureData;
    }

    // attempt to get individual feature data
    try {
        if (listReportPage) {
            featureData.listReport = getListReportFeatures(listReportPage, log, projectMetadata, manifest);
        }
        if (objectPages) {
            log?.warn('Extracting Object Page features from application model');
            featureData.objectPages = await getObjectPageFeatures(
                objectPages,
                listReportPage?.name,
                log,
                projectMetadata,
                manifest
            );
            log?.warn('objectPages features extracted: ' + JSON.stringify(featureData.objectPages));
        }
        if (fpmPage) {
            featureData.fpm = getFPMFeatures(fpmPage, log);
        }
    } catch (error) {
        // do noting here, as individual feature extraction methods already log warnings
    }

    return featureData;
}

/**
 * Retrieves table column data from the page model using ux-specification.
 *
 * @param pageModel - the tree model containing table column definitions
 * @param log - optional logger instance
 * @returns - a map of table columns
 */
export function getTableColumnData(
    pageModel: TreeModel,
    log?: Logger
): Record<string, Record<string, string | number | boolean>> {
    let tableColumns: Record<string, Record<string, string | number | boolean>> = {};

    try {
        tableColumns = extractTableColumnsFromNode(pageModel.root);
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
export function getListReportPage(applicationModel: ApplicationModel): PageWithModelV4 | null {
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ListReport) {
            page.name = pageKey; // store page key as name for later identification
            return page;
        }
    }
    return null;
}

/**
 * Retrieves all FPM Custom Page definitions from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @param log - optional logger instance
 * @returns An array of FPM Custom Page definitions.
 */
export function getFPMPage(applicationModel: ApplicationModel, log?: Logger): PageWithModelV4 | null {
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        log?.warn('pageType:' + page.pageType);
        if (page.pageType === PageTypeV4.FPMCustomPage) {
            page.name = pageKey; // store page key as name for later identification
            return page;
        }
    }
    return null;
}

/**
 * Gets FPM features from the page model using ux-specification.
 *
 * @param page - the FPM Custom Page containing model definitions
 * @param log - optional logger instance
 * @returns feature data extracted from the FPM Custom Page model
 */
export function getFPMFeatures(page: PageWithModelV4, log?: Logger): FPMFeatures {
    return {
        name: page.name,
        filterBarItems: getFilterFieldNames(page.model, log),
        tableColumns: getTableColumnData(page.model, log)
    };
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
 * Retrieves selection field property names from the given selection fields aggregation.
 *
 * Returns the OData property names (e.g. `"TravelID"`) read from `schema.keys[0].value`,
 * not the translatable display labels. Stable identifiers like these are needed by
 * `iCheckFilterField({ property })` so generated tests do not break under translation.
 *
 * @param selectionFieldsAgg - The selection fields aggregation containing field definitions.
 * @returns An array of selection field property names.
 */
export function getSelectionFieldItems(selectionFieldsAgg: TreeAggregations): string[] {
    if (selectionFieldsAgg && typeof selectionFieldsAgg === 'object') {
        const items: string[] = [];
        for (const itemKey in selectionFieldsAgg) {
            const item = selectionFieldsAgg[itemKey as keyof TreeAggregation] as unknown as AggregationItem;
            const property = item.schema?.keys?.[0]?.value;
            if (property) {
                items.push(property);
            }
        }
        return items;
    }
    return [];
}

/**
 * Retrieves selection field property names and translated display labels from the given
 * selection fields aggregation.
 *
 * Used by the List Report path where custom filter fields cannot be identified by the
 * property regex `::FilterField::<property>$` and must fall back to matching by label.
 *
 * @param selectionFieldsAgg - The selection fields aggregation containing field definitions.
 * @returns Array of `{ property, description }` entries.
 */
export function getSelectionFieldItemsWithLabels(
    selectionFieldsAgg: TreeAggregations
): { property: string; description: string }[] {
    if (selectionFieldsAgg && typeof selectionFieldsAgg === 'object') {
        const items: { property: string; description: string }[] = [];
        for (const itemKey in selectionFieldsAgg) {
            const item = selectionFieldsAgg[itemKey as keyof TreeAggregation] as unknown as AggregationItem;
            const property = item.schema?.keys?.[0]?.value;
            if (property) {
                items.push({ property, description: item.description ?? property });
            }
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
 * Parses a `DataFieldForAnnotation::<property>::<targetAnnotation>` style identifier.
 *
 * @param name - aggregation key or `field.name` from the spec model
 * @returns the parsed property and target annotation, or undefined for non-annotation entries
 */
export function parseDataFieldForAnnotationName(
    name: string | undefined
): { property: string; targetAnnotation: string } | undefined {
    if (!name) {
        return undefined;
    }
    const segments = name.split('::');
    if (segments.length < 3 || segments[0] !== 'DataFieldForAnnotation') {
        return undefined;
    }
    const property = segments[1];
    const targetAnnotation = segments[2];
    if (!property || !targetAnnotation) {
        return undefined;
    }
    return { property, targetAnnotation };
}
