import type { Logger } from '@sap-ux/logger';
import type { TreeAggregations, TreeModel } from '@sap/ux-specification/dist/types/src/parser/index.js';
import type {
    ActionButtonsResult,
    ActionButtonState,
    ButtonState,
    FEV4ManifestTarget,
    FilterBarItem,
    ListReportFeatures
} from '../types.js';
import {
    getFilterFields,
    getSelectionFieldItems,
    getSelectionFieldItemsWithLabels,
    getTableColumnData,
    type AggregationItem,
    getAggregations
} from './modelUtils.js';
import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import {
    extractActionMethodName,
    buildActionButtonState,
    safeCheckButtonVisibility,
    safeCheckButtonVisibilityFromMetadata
} from './actionUtils.js';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application.js';
import type { Manifest } from '@sap-ux/project-access';
import type { DataFieldForAction } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import { t } from '../i18n.js';

export { checkButtonVisibility, safeCheckEditVisibility } from './actionUtils.js';
export { safeCheckButtonVisibility };

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
 * Safely checks action button states with error handling.
 *
 * @param convertedMetadata - The already-converted OData metadata
 * @param entitySetName - The name of the entity set
 * @param actionNames - List of action names to check
 * @param log - Optional logger instance
 * @returns Array of action button states or empty array if error occurs
 */
export function safeCheckActionButtonStates(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    actionNames: string[],
    log?: Logger
): ActionButtonState[] {
    try {
        return checkActionButtonStatesFromMetadata(convertedMetadata, entitySetName, actionNames).actions;
    } catch (error) {
        log?.debug(`Failed to check action button states: ${error instanceof Error ? error.message : String(error)}`);
        return [];
    }
}

/**
 * Safely gets semantic key properties with error handling.
 *
 * @param convertedMetadata - The already-converted OData metadata
 * @param entitySetName - The name of the entity set
 * @param log - Optional logger instance
 * @returns Array of semantic key properties or undefined if error occurs
 */
export function safeGetSemanticKeyProperties(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    log?: Logger
): string[] | undefined {
    try {
        return getSemanticKeyPropertiesFromMetadata(convertedMetadata, entitySetName, false);
    } catch (error) {
        log?.debug(`Failed to get semantic key properties: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
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
    const toolbarActions = getToolBarActionNames(listReportPage.model, log);
    const filterFieldEntries = getFilterFieldItems(listReportPage.model, log);
    const customFilterFieldProperties = getCustomFilterFieldProperties(manifest, listReportPage.name);

    let buttonVisibility: ReturnType<typeof safeCheckButtonVisibility> | undefined;
    let semanticKeyProperties: string[] | undefined;
    let toolBarActions: ReturnType<typeof safeCheckActionButtonStates> = [];
    let convertedMetadata: ConvertedMetadata | undefined;

    if (metadata && listReportPage.entitySet) {
        const entitySetName = listReportPage.entitySet;
        try {
            convertedMetadata = convert(parse(metadata));
            buttonVisibility = safeCheckButtonVisibilityFromMetadata(convertedMetadata, entitySetName, log);
            semanticKeyProperties = safeGetSemanticKeyProperties(convertedMetadata, entitySetName, log);
            toolBarActions = safeCheckActionButtonStates(convertedMetadata, entitySetName, toolbarActions, log);
        } catch (error) {
            log?.debug(`Failed to parse metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Custom filter fields are matched by rendered label, so resolve unresolved i18n
    // placeholders via the property's OData `@Common.Label`.
    const filterBarItems: FilterBarItem[] = filterFieldEntries.map((entry) => {
        const custom = customFilterFieldProperties.has(entry.property);
        let description = entry.description;
        if (
            custom &&
            typeof description === 'string' &&
            description.startsWith('{i18n>') &&
            convertedMetadata &&
            listReportPage.entitySet
        ) {
            const resolved = getPropertyLabelFromMetadata(convertedMetadata, listReportPage.entitySet, entry.property);
            if (resolved) {
                description = resolved;
            }
        }
        return { property: entry.property, description, custom };
    });

    const filterBarProperties = filterBarItems.map((item) => item.property);
    const missingKeys =
        semanticKeyProperties?.length && filterBarProperties.length
            ? semanticKeyProperties
                  .filter((key) => !filterBarProperties.includes(key))
                  // `@UI.HiddenFilter` properties cannot be added via the adaptation dialog; skip the check when metadata is missing.
                  .filter(
                      (key) => !convertedMetadata || !isHiddenFilter(convertedMetadata, listReportPage.entitySet, key)
                  )
            : undefined;

    return {
        name: listReportPage.name,
        createButton: buildButtonState(buttonVisibility?.create),
        deleteButton: buildButtonState(buttonVisibility?.delete),
        filterBarItems,
        tableColumns: getTableColumnData(listReportPage.model, log),
        toolBarActions,
        isALP: manifest ? isALPFromManifest(manifest, listReportPage.name) : false,
        tableIdentifiers: getTableIdentifiers(manifest, listReportPage.name),
        semanticKey: {
            semanticKeyProperties,
            missingFromFilterBar: missingKeys?.length ? missingKeys : undefined
        }
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
        log?.warn(t('warn.noFilterFieldTests'));
    }

    return filterBarItems;
}

/**
 * Retrieves filter field property names paired with their translated labels from the page model.
 *
 * Used by the List Report path where custom filter fields must be matched by label rather
 * than by property, because their control ids do not follow the standard filter-field pattern.
 *
 * @param pageModel - the tree model containing filter bar definitions
 * @param log - optional logger instance
 * @returns - an array of `{ property, description }` entries
 */
export function getFilterFieldItems(pageModel: TreeModel, log?: Logger): { property: string; description: string }[] {
    let filterBarItems: { property: string; description: string }[] = [];

    try {
        const filterBarAggregations = getFilterFields(pageModel);
        filterBarItems = getSelectionFieldItemsWithLabels(filterBarAggregations);
    } catch (error) {
        log?.debug(error);
    }

    if (!filterBarItems.length) {
        log?.warn(t('warn.noFilterFieldTests'));
    }

    return filterBarItems;
}

/**
 * Extracts the property names of custom filter fields declared in the manifest.
 *
 * Custom filter fields render with a non-standard control id and so cannot be matched by
 * `iCheckFilterField({ property })`; callers fall back to matching them by label instead.
 *
 * @param manifest - the application manifest (may be undefined)
 * @param targetKey - routing target key of the List Report page
 * @returns set of custom filter field property names, empty if none or manifest missing
 */
export function getCustomFilterFieldProperties(
    manifest: Manifest | undefined,
    targetKey: string | undefined
): Set<string> {
    const custom = new Set<string>();
    if (!manifest || !targetKey) {
        return custom;
    }
    const target = manifest['sap.ui5']?.routing?.targets?.[targetKey] as
        | {
              options?: {
                  settings?: {
                      controlConfiguration?: Record<string, unknown>;
                  };
              };
          }
        | undefined;
    const controlConfiguration = target?.options?.settings?.controlConfiguration;
    if (!controlConfiguration || typeof controlConfiguration !== 'object') {
        return custom;
    }
    const selectionFieldsConfig = controlConfiguration['@com.sap.vocabularies.UI.v1.SelectionFields'] as
        { filterFields?: Record<string, { template?: string }> } | undefined;
    const filterFields = selectionFieldsConfig?.filterFields;
    if (!filterFields || typeof filterFields !== 'object') {
        return custom;
    }
    for (const [property, config] of Object.entries(filterFields)) {
        if (config && typeof config === 'object' && typeof config.template === 'string' && config.template.length > 0) {
            custom.add(property);
        }
    }
    return custom;
}

/**
 * Determines the non-custom tab keys for a multi-tab List Report, used to target a specific
 * table via `onTable("<key>")`. Custom tabs (backed by an app fragment) are skipped as they
 * typically host no queryable table.
 *
 * Returns an empty array for single-table List Reports, where `onTable()` resolves the table
 * without a tab id.
 *
 * @param manifest - the application manifest (may be undefined)
 * @param targetKey - routing target key of the List Report page
 * @returns array of non-custom tab keys in manifest order, empty for single-table LRs
 */
export function getTableIdentifiers(manifest: Manifest | undefined, targetKey: string | undefined): string[] {
    if (!manifest || !targetKey) {
        return [];
    }
    const target = manifest['sap.ui5']?.routing?.targets?.[targetKey] as
        | {
              options?: {
                  settings?: {
                      views?: {
                          paths?: Array<{ key?: string; template?: string } | undefined>;
                      };
                  };
              };
          }
        | undefined;
    const paths = target?.options?.settings?.views?.paths;
    if (!Array.isArray(paths) || paths.length === 0) {
        return [];
    }
    const identifiers: string[] = [];
    for (const path of paths) {
        if (
            path &&
            typeof path.key === 'string' &&
            path.key.length > 0 &&
            !(typeof path.template === 'string' && path.template.length > 0)
        ) {
            identifiers.push(path.key);
        }
    }
    // A single non-custom tab needs no tab-targeting; treat it like a single-table List Report.
    if (identifiers.length <= 1) {
        return [];
    }
    return identifiers;
}

/**
 * Retrieves the value of `@com.sap.vocabularies.Common.v1.Label` for a specific property
 * of the given entity set.
 *
 * Used as a fallback label source for custom filter fields whose manifest-declared label
 * is an unresolved i18n placeholder (e.g. `{i18n>Foo}`).
 *
 * @param convertedMetadata - already-converted OData metadata
 * @param entitySetName - name of the entity set that owns the property
 * @param propertyName - name of the property whose label should be read
 * @returns the label string, or undefined if not found
 */
export function getPropertyLabelFromMetadata(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    propertyName: string
): string | undefined {
    const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);
    const property = entitySet?.entityType?.entityProperties?.find((p) => p.name === propertyName);
    const label = property?.annotations?.Common?.Label;
    const labelStr = label !== undefined && label !== null ? String(label) : '';
    return labelStr.length > 0 ? labelStr : undefined;
}

/**
 * Returns true if the property is annotated with `@com.sap.vocabularies.UI.v1.HiddenFilter`.
 *
 * Properties with this annotation are excluded from the user's filter adaptation dialog.
 * Attempting to add them at runtime via `iAddAdaptationFilterField({ property })` fails
 * because the field is never offered by the dialog.
 *
 * @param convertedMetadata - already-converted OData metadata
 * @param entitySetName - name of the entity set that owns the property (undefined → false)
 * @param propertyName - name of the property to inspect
 * @returns true if the property is hidden from the filter adaptation dialog
 */
export function isHiddenFilter(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string | undefined,
    propertyName: string
): boolean {
    if (!entitySetName) {
        return false;
    }
    const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);
    const property = entitySet?.entityType?.entityProperties?.find((p) => p.name === propertyName);
    // The converted `@UI.HiddenFilter` value is a Boolean wrapper object (it carries annotation
    // metadata), so it is always truthy — `Boolean(x)` / `!== undefined` would treat an explicit
    // `HiddenFilter: false` as hidden. Coerce via `valueOf()` to read the underlying boolean.
    return property?.annotations?.UI?.HiddenFilter?.valueOf() === true;
}

/**
 * Checks the state of action buttons defined in UI.LineItem annotations for a given entity set.
 *
 * @param convertedMetadata The already-converted OData metadata
 * @param entitySetName The name of the entity set to check
 * @param actionNames Optional list of action names to filter (e.g., ['Check', 'deductDiscount']). If not provided, returns all actions.
 * @returns ActionButtonsResult containing the list of action buttons and their states
 * @throws {Error} If entity set is not found
 */
export function checkActionButtonStatesFromMetadata(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    actionNames?: string[]
): ActionButtonsResult {
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
        ? findActionStates(dataFieldForActions, actionNames, convertedMetadata)
        : extractAllActionStates(dataFieldForActions, convertedMetadata);

    return { actions, entityType: entityType.name };
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
        return checkActionButtonStatesFromMetadata(convert(parse(metadataXml)), entitySetName, actionNames);
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
 * @returns List of action button states for the specified actions
 */
function findActionStates(
    dataFieldForActions: DataFieldForAction[],
    actionNames: string[],
    metadata: ConvertedMetadata
): ActionButtonState[] {
    const actionStates: ActionButtonState[] = [];

    for (const actionName of actionNames) {
        const item = dataFieldForActions.find((dfa) => {
            const actionMethod = extractActionMethodName((dfa.Action as string) || '');
            return actionMethod === actionName || dfa.Label === actionName;
        });

        if (item) {
            actionStates.push(buildActionButtonState(item, metadata));
        }
    }

    return actionStates;
}

/**
 * Extracts action states for all DataFieldForAction items.
 *
 * @param dataFieldForActions List of DataFieldForAction items from UI.LineItem
 * @param metadata The converted metadata
 * @returns List of all action button states
 */
function extractAllActionStates(
    dataFieldForActions: DataFieldForAction[],
    metadata: ConvertedMetadata
): ActionButtonState[] {
    return dataFieldForActions.map((item) => buildActionButtonState(item, metadata));
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
            (key: keyof TreeAggregations) => (aggregations[key] as AggregationItem).description
        );
    }
    return [];
}

/**
 * Checks whether all SemanticKey properties for a given entity set appear as filter fields in the filter bar.
 * Returns false if the semantic key is absent, empty, or no semantic key properties are present as filters.
 *
 * @param pageModel - The tree model containing filter bar definitions (from ux-specification)
 * @param metadataXml - The OData metadata XML content as a string
 * @param entitySetName - The name of the entity set to inspect
 * @param log - optional logger instance
 * @returns true if every SemanticKey property appears in the filter bar, false otherwise
 */
export function isSemanticKeyInFilterBar(
    pageModel: TreeModel,
    metadataXml: string,
    entitySetName: string,
    log?: Logger
): boolean {
    try {
        const semanticKeys = getSemanticKeyProperties(metadataXml, entitySetName, false);
        if (!semanticKeys.length) {
            return false;
        }
        const filterFields = getFilterFieldNames(pageModel, log);
        return semanticKeys.every((key) => filterFields.includes(key));
    } catch (error) {
        log?.debug(
            `Failed to check semantic key in filter bar: ${error instanceof Error ? error.message : String(error)}`
        );
        return false;
    }
}

/**
 * Retrieves the SemanticKey PropertyPath values for a given entity set from already-converted metadata.
 *
 * @param convertedMetadata - The already-converted OData metadata
 * @param entitySetName - The name of the entity set to inspect
 * @param resolveLabels - when true, each property name is replaced with its Common.Label value (falling back to the property name); default false
 * @returns An array of PropertyPath string values (or their labels) from the SemanticKey annotation, or an empty array if not found
 * @throws {Error} If the entity set is not found
 */
export function getSemanticKeyPropertiesFromMetadata(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    resolveLabels = false
): string[] {
    const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);

    if (!entitySet) {
        throw new Error(`Entity set '${entitySetName}' not found in metadata`);
    }

    const semanticKey = entitySet.entityType.annotations?.Common?.SemanticKey;
    if (!semanticKey) {
        return [];
    }

    const propertyNames = semanticKey.map((entry) => entry.value).filter((v): v is string => typeof v === 'string');

    if (!resolveLabels) {
        return propertyNames;
    }

    return propertyNames.map((propName) => {
        const property = entitySet.entityType.entityProperties.find((p) => p.name === propName);
        const label = property?.annotations?.Common?.Label;
        const labelStr = label !== undefined && label !== null ? String(label) : '';
        return labelStr || propName;
    });
}

/**
 * Retrieves the SemanticKey PropertyPath values for a given entity set from OData metadata XML.
 * Returns the values of all PropertyPath entries in the SAP Common SemanticKey annotation on the entity type.
 *
 * @param metadataXml - The OData metadata XML content as a string
 * @param entitySetName - The name of the entity set to inspect
 * @param resolveLabels - when true, each property name is replaced with its Common.Label value (falling back to the property name); default false
 * @returns An array of PropertyPath string values (or their labels) from the SemanticKey annotation, or an empty array if not found
 * @throws {Error} If the metadata cannot be parsed or the entity set is not found
 */
export function getSemanticKeyProperties(metadataXml: string, entitySetName: string, resolveLabels = false): string[] {
    return getSemanticKeyPropertiesFromMetadata(convert(parse(metadataXml)), entitySetName, resolveLabels);
}
