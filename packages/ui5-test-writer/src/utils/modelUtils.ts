import type { Editor } from 'mem-fs-editor';
import { createApplicationAccess } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { PageTypeV4, type ReadAppResult, type Specification } from '@sap/ux-specification/dist/types/src';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import type {
    TreeAggregation,
    TreeAggregations,
    TreeModel,
    ApplicationModel
} from '@sap/ux-specification/dist/types/src/parser';
import type {
    AppFeatures,
    ListReportFeatures,
    ObjectPageFeatures,
    ActionButtonState,
    ButtonState,
    ButtonVisibilityResult,
    ActionButtonsResult
} from '../types';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';

export interface AggregationItem extends TreeAggregation {
    description: string;
}

/**
 * Gets feature data from the application model using ux-specification.
 *
 * @param fs - optional mem-fs editor instance
 * @param log - optional logger instance
 * @param metadata - optional service metadata for analyzing OData capabilities annotations
 * @returns feature data extracted from the application model
 */
export async function getAppFeatures(
    basePath: string,
    fs?: Editor,
    log?: Logger,
    metadata?: string
): Promise<AppFeatures> {
    const featureData: AppFeatures = {};
    let listReportPage: PageWithModelV4 | null = null;
    let objectPages: PageWithModelV4[] | null = null;
    let fpmPage: PageWithModelV4 | null = null;
    // Read application model to extract control information needed for test generation
    // specification and readApp might not be available due to specification version, fail gracefully
    try {
        const appModel = await getModelFromSpecification(basePath, fs, log);

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
            featureData.listReport = getListReportFeatures(
                listReportPage.model,
                log,
                metadata,
                listReportPage.entitySet
            );
        }
        if (objectPages) {
            featureData.objectPages = getObjectPageFeatures(objectPages, log);
        }
        if (fpmPage) {
            featureData.fpm = getFPMFeatures(fpmPage.model, log);
        }
    } catch (error) {
        // do noting here, as individual feature extraction methods already log warnings
    }
    log?.info('Extracted feature data from application model: ' + JSON.stringify(featureData));

    return featureData;
}

/**
 * Gets the application model using ux-specification.
 *
 * @param basePath - the absolute target path where the application will be generated
 * @param fs - optional mem-fs editor instance
 * @param log - optional logger instance
 * @returns application model extracted from the specification
 */
export async function getModelFromSpecification(
    basePath: string,
    fs?: Editor,
    log?: Logger
): Promise<ReadAppResult | undefined> {
    let appResult: ReadAppResult | undefined;
    try {
        // readApp calls createApplicationAccess internally if given a path, but it uses the "live" version of project-access without fs enhancement
        const appAccess = await createApplicationAccess(basePath, { fs: fs });
        const specification = await appAccess.getSpecification<Specification>();
        appResult = await specification.readApp({ app: appAccess, fs: fs });
    } catch (error) {
        log?.warn(
            'Error analyzing project model using specification. No dynamic tests will be generated. Error: ' +
                (error as Error).message
        );
    }
    return appResult;
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
 * Builds a button state object from button visibility result.
 *
 * @param buttonState - The button state from visibility check
 * @returns Button state object with visible, enabled, and optional dynamicPath properties
 */
function buildButtonState(buttonState?: ButtonState): {
    visible: boolean;
    enabled?: boolean | 'dynamic';
    dynamicPath?: string;
} {
    return {
        visible: !!buttonState?.visible,
        enabled: buttonState?.enabled,
        dynamicPath: buttonState?.enabled === 'dynamic' ? buttonState.dynamicPath : undefined
    };
}

/**
 * Safely checks button visibility with error handling.
 *
 * @param metadata - The OData metadata XML content
 * @param entitySetName - The name of the entity set
 * @param log - Optional logger instance
 * @returns Button visibility result or undefined if error occurs
 */
function safeCheckButtonVisibility(
    metadata: string,
    entitySetName: string,
    log?: Logger
): ButtonVisibilityResult | undefined {
    try {
        return checkButtonVisibility(metadata, entitySetName);
    } catch (error) {
        log?.debug(`Failed to check button visibility: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
    }
}

/**
 * Safely checks action button states with error handling.
 *
 * @param metadata - The OData metadata XML content
 * @param entitySetName - The name of the entity set
 * @param actionNames - List of action names to check
 * @param log - Optional logger instance
 * @returns Array of action button states or empty array if error occurs
 */
function safeCheckActionButtonStates(
    metadata: string,
    entitySetName: string,
    actionNames: string[],
    log?: Logger
): ActionButtonState[] {
    try {
        return checkActionButtonStates(metadata, entitySetName, actionNames).actions;
    } catch (error) {
        log?.debug(`Failed to check action button states: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

export function getListReportFeatures(
    pageModel: TreeModel,
    log?: Logger,
    metadata?: string,
    entitySetName?: string
): ListReportFeatures {
    const hasMetadata = metadata && entitySetName;
    const buttonVisibility = hasMetadata ? safeCheckButtonVisibility(metadata, entitySetName, log) : undefined;
    const toolbarActions = getToolBarActionNames(pageModel, log);

    return {
        createButton: buildButtonState(buttonVisibility?.create),
        deleteButton: buildButtonState(buttonVisibility?.delete),
        filterBarItems: getFilterFieldNames(pageModel, log),
        tableColumns: getTableColumnData(pageModel, log),
        toolBarActions: hasMetadata ? safeCheckActionButtonStates(metadata, entitySetName, toolbarActions, log) : []
    };
}

export function getFPMFeatures(pageModel: TreeModel, log?: Logger): ListReportFeatures {
    return {
        filterBarItems: getFilterFieldNames(pageModel, log),
        tableColumns: getTableColumnData(pageModel, log)
    };
}

export function getObjectPageFeatures(objectPages: PageWithModelV4[], log?: Logger): ObjectPageFeatures[] {
    const features: ObjectPageFeatures[] = [];
    objectPages.forEach((objectPage) => {
        features.push({
            [`${objectPage.name}`]: {
                tableColumns: getTableColumnData(objectPage.model, log)
            }
        });
    });
    return features;
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

function getToolBarActionNames(pageModel: TreeModel, log?: Logger): string[] {
    let toolBarActions: string[] = [];

    try {
        const toolbarActions = getToolBarActions(pageModel);
        toolBarActions = getToolBarActionItems(toolbarActions);
    } catch (error) {
        log?.debug(error);
    }

    if (!toolBarActions?.length) {
        log?.warn(
            'Unable to extract toolbar actions from project model using specification. No toolbar action tests will be generated.'
        );
    }

    return toolBarActions;
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
 * Retrieves all List Report definitions from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of List Report definitions.
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
 * Retrieves all List Report definitions from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of List Report definitions.
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
 * Retrieves all Object Page definitions from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of Object Page definitions.
 */
export function getObjectPages(applicationModel: ApplicationModel): PageWithModelV4[] {
    const objectPages: PageWithModelV4[] = [];
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ObjectPage) {
            page.name = pageKey; // store page key as name for later identification
            objectPages.push(page);
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
 * Extracts item descriptions from tree aggregations.
 *
 * @param aggregations - The tree aggregations containing item definitions
 * @returns An array of item descriptions
 */
function extractItemDescriptions(aggregations: TreeAggregations): string[] {
    if (aggregations && typeof aggregations === 'object') {
        return Object.keys(aggregations).map(
            (key) => (aggregations[key as keyof TreeAggregation] as unknown as AggregationItem).description
        );
    }
    return [];
}

/**
 * Retrieves selection field items from the given selection fields aggregation.
 *
 * @param selectionFieldsAgg - The selection fields aggregation containing field definitions.
 * @returns An array of selection field descriptions.
 */
export function getSelectionFieldItems(selectionFieldsAgg: TreeAggregations): string[] {
    return extractItemDescriptions(selectionFieldsAgg);
}

/**
 * Retrieves toolbar action items from the given toolbar actions aggregation.
 *
 * @param toolBarActionsAgg - The toolbar actions aggregation containing action definitions.
 * @returns An array of toolbar action descriptions.
 */
export function getToolBarActionItems(toolBarActionsAgg: TreeAggregations): string[] {
    return extractItemDescriptions(toolBarActionsAgg);
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
 * Retrieves toolbar action definitions from the given tree model.
 *
 * @param pageModel - The tree model containing toolbar definitions.
 * @returns The toolbar actions aggregation object.
 */
export function getToolBarActions(pageModel: TreeModel): TreeAggregations {
    const table = getAggregations(pageModel.root)['table'];
    const tableAggregations = getAggregations(table);
    const toolBar = tableAggregations['toolBar'];
    const toolBarAggregations = getAggregations(toolBar);
    const actions = toolBarAggregations['actions'];
    const actionAggregations = getAggregations(actions);
    return actionAggregations;
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

/**
 * Checks the visibility and enabled state of create and delete buttons for a given entity set
 * by analyzing OData Capabilities annotations in the metadata.
 *
 * @param metadataXml The OData metadata XML content as a string
 * @param entitySetName The name of the entity set to check
 * @returns ButtonVisibilityResult containing the state of create and delete buttons
 * @throws {Error} If metadata cannot be parsed or entity set is not found
 */
export function checkButtonVisibility(metadataXml: string, entitySetName: string): ButtonVisibilityResult {
    try {
        const convertedMetadata: ConvertedMetadata = convert(parse(metadataXml));
        const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);

        if (!entitySet) {
            throw new Error(`Entity set '${entitySetName}' not found in metadata`);
        }

        const insertRestrictions = entitySet.annotations?.Capabilities?.InsertRestrictions as
            | Record<string, any>
            | undefined;
        const deleteRestrictions = entitySet.annotations?.Capabilities?.DeleteRestrictions as
            | Record<string, any>
            | undefined;

        return {
            create: analyzeRestriction(insertRestrictions, 'Insertable'),
            delete: analyzeRestriction(deleteRestrictions, 'Deletable')
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to analyze button visibility: ${errorMessage}`);
    }
}

/**
 * Analyzes a capability restriction annotation to determine button state.
 *
 * @param restriction The restriction annotation object (InsertRestrictions or DeleteRestrictions)
 * @param propertyName The property name to check ('Insertable' or 'Deletable')
 * @returns ButtonState for the button
 */
function analyzeRestriction(
    restriction: Record<string, any> | undefined,
    propertyName: 'Insertable' | 'Deletable'
): ButtonState {
    const defaultState: ButtonState = { visible: true, enabled: true };

    if (!restriction) {
        return defaultState;
    }

    const value = restriction[propertyName];

    if (value === undefined || value === null) {
        return defaultState;
    }

    if (typeof value === 'boolean') {
        return { visible: value, enabled: value };
    }

    if (typeof value === 'object' && value !== null) {
        const path: string = value.$Path ?? value.path;
        if (path) {
            return { visible: true, enabled: 'dynamic', dynamicPath: path };
        }
    }

    return defaultState;
}

/**
 * Checks the state of action buttons defined in UI.LineItem annotations for a given entity set.
 *
 * @param metadataXml The OData metadata XML content as a string
 * @param entitySetName The name of the entity set to check
 * @param actionNames Optional list of action names to filter (e.g., ['Check', 'deductDiscount']). If not provided, returns all actions.
 * @returns ActionButtonsResult containing the list of action buttons and their states
 * @throws {Error} If metadata cannot be parsed or entity set is not found
 */
export function checkActionButtonStates(
    metadataXml: string,
    entitySetName: string,
    actionNames?: string[]
): ActionButtonsResult {
    try {
        const convertedMetadata: ConvertedMetadata = convert(parse(metadataXml));
        const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);

        if (!entitySet) {
            throw new Error(`Entity set '${entitySetName}' not found in metadata`);
        }

        const entityType = entitySet.entityType;
        if (!entityType) {
            throw new Error(`Entity type not found for entity set '${entitySetName}'`);
        }

        const lineItemAnnotation = entityType.annotations?.UI?.LineItem as any[] | undefined;

        if (!lineItemAnnotation || !Array.isArray(lineItemAnnotation)) {
            return { actions: [], entityType: entityType.name };
        }

        const dataFieldForActions = lineItemAnnotation.filter(
            (item) => item.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction'
        );

        const actions: ActionButtonState[] = actionNames
            ? findActionStates(dataFieldForActions, actionNames, convertedMetadata, entityType.name)
            : extractAllActionStates(dataFieldForActions, convertedMetadata, entityType.name);

        return { actions, entityType: entityType.name };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to analyze action button states: ${errorMessage}`);
    }
}

/**
 * Finds action states for a specific list of action names.
 *
 * @param dataFieldForActions List of DataFieldForAction items from UI.LineItem
 * @param actionNames List of action names to find
 * @param metadata The converted metadata
 * @param entityTypeName The entity type name
 * @returns List of action button states for the specified actions
 */
function findActionStates(
    dataFieldForActions: any[],
    actionNames: string[],
    metadata: ConvertedMetadata,
    entityTypeName: string
): ActionButtonState[] {
    const actionStates: ActionButtonState[] = [];

    for (const actionName of actionNames) {
        const item = dataFieldForActions.find((dfa) => {
            const actionMethod = extractActionMethodName(dfa.Action || '');
            return actionMethod === actionName || dfa.Label === actionName;
        });

        if (item) {
            actionStates.push(buildActionButtonState(item, metadata, entityTypeName));
        }
    }

    return actionStates;
}

/**
 * Extracts action states for all DataFieldForAction items.
 *
 * @param dataFieldForActions List of DataFieldForAction items from UI.LineItem
 * @param metadata The converted metadata
 * @param entityTypeName The entity type name
 * @returns List of all action button states
 */
function extractAllActionStates(
    dataFieldForActions: any[],
    metadata: ConvertedMetadata,
    entityTypeName: string
): ActionButtonState[] {
    return dataFieldForActions.map((item) => buildActionButtonState(item, metadata, entityTypeName));
}

/**
 * Builds an ActionButtonState object from a DataFieldForAction item.
 *
 * @param item The DataFieldForAction item
 * @param metadata The converted metadata
 * @param entityTypeName The entity type name
 * @returns ActionButtonState for the action
 */
function buildActionButtonState(item: any, metadata: ConvertedMetadata, entityTypeName: string): ActionButtonState {
    const actionMethod = extractActionMethodName(item.Action || '');
    const operationAvailable = findOperationAvailableAnnotation(metadata, entityTypeName, actionMethod);
    const { enabled, dynamicPath } = analyzeOperationAvailability(operationAvailable);

    return {
        label: item.Label || '',
        action: item.Action || '',
        visible: true,
        enabled,
        dynamicPath,
        invocationGrouping: item.InvocationGrouping ? extractEnumMemberValue(item.InvocationGrouping) : undefined
    };
}

/**
 * Analyzes Core.OperationAvailable annotation to determine action availability.
 *
 * @param operationAvailable The OperationAvailable annotation value
 * @returns Object containing enabled state and optional dynamic path
 */
function analyzeOperationAvailability(operationAvailable: any): {
    enabled: boolean | 'dynamic';
    dynamicPath?: string;
} {
    if (operationAvailable === undefined) {
        return { enabled: true };
    }

    if (typeof operationAvailable === 'boolean') {
        return { enabled: operationAvailable };
    }

    if (typeof operationAvailable === 'object' && operationAvailable !== null) {
        const path: string = operationAvailable.$Path ?? operationAvailable.path;
        if (path) {
            return { enabled: 'dynamic', dynamicPath: path };
        }
    }

    return { enabled: true };
}

/**
 * Extracts the action method name from a fully qualified action string.
 *
 * @param actionName The fully qualified action name
 * @returns The action method name
 */
function extractActionMethodName(actionName: string): string {
    const match = actionName.match(/\.([^.()]+)\(/);
    if (match?.[1]) {
        return match[1];
    }

    const lastDotIndex = actionName.lastIndexOf('.');
    const parenIndex = actionName.indexOf('(');
    if (lastDotIndex !== -1 && parenIndex !== -1) {
        return actionName.substring(lastDotIndex + 1, parenIndex);
    }

    return actionName;
}

/**
 * Finds the Core.OperationAvailable annotation for a specific action.
 *
 * @param metadata The converted metadata
 * @param entityTypeName The entity type name
 * @param actionMethodName The action method name
 * @returns The OperationAvailable annotation value or undefined if not found
 */
function findOperationAvailableAnnotation(
    metadata: ConvertedMetadata,
    entityTypeName: string,
    actionMethodName: string
): any {
    if (metadata.actions) {
        const action = metadata.actions.find(
            (a) => a.name === actionMethodName || a.fullyQualifiedName?.includes(`.${actionMethodName}(`)
        );
        if (action?.annotations?.Core?.OperationAvailable !== undefined) {
            return action.annotations.Core.OperationAvailable;
        }
    }

    if (metadata.entityContainer?.annotations) {
        const annotations = metadata.entityContainer.annotations as any;
        const matchingKey = Object.keys(annotations).find((key) => key.includes(actionMethodName));
        if (matchingKey && annotations[matchingKey]?.Core?.OperationAvailable !== undefined) {
            return annotations[matchingKey].Core.OperationAvailable;
        }
    }

    return undefined;
}

/**
 * Extracts the enum member value from an annotation.
 *
 * @param enumValue The enum value object
 * @returns The extracted enum value string
 */
function extractEnumMemberValue(enumValue: any): string | undefined {
    if (typeof enumValue === 'string') {
        return enumValue;
    }
    if (enumValue?.$EnumMember) {
        const parts = enumValue.$EnumMember.split('/');
        return parts[1] ?? enumValue.$EnumMember;
    }
    return undefined;
}
