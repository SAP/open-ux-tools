import type { Logger } from '@sap-ux/logger';
import type { TreeAggregation, TreeAggregations, TreeModel } from '@sap/ux-specification/dist/types/src/parser';
import type {
    ActionButtonsResult,
    ActionButtonState,
    ButtonState,
    ButtonVisibilityResult,
    FEV4ManifestTarget,
    ListReportFeatures
} from '../types';
import {
    getFilterFields,
    getSelectionFieldItems,
    getTableColumnData,
    type AggregationItem,
    getAggregations
} from './modelUtils';
import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import type { Manifest } from '@sap-ux/project-access';

/**
 * Builds a button state object from button visibility result.
 *
 * @param buttonState - The button state from visibility check
 * @returns Button state object with visible, enabled, and optional dynamicPath properties
 */
export function buildButtonState(buttonState?: ButtonState): {
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
export function safeCheckButtonVisibility(
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
export function safeCheckActionButtonStates(
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

/**
 * Returns true when a ListReport manifest target is configured as an Analytical List Page.
 * ALP targets have a `views.paths` array where at least one entry contains a `primary` array,
 * indicating the dual-view (chart + table) layout used by ALP.
 *
 * @param target - the manifest routing target to inspect
 * @returns true if the target represents an ALP configuration
 */
export function isALPManifestTarget(target: FEV4ManifestTarget): boolean {
    return (
        target.options?.settings?.views?.paths?.some(
            (path) => Array.isArray(path.primary) && path.primary.length > 0
        ) ?? false
    );
}

/**
 * Returns true if any ListReport target in the manifest is configured as an Analytical List Page.
 *
 * @param manifest - the application manifest
 * @param targetKey - optional specific target key to check; if omitted all ListReport targets are checked
 * @returns true if the target (or any ListReport target) is an ALP
 */
export function isALPFromManifest(manifest: Manifest, targetKey?: string): boolean {
    const targets = manifest['sap.ui5']?.routing?.targets;
    if (!targets) {
        return false;
    }
    const keysToCheck = targetKey ? [targetKey] : Object.keys(targets);
    return keysToCheck.some((key) => {
        const target = targets[key] as FEV4ManifestTarget;
        return target?.name === 'sap.fe.templates.ListReport' && isALPManifestTarget(target);
    });
}

/**
 * Gets List Report features from the page model using ux-specification.
 *
 * @param listReportPage - the List Report page containing the tree model with feature definitions
 * @param log - optional logger instance
 * @param metadata - optional metadata for the OPA test generation
 * @param manifest - optional application manifest, used to detect ALP configuration
 * @returns feature data extracted from the List Report page model
 */
export function getListReportFeatures(
    listReportPage: PageWithModelV4,
    log?: Logger,
    metadata?: string,
    manifest?: Manifest
): ListReportFeatures {
    const buttonVisibility =
        metadata && listReportPage.entitySet
            ? safeCheckButtonVisibility(metadata, listReportPage.entitySet, log)
            : undefined;
    const toolbarActions = getToolBarActionNames(listReportPage.model, log);

    return {
        name: listReportPage.name,
        createButton: buildButtonState(buttonVisibility?.create),
        deleteButton: buildButtonState(buttonVisibility?.delete),
        filterBarItems: getFilterFieldNames(listReportPage.model, log),
        tableColumns: getTableColumnData(listReportPage.model, log),
        toolBarActions:
            metadata && listReportPage.entitySet
                ? safeCheckActionButtonStates(metadata, listReportPage.entitySet, toolbarActions, log)
                : [],
        isALP: manifest ? isALPFromManifest(manifest, listReportPage.name) : false
    };
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
 * Retrieves filter field names from the page model using ux-specification.
 *
 * @param pageModel - the tree model containing filter bar definitions
 * @param log - optional logger instance
 * @returns - an array of filter field names
 */
export function getFilterFieldNames(pageModel: TreeModel, log?: Logger): string[] {
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
    // Bound actions whose binding parameter is a single entity (not a collection) require
    // row selection to be invoked, so they are disabled by default (no row selected).
    // Collection-bound actions operate on the entity set and are always enabled.
    const isEntityBound =
        item.ActionTarget?.isBound === true && item.ActionTarget?.parameters?.[0]?.isCollection !== true;
    const { enabled, dynamicPath } = analyzeOperationAvailability(operationAvailable, isEntityBound);

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
 * Single-entity bound actions (requiring row selection) are disabled by default when no annotation is present.
 *
 * @param operationAvailable The OperationAvailable annotation value
 * @param isEntityBound Whether the action is bound to a single entity (requires row selection to enable)
 * @returns Object containing enabled state and optional dynamic path
 */
function analyzeOperationAvailability(
    operationAvailable: any,
    isEntityBound?: boolean
): {
    enabled: boolean | 'dynamic';
    dynamicPath?: string;
} {
    if (operationAvailable === undefined) {
        return { enabled: !isEntityBound };
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
    const match = /\.([^.()]+)\(/.exec(actionName);
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

/**
 * Retrieves toolbar action names from the page model using ux-specification.
 *
 * @param pageModel - the tree model containing toolbar definitions
 * @param log - optional logger instance
 * @returns - an array of toolbar action names
 */
export function getToolBarActionNames(pageModel: TreeModel, log?: Logger): string[] {
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
 * Retrieves toolbar action items from the given toolbar actions aggregation.
 *
 * @param toolBarActionsAgg - The toolbar actions aggregation containing action definitions.
 * @returns An array of toolbar action descriptions.
 */
export function getToolBarActionItems(toolBarActionsAgg: TreeAggregations): string[] {
    return extractItemDescriptions(toolBarActionsAgg);
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
