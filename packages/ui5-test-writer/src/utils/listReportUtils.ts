import type { Logger } from '@sap-ux/logger';
import type {
    TreeAggregation,
    TreeAggregations,
    TreeModel
} from '@sap/ux-specification/dist/types/src/parser/index.js';
import type {
    ActionButtonsResult,
    ActionButtonState,
    ButtonState,
    FEV4ManifestTarget,
    FilterBarItem,
    FilterDefaultValue,
    ListReportFeatures,
    ListReportTab,
    SortOrderItem,
    TextAnnotationColumn
} from '../types.js';
import {
    getFilterFields,
    getSelectionFieldItems,
    getSelectionFieldItemsWithLabels,
    getTableColumnData,
    type AggregationItem,
    getAggregations
} from './modelUtils.js';
import { type I18nLabelResolver, passthroughLabelResolver } from './i18nUtils.js';
import {
    extractContactCardColumnsFromNode,
    extractContactCardColumnsFromTableNode,
    extractTableColumnsFromTableNode,
    extractTextAnnotationColumnsFromNode,
    extractTextAnnotationColumnsFromTableNode,
    extractBoundColumnPropertiesFromTableNode,
    resolvePrimaryTableNode,
    resolveViewTableNodes
} from './tableUtils.js';
import type { TextAnnotationColumnCandidate } from './tableUtils.js';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import { parse, merge } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import {
    extractActionMethodName,
    buildActionButtonState,
    buildMenuActionState,
    isMenuActionItem,
    collectCriticalActionNames,
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
 * @param criticalActions - Optional set of action method names annotated Common.IsActionCritical
 * @returns Array of action button states or empty array if error occurs
 */
export function safeCheckActionButtonStates(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    actionNames: string[],
    log?: Logger,
    criticalActions?: Set<string>
): ActionButtonState[] {
    try {
        return checkActionButtonStatesFromMetadata(convertedMetadata, entitySetName, actionNames, criticalActions)
            .actions;
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
 * Resolves raw text-annotation candidates into the template shape, deduplicating the text-property test
 * per text target. Each candidate asserts its own code column and text target independently; when columns
 * share a text target, only the first emits the text-property test (the rest set `skipTextPropertyTest`).
 *
 * @param candidates - raw candidates (one table or one tab)
 * @param isAnalyticalTable - true when the view renders an AnalyticalTable, which cannot sort nav-path targets
 * @returns the text-annotation columns to emit tests for
 */
function buildTextAnnotationColumns(
    candidates: TextAnnotationColumnCandidate[],
    isAnalyticalTable = false
): TextAnnotationColumn[] {
    const seenTextProperties = new Set<string>();
    return candidates.map((candidate) => {
        const skipTextPropertyTest = seenTextProperties.has(candidate.textProperty);
        seenTextProperties.add(candidate.textProperty);
        // An AnalyticalTable can only sort properties of the aggregated entity, not a nav-path target.
        const textPropertyNotSortable = isAnalyticalTable && candidate.textProperty.includes('/');
        return {
            columnProperty: candidate.columnProperty,
            textProperty: candidate.textProperty,
            skipTextPropertyTest,
            textPropertyNotSortable
        };
    });
}

/**
 * Derives text-annotation candidates for a view by reading each bound column's `Common.Text` target off
 * the shared entity type. Fallback for secondary multi-tab views, where `@sap/ux-specification` resolves
 * `properties.text` only on the primary view but the annotation is in metadata for every view.
 *
 * @param columnProperties - the view's bound column property names (in column order)
 * @param convertedMetadata - converted OData metadata, source of the `Common.Text` target
 * @param entitySet - entity set backing the view (undefined yields no candidates)
 * @returns candidate columns with their bound property and the text annotation target property
 */
export function extractTextAnnotationCandidatesFromMetadata(
    columnProperties: string[],
    convertedMetadata: ConvertedMetadata,
    entitySet: string | undefined
): TextAnnotationColumnCandidate[] {
    if (!entitySet) {
        return [];
    }
    const resolvedEntitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySet);
    const entityProperties = resolvedEntitySet?.entityType?.entityProperties;
    if (!entityProperties) {
        return [];
    }
    const candidates: TextAnnotationColumnCandidate[] = [];
    for (const columnProperty of columnProperties) {
        const property = entityProperties.find((p) => p.name === columnProperty);
        const text = property?.annotations?.Common?.Text;
        // `Common.Text` is a path expression at runtime; vocabularies-types widens it, so narrow via a guard.
        const textPath =
            text && typeof text === 'object' && 'type' in text && text.type === 'Path' && typeof text.path === 'string'
                ? text.path
                : undefined;
        // "None" (any casing) is the spec-model sentinel for "no text annotation".
        if (!textPath || textPath.toLowerCase() === 'none') {
            continue;
        }
        candidates.push({ columnProperty, textProperty: textPath });
    }
    return candidates;
}

/**
 * Resolves the PresentationVariant and SelectionVariant from the entity type annotations,
 * following the fallback chain: qualified SPV/PV (via annotationPath) → unqualified SPV → unqualified PV/SV.
 *
 * @param entityType - the converted entity type to read annotations from
 * @param annotationPath - optional full annotation path string (e.g. `UI.SelectionPresentationVariant#VAR2`)
 * @returns the resolved presentationVariant and selectionVariant objects, or undefined for each if not found
 */
function resolveVariantAnnotation(
    entityType: EntityType,
    annotationPath?: string
): { presentationVariant: unknown; selectionVariant: unknown } {
    const ui = (entityType.annotations as Record<string, unknown>)?.UI as Record<string, unknown> | undefined;
    if (!ui) {
        return { presentationVariant: undefined, selectionVariant: undefined };
    }
    if (annotationPath) {
        return resolveVariantFromPath(ui, annotationPath);
    }
    const spv = ui.SelectionPresentationVariant as Record<string, unknown> | undefined;
    if (spv) {
        return { presentationVariant: spv.PresentationVariant, selectionVariant: spv.SelectionVariant };
    }
    return { presentationVariant: ui.PresentationVariant, selectionVariant: ui.SelectionVariant };
}

/**
 * Resolves a variant annotation from a qualified annotationPath string.
 *
 * @param ui - the UI annotation map from the entity type
 * @param annotationPath - the full annotation path (e.g. `UI.SelectionPresentationVariant#VAR2`)
 * @returns the resolved presentationVariant and selectionVariant objects
 */
function resolveVariantFromPath(
    ui: Record<string, unknown>,
    annotationPath: string
): { presentationVariant: unknown; selectionVariant: unknown } {
    const hashIndex = annotationPath.indexOf('#');
    const qualifier = hashIndex >= 0 ? annotationPath.slice(hashIndex + 1) : undefined;
    const term = annotationPath.slice(annotationPath.lastIndexOf('.') + 1, hashIndex >= 0 ? hashIndex : undefined);
    const key = qualifier ? `${term}#${qualifier}` : term;
    const entry = ui[key] as Record<string, unknown> | undefined;
    if (!entry) {
        return { presentationVariant: undefined, selectionVariant: undefined };
    }
    if (term === 'SelectionPresentationVariant') {
        return { presentationVariant: entry.PresentationVariant, selectionVariant: entry.SelectionVariant };
    }
    if (term === 'PresentationVariant') {
        return { presentationVariant: entry, selectionVariant: undefined };
    }
    if (term === 'SelectionVariant') {
        return { presentationVariant: undefined, selectionVariant: entry };
    }
    return { presentationVariant: undefined, selectionVariant: undefined };
}

/**
 * Extracts default sort order items from a PresentationVariant on the given entity set.
 *
 * @param convertedMetadata - converted OData metadata
 * @param entitySetName - the entity set name
 * @param annotationPath - optional annotationPath from the tab's view config (multi-tab)
 * @returns array of sort order items, empty if no PV or no SortOrder defined
 */
export function getDefaultSortOrder(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    annotationPath?: string
): SortOrderItem[] {
    const entitySet = convertedMetadata.entitySets.find((es) => es.name === entitySetName);
    const entityType = entitySet?.entityType as EntityType | undefined;
    if (!entityType) {
        return [];
    }
    const { presentationVariant } = resolveVariantAnnotation(entityType, annotationPath);
    const sortOrder = (presentationVariant as Record<string, unknown> | undefined)?.SortOrder as unknown[] | undefined;
    if (!sortOrder?.length) {
        return [];
    }
    return sortOrder.flatMap((entry) => {
        const sortEntry = entry as Record<string, unknown>;
        const property = (sortEntry.Property as Record<string, unknown> | undefined)?.value as string | undefined;
        if (!property) {
            return [];
        }
        const desc = sortEntry.Descending as Record<string, unknown> | boolean | undefined;
        const descending = typeof desc === 'boolean' ? desc : desc?.valueOf?.() === true;
        return [{ property, descending: !!descending }];
    });
}

/**
 * Extracts default filter values from a SelectionVariant on the given entity set (single-table LR only).
 * Only Sign=I ranges are included. IsDigitSequence properties are zero-padded to maxLength.
 * Supports EQ, BT, LE, GE, LT, GT, NE operators.
 *
 * @param convertedMetadata - converted OData metadata
 * @param entitySetName - the entity set name
 * @returns array of filter default values, empty if no SV or no applicable ranges
 */
export function getDefaultFilterValues(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string
): FilterDefaultValue[] {
    const entitySet = convertedMetadata.entitySets.find((es) => es.name === entitySetName);
    const entityType = entitySet?.entityType as EntityType | undefined;
    if (!entityType) {
        return [];
    }
    const { selectionVariant } = resolveVariantAnnotation(entityType);
    const selectOptions = (selectionVariant as Record<string, unknown> | undefined)?.SelectOptions as
        unknown[] | undefined;
    if (!selectOptions?.length) {
        return [];
    }
    return selectOptions.flatMap((option) => extractFilterItem(option as Record<string, unknown>, entityType));
}

const SUPPORTED_OPERATORS = new Set(['EQ', 'BT', 'LE', 'GE', 'LT', 'GT', 'NE']);

/**
 * Zero-pads a filter value to the property's maxLength when the property has Common.IsDigitSequence.
 *
 * @param val - the raw Low value from the SelectionRangeType
 * @param propertyName - the OData property name
 * @param entityType - the entity type to look up property metadata
 * @returns the normalized value, zero-padded if the property is a digit sequence
 */
function normalizeFilterValue(val: string, propertyName: string, entityType: EntityType): string {
    const prop = entityType.entityProperties.find((p) => p.name === propertyName);
    const isDigitSeq =
        ((prop?.annotations as Record<string, unknown>)?.Common as Record<string, unknown>)?.IsDigitSequence === true;
    const maxLength = prop?.maxLength as number | undefined;
    return isDigitSeq && maxLength ? val.padStart(maxLength, '0') : val;
}

/**
 * Extracts a single FilterDefaultValue from one SelectOptionType entry, or empty if no applicable range.
 *
 * @param selectOption - a raw SelectOptionType record from the converted metadata
 * @param entityType - the entity type to look up property metadata for normalization
 * @returns array with one FilterDefaultValue if an applicable range is found, empty otherwise
 */
function extractFilterItem(selectOption: Record<string, unknown>, entityType: EntityType): FilterDefaultValue[] {
    const propertyName = (selectOption.PropertyName as Record<string, unknown> | undefined)?.value as
        string | undefined;
    if (!propertyName) {
        return [];
    }
    const ranges = selectOption.Ranges as unknown[] | undefined;
    for (const range of ranges ?? []) {
        const r = range as Record<string, unknown>;
        const sign = (r.Sign as string | undefined)?.split('/').pop();
        const operator = (r.Option as string | undefined)?.split('/').pop();
        if (sign !== 'I' || !operator || !SUPPORTED_OPERATORS.has(operator)) {
            continue;
        }
        const low = r.Low as string | undefined;
        if (low === undefined) {
            continue;
        }
        const value = normalizeFilterValue(low, propertyName, entityType);
        const item: FilterDefaultValue = { property: propertyName, value, ...(operator !== 'EQ' && { operator }) };
        if (operator === 'BT') {
            const high = r.High as string | undefined;
            if (high !== undefined) {
                item.value2 = normalizeFilterValue(high, propertyName, entityType);
            }
        }
        return [item];
    }
    return [];
}

/**
 * Builds a single FilterBarItem, resolving i18n labels for custom filter fields via OData metadata.
 *
 * @param entry - the raw filter field entry with property name and description
 * @param entry.property - the OData property name of the filter field
 * @param entry.description - the rendered label of the filter field
 * @param customFilterFieldProperties - set of property names declared as custom filter fields in the manifest
 * @param convertedMetadata - optional converted OData metadata for label resolution
 * @param entitySetName - the entity set name for metadata lookup
 * @returns the resolved FilterBarItem
 */
function buildFilterBarItem(
    entry: { property: string; description: string },
    customFilterFieldProperties: Set<string>,
    convertedMetadata: ConvertedMetadata | undefined,
    entitySetName: string | undefined
): FilterBarItem {
    const custom = customFilterFieldProperties.has(entry.property);
    let description = entry.description;
    if (
        custom &&
        typeof description === 'string' &&
        description.startsWith('{i18n>') &&
        convertedMetadata &&
        entitySetName
    ) {
        const resolved = getPropertyLabelFromMetadata(convertedMetadata, entitySetName, entry.property);
        if (resolved) {
            description = resolved;
        }
    }
    return { property: entry.property, description, custom };
}

/**
 * Parses and converts OData metadata, extracting button visibility, semantic key properties, and toolbar actions.
 *
 * @param metadata - raw metadata XML string
 * @param entitySetName - the entity set name
 * @param toolbarActions - raw toolbar action names to resolve
 * @param log - optional logger
 * @param annotationXmls - annotation XML documents to merge
 * @returns converted metadata and extracted features, or empty defaults if parsing fails
 */
function convertMetadataFeatures(
    metadata: string | undefined,
    entitySetName: string | undefined,
    toolbarActions: string[],
    log: Logger | undefined,
    annotationXmls: string[]
): {
    convertedMetadata: ConvertedMetadata | undefined;
    buttonVisibility: ReturnType<typeof safeCheckButtonVisibility> | undefined;
    semanticKeyProperties: string[] | undefined;
    toolBarActions: ActionButtonState[];
} {
    if (!metadata || !entitySetName) {
        return {
            convertedMetadata: undefined,
            buttonVisibility: undefined,
            semanticKeyProperties: undefined,
            toolBarActions: []
        };
    }
    try {
        // Merge local annotation files with the service metadata before converting. Each source must be parsed
        // with a distinct fileId; otherwise merge treats them as the same file and later `Annotations` blocks
        // overwrite (rather than complement) the metadata's property-level annotations.
        const parsedAnnotations = annotationXmls.map((xml, index) => parse(xml, `annotationFile${index}`));
        const rawMetadata = parsedAnnotations.length
            ? merge(parse(metadata, 'metadata'), ...parsedAnnotations)
            : parse(metadata);
        const convertedMetadata = convert(rawMetadata);
        // IsActionCritical is an annotation-only term surfaced by the merge above; read it off the
        // already-converted metadata rather than re-parsing.
        const criticalActions = collectCriticalActionNames(convertedMetadata);
        return {
            convertedMetadata,
            buttonVisibility: safeCheckButtonVisibilityFromMetadata(convertedMetadata, entitySetName, log),
            semanticKeyProperties: safeGetSemanticKeyProperties(convertedMetadata, entitySetName, log),
            toolBarActions: safeCheckActionButtonStates(
                convertedMetadata,
                entitySetName,
                toolbarActions,
                log,
                criticalActions
            )
        };
    } catch (error) {
        log?.debug(`Failed to parse metadata: ${error instanceof Error ? error.message : String(error)}`);
        return {
            convertedMetadata: undefined,
            buttonVisibility: undefined,
            semanticKeyProperties: undefined,
            toolBarActions: []
        };
    }
}

/**
 * Gets List Report features from the page model using ux-specification.
 *
 * @param listReportPage - the List Report page containing the tree model with feature definitions
 * @param log - optional logger instance
 * @param metadata - optional metadata for the OPA test generation
 * @param manifest - optional application manifest, used to detect ALP configuration
 * @param resolveLabel - resolver for i18n placeholder labels (`{i18n>key}` → translated text)
 * @param annotationXmls - optional annotation XML documents to merge with the metadata (for annotation-only terms)
 * @returns feature data extracted from the List Report page model
 */
export function getListReportFeatures(
    listReportPage: PageWithModelV4,
    log?: Logger,
    metadata?: string,
    manifest?: Manifest,
    resolveLabel: I18nLabelResolver = passthroughLabelResolver,
    annotationXmls: string[] = []
): ListReportFeatures {
    const toolbarActions = getToolBarActionNames(listReportPage.model, log);
    const filterFieldEntries = getFilterFieldItems(listReportPage.model, log);
    const customFilterFieldProperties = getCustomFilterFieldProperties(manifest, listReportPage.name);

    const {
        convertedMetadata,
        buttonVisibility,
        semanticKeyProperties,
        toolBarActions: metadataActions
    } = convertMetadataFeatures(metadata, listReportPage.entitySet, toolbarActions, log, annotationXmls);

    let toolBarActions = metadataActions;
    toolBarActions = toolBarActions.concat(
        extractCustomToolBarActions(listReportPage.model, resolveLabel, convertedMetadata)
    );

    // Custom filter fields are matched by rendered label, so resolve unresolved i18n
    // placeholders via the property's OData `@Common.Label`.
    const filterBarItems: FilterBarItem[] = filterFieldEntries.map((entry) =>
        buildFilterBarItem(entry, customFilterFieldProperties, convertedMetadata, listReportPage.entitySet)
    );

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

    // A maintained text annotation emits sort tests for both the code column and its text target.
    const meta = convertedMetadata;
    const isAnalyticalTable = getViewTableType(manifest, listReportPage.name) === 'AnalyticalTable';
    const textAnnotationColumns: TextAnnotationColumn[] = meta
        ? buildTextAnnotationColumns(extractTextAnnotationColumnsFromNode(listReportPage.model.root), isAnalyticalTable)
        : [];

    const tabs = getListReportTabs(listReportPage, convertedMetadata, manifest, resolveLabel, log);
    const entitySet = listReportPage.entitySet ?? '';
    const defaultSortOrder = convertedMetadata && !tabs.length ? getDefaultSortOrder(convertedMetadata, entitySet) : [];
    const defaultFilterValues =
        convertedMetadata && !tabs.length ? getDefaultFilterValues(convertedMetadata, entitySet) : [];

    return {
        name: listReportPage.name,
        createButton: buildButtonState(buttonVisibility?.create),
        deleteButton: buildButtonState(buttonVisibility?.delete),
        filterBarItems,
        tableColumns: getTableColumnData(listReportPage.model, log),
        contactCardColumns: extractContactCardColumnsFromNode(listReportPage.model.root),
        toolBarActions,
        textAnnotationColumns,
        columnPersonalizationSupported: isColumnPersonalizationEnabled(
            manifest,
            listReportPage.name,
            listReportPage.contextPath
        ),
        isALP: manifest ? isALPFromManifest(manifest, listReportPage.name) : false,
        tableIdentifiers: getTableIdentifiers(manifest, listReportPage.name),
        tabs,
        semanticKey: {
            semanticKeyProperties,
            missingFromFilterBar: missingKeys?.length ? missingKeys : undefined
        },
        ...(defaultSortOrder.length && { defaultSortOrder }),
        ...(defaultFilterValues.length && { defaultFilterValues })
    };
}

/**
 * Retrieves toolbar action definitions from a resolved table node.
 *
 * @param tableNode - the table node holding the `toolBar` aggregation
 * @returns The toolbar actions aggregation object.
 */
export function getToolBarActionsFromTableNode(tableNode: TreeAggregation): TreeAggregations {
    const toolBar = getAggregations(tableNode)['toolBar'];
    const toolBarAggregations = getAggregations(toolBar);
    const actions = toolBarAggregations['actions'];
    return getAggregations(actions);
}

/**
 * Retrieves toolbar action definitions from the given tree model.
 *
 * @param pageModel - The tree model containing toolbar definitions.
 * @returns The toolbar actions aggregation object.
 */
export function getToolBarActions(pageModel: TreeModel): TreeAggregations {
    const tableNode = resolvePrimaryTableNode(pageModel.root);
    if (!tableNode) {
        return {} as TreeAggregations;
    }
    return getToolBarActionsFromTableNode(tableNode);
}

/**
 * Extracts custom (manifest-declared) and menu (drop-down) toolbar actions from the given toolbar
 * actions aggregation. Annotation-backed single actions are handled separately via the OData metadata
 * path, so they are not emitted here.
 *
 * @param actionAggregations - the toolbar actions aggregation
 * @param resolveLabel - resolver for i18n placeholder labels
 * @param convertedMetadata - converted OData metadata, required to resolve annotation-backed menu children
 * @returns array of custom and menu toolbar action button states
 */
function extractCustomToolBarActionsFromAggregation(
    actionAggregations: TreeAggregations,
    resolveLabel: I18nLabelResolver,
    convertedMetadata?: ConvertedMetadata
): ActionButtonState[] {
    const schemaNamespace = convertedMetadata?.namespace ?? '';
    const actions: ActionButtonState[] = [];
    for (const key of Object.keys(actionAggregations ?? {})) {
        const item = actionAggregations[key as keyof TreeAggregations] as unknown as AggregationItem;
        if (isMenuActionItem(item)) {
            actions.push(buildMenuActionState(item, convertedMetadata, schemaNamespace, resolveLabel));
            continue;
        }
        if (item?.schema?.actionType !== 'Custom') {
            continue;
        }
        const { label, unresolved } = resolveLabel(item.description);
        if (label) {
            actions.push({
                label,
                action: '',
                visible: true,
                enabled: true,
                custom: true,
                labelUnresolved: unresolved || undefined
            });
        }
    }
    return actions;
}

/**
 * Extracts custom (manifest-declared) and menu (drop-down) toolbar actions from a resolved table node.
 *
 * @param tableNode - the table node holding the `toolBar` aggregation
 * @param resolveLabel - resolver for i18n placeholder labels
 * @param convertedMetadata - converted OData metadata, required to resolve annotation-backed menu children
 * @returns array of custom and menu toolbar action button states
 */
export function extractCustomToolBarActionsFromTableNode(
    tableNode: TreeAggregation,
    resolveLabel: I18nLabelResolver,
    convertedMetadata?: ConvertedMetadata
): ActionButtonState[] {
    return extractCustomToolBarActionsFromAggregation(
        getToolBarActionsFromTableNode(tableNode),
        resolveLabel,
        convertedMetadata
    );
}

/**
 * Extracts custom (manifest-declared) and menu (drop-down) toolbar actions from the List Report table toolbar.
 *
 * @param pageModel - the tree model containing the table toolbar definitions
 * @param resolveLabel - resolver for i18n placeholder labels
 * @param convertedMetadata - converted OData metadata, required to resolve annotation-backed menu children
 * @returns array of custom and menu toolbar action button states
 */
export function extractCustomToolBarActions(
    pageModel: TreeModel,
    resolveLabel: I18nLabelResolver,
    convertedMetadata?: ConvertedMetadata
): ActionButtonState[] {
    return extractCustomToolBarActionsFromAggregation(getToolBarActions(pageModel), resolveLabel, convertedMetadata);
}

/**
 * Builds the per-tab feature data for a multi-table (Multiple Table Mode) List Report. Each non-custom
 * tab is described by its own columns, contact-card columns, toolbar actions and create/delete state,
 * resolved against that tab's entity set. Returns an empty array for single-table List Reports.
 *
 * @param listReportPage - the List Report page containing the tree model with per-tab table nodes
 * @param convertedMetadata - already-converted OData metadata (undefined disables action/button state resolution)
 * @param manifest - the application manifest, source of the non-custom tab keys and their entity sets
 * @param resolveLabel - resolver for i18n placeholder labels
 * @param log - optional logger instance
 * @returns per-tab feature data in manifest order, empty for single-table List Reports
 */
export function getListReportTabs(
    listReportPage: PageWithModelV4,
    convertedMetadata: ConvertedMetadata | undefined,
    manifest?: Manifest,
    resolveLabel: I18nLabelResolver = passthroughLabelResolver,
    log?: Logger
): ListReportTab[] {
    const views = getListReportViews(manifest, listReportPage.name);
    if (views.length <= 1) {
        return [];
    }
    const viewNodes = resolveViewTableNodes(listReportPage.model.root);
    const nodeByKey = new Map(viewNodes.map((entry) => [entry.key, entry.node]));
    const criticalActions = collectCriticalActionNames(convertedMetadata);
    const tabs: ListReportTab[] = [];
    views.forEach((view, index) => {
        // Match the spec-model view node by key; fall back to model order (both lists exclude custom tabs).
        const tableNode = nodeByKey.get(view.key) ?? viewNodes[index]?.node;
        if (!tableNode) {
            return;
        }
        const entitySet = view.entitySet ?? listReportPage.entitySet;
        let toolBarActions: ActionButtonState[] = [];
        let createButton = buildButtonState();
        let deleteButton = buildButtonState();
        if (convertedMetadata && entitySet) {
            const actionNames = getToolBarActionItems(getToolBarActionsFromTableNode(tableNode));
            toolBarActions = safeCheckActionButtonStates(
                convertedMetadata,
                entitySet,
                actionNames,
                log,
                criticalActions
            );
            const buttonVisibility = safeCheckButtonVisibilityFromMetadata(convertedMetadata, entitySet, log);
            createButton = buildButtonState(buttonVisibility?.create);
            deleteButton = buildButtonState(buttonVisibility?.delete);
        }
        toolBarActions = toolBarActions.concat(
            extractCustomToolBarActionsFromTableNode(tableNode, resolveLabel, convertedMetadata)
        );
        // Secondary tabs yield no spec-model candidates (only the primary view resolves `properties.text`),
        // so fall back to the shared entity type's `Common.Text` metadata.
        let textAnnotationColumns: TextAnnotationColumn[] = [];
        if (convertedMetadata) {
            let candidates = extractTextAnnotationColumnsFromTableNode(tableNode);
            if (candidates.length === 0) {
                candidates = extractTextAnnotationCandidatesFromMetadata(
                    extractBoundColumnPropertiesFromTableNode(tableNode),
                    convertedMetadata,
                    entitySet
                );
            }
            const isAnalyticalTable =
                getViewTableType(manifest, listReportPage.name, view.annotationPath) === 'AnalyticalTable';
            textAnnotationColumns = buildTextAnnotationColumns(candidates, isAnalyticalTable);
        }
        const defaultSortOrder =
            convertedMetadata && entitySet
                ? getDefaultSortOrder(convertedMetadata, entitySet, view.annotationPath)
                : [];
        tabs.push({
            key: view.key,
            entitySet,
            tableColumns: extractTableColumnsFromTableNode(tableNode),
            contactCardColumns: extractContactCardColumnsFromTableNode(tableNode),
            toolBarActions,
            createButton,
            deleteButton,
            textAnnotationColumns,
            columnPersonalizationSupported: isViewColumnPersonalizationEnabled(
                manifest,
                listReportPage.name,
                view.annotationPath
            ),
            ...(defaultSortOrder.length && { defaultSortOrder })
        });
    });
    return tabs;
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
 * Finds the LineItem control-configuration entry for the default table.
 *
 * @param controlConfiguration - the target's `options.settings.controlConfiguration`
 * @param contextPath - the page's context path (e.g. `/Travel`), used to match CAP-style prefixed keys
 * @returns the matched LineItem control-configuration value, or undefined if it cannot be identified
 */
function findDefaultTableLineItemConfig(
    controlConfiguration: Record<string, unknown>,
    contextPath?: string
): { tableSettings?: { personalization?: boolean | Record<string, unknown> } } | undefined {
    const lineItemTerm = '@com.sap.vocabularies.UI.v1.LineItem';
    const isLineItemKey = (key: string): boolean => {
        const segment = key.substring(key.lastIndexOf('/') + 1);
        return segment === lineItemTerm || segment.startsWith(`${lineItemTerm}#`);
    };
    const lineItemKeys = Object.keys(controlConfiguration).filter(isLineItemKey);

    let key: string | undefined;
    if (lineItemKeys.length === 1) {
        key = lineItemKeys[0];
    } else if (contextPath) {
        // Multiple LineItem keys: only resolve when exactly one is scoped to this page's context path.
        const bareUnderContext = `${contextPath}/${lineItemTerm}`;
        if (controlConfiguration[bareUnderContext]) {
            key = bareUnderContext;
        } else {
            const underContext = lineItemKeys.filter((candidate) => candidate.startsWith(`${contextPath}/`));
            key = underContext.length === 1 ? underContext[0] : undefined;
        }
    }

    return key
        ? (controlConfiguration[key] as { tableSettings?: { personalization?: boolean | Record<string, unknown> } })
        : undefined;
}

/**
 * Determines whether the List Report table exposes column personalization (the "Columns" adaptation dialog).
 *
 * @param manifest - the application manifest (may be undefined)
 * @param targetKey - routing target key of the List Report page
 * @param contextPath - the page's context path, used to resolve CAP-style prefixed LineItem keys
 * @returns true if the column-adaptation dialog is available for the table
 */
export function isColumnPersonalizationEnabled(
    manifest: Manifest | undefined,
    targetKey: string | undefined,
    contextPath?: string
): boolean {
    if (!manifest || !targetKey) {
        return true;
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
        return true;
    }
    const lineItemConfig = findDefaultTableLineItemConfig(controlConfiguration, contextPath);
    return interpretColumnPersonalization(lineItemConfig?.tableSettings?.personalization);
}

/**
 * Interprets a `tableSettings.personalization` manifest value: a boolean is used directly; an object
 * enables personalization only when `column === true`; `null`/`undefined` is the Fiori elements default (enabled).
 *
 * @param personalization - the raw `tableSettings.personalization` value
 * @returns true if column personalization is enabled
 */
function interpretColumnPersonalization(personalization: boolean | Record<string, unknown> | undefined): boolean {
    if (typeof personalization === 'boolean') {
        return personalization;
    }
    if (typeof personalization === 'object' && personalization !== null) {
        return personalization.column === true;
    }
    return true;
}

/**
 * Resolves column personalization for a single multi-tab view, selecting the LineItem entry by the
 * view's `annotationPath` qualifier and falling back to the unqualified `@…UI.v1.LineItem`.
 *
 * @param manifest - the application manifest (may be undefined)
 * @param targetKey - routing target key of the List Report page
 * @param annotationPath - the view's `annotationPath` (its SV/SPV qualifier source)
 * @returns true if the column-adaptation dialog is available for that view's table
 */
export function isViewColumnPersonalizationEnabled(
    manifest: Manifest | undefined,
    targetKey: string | undefined,
    annotationPath?: string
): boolean {
    if (!manifest || !targetKey) {
        return true;
    }
    const target = manifest['sap.ui5']?.routing?.targets?.[targetKey] as
        { options?: { settings?: { controlConfiguration?: Record<string, unknown> } } } | undefined;
    const controlConfiguration = target?.options?.settings?.controlConfiguration;
    if (!controlConfiguration || typeof controlConfiguration !== 'object') {
        return true;
    }
    const lineItemTerm = '@com.sap.vocabularies.UI.v1.LineItem';
    const hashIndex = annotationPath?.indexOf('#') ?? -1;
    const qualifier = hashIndex >= 0 ? annotationPath?.slice(hashIndex + 1) : undefined;
    const entry =
        (qualifier && controlConfiguration[`${lineItemTerm}#${qualifier}`]) ?? controlConfiguration[lineItemTerm];
    const tableSettings = (entry as { tableSettings?: { personalization?: boolean | Record<string, unknown> } })
        ?.tableSettings;
    return interpretColumnPersonalization(tableSettings?.personalization);
}

/**
 * Resolves a view's MDC table type (e.g. `GridTable`, `AnalyticalTable`, `ResponsiveTable`) from the
 * manifest, using the same qualifier matching as {@link isViewColumnPersonalizationEnabled}.
 *
 * @param manifest - the application manifest (may be undefined)
 * @param targetKey - routing target key of the List Report page
 * @param annotationPath - the view's `annotationPath` (its SV/SPV qualifier source)
 * @returns the configured table type, or undefined when none is set (MDC default is ResponsiveTable)
 */
export function getViewTableType(
    manifest: Manifest | undefined,
    targetKey: string | undefined,
    annotationPath?: string
): string | undefined {
    if (!manifest || !targetKey) {
        return undefined;
    }
    const target = manifest['sap.ui5']?.routing?.targets?.[targetKey] as
        { options?: { settings?: { controlConfiguration?: Record<string, unknown> } } } | undefined;
    const controlConfiguration = target?.options?.settings?.controlConfiguration;
    if (!controlConfiguration || typeof controlConfiguration !== 'object') {
        return undefined;
    }
    const lineItemTerm = '@com.sap.vocabularies.UI.v1.LineItem';
    const hashIndex = annotationPath?.indexOf('#') ?? -1;
    const qualifier = hashIndex >= 0 ? annotationPath?.slice(hashIndex + 1) : undefined;
    const entry =
        (qualifier && controlConfiguration[`${lineItemTerm}#${qualifier}`]) ?? controlConfiguration[lineItemTerm];
    const type = (entry as { tableSettings?: { type?: unknown } })?.tableSettings?.type;
    return typeof type === 'string' ? type : undefined;
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
                          paths?: Array<{ key?: string; entitySet?: string; template?: string } | undefined>;
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
 * Returns the non-custom view tabs of a List Report with their optional entity set, in manifest
 * order, used to map an Object Page to the tab that exposes it. Custom tabs (backed by an app
 * fragment via `template`) are skipped as they host no navigable table.
 *
 * @param manifest - the application manifest (may be undefined)
 * @param targetKey - routing target key of the List Report page
 * @returns array of `{ key, entitySet? }` for non-custom tabs, empty when there is no views block
 */
export function getListReportViews(
    manifest: Manifest | undefined,
    targetKey: string | undefined
): { key: string; entitySet?: string; annotationPath?: string }[] {
    if (!manifest || !targetKey) {
        return [];
    }
    const target = manifest['sap.ui5']?.routing?.targets?.[targetKey] as FEV4ManifestTarget | undefined;
    const paths = target?.options?.settings?.views?.paths;
    if (!Array.isArray(paths)) {
        return [];
    }
    const views: { key: string; entitySet?: string; annotationPath?: string }[] = [];
    for (const path of paths) {
        if (
            path &&
            typeof path.key === 'string' &&
            path.key.length > 0 &&
            !(typeof path.template === 'string' && path.template.length > 0)
        ) {
            views.push({ key: path.key, entitySet: path.entitySet, annotationPath: path.annotationPath });
        }
    }
    return views;
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
 * @param criticalActions Optional set of action method names annotated Common.IsActionCritical
 * @returns ActionButtonsResult containing the list of action buttons and their states
 * @throws {Error} If entity set is not found
 */
export function checkActionButtonStatesFromMetadata(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    actionNames?: string[],
    criticalActions?: Set<string>
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
        ? findActionStates(dataFieldForActions, actionNames, convertedMetadata, criticalActions)
        : extractAllActionStates(dataFieldForActions, convertedMetadata, criticalActions);

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
 * @param criticalActions - Optional set of action method names annotated Common.IsActionCritical
 * @returns List of action button states for the specified actions
 */
function findActionStates(
    dataFieldForActions: DataFieldForAction[],
    actionNames: string[],
    metadata: ConvertedMetadata,
    criticalActions?: Set<string>
): ActionButtonState[] {
    const actionStates: ActionButtonState[] = [];

    for (const actionName of actionNames) {
        const item = dataFieldForActions.find((dfa) => {
            const actionMethod = extractActionMethodName((dfa.Action as string) || '');
            return actionMethod === actionName || dfa.Label === actionName;
        });

        if (item) {
            actionStates.push(buildActionButtonState(item, metadata, criticalActions));
        }
    }

    return actionStates;
}

/**
 * Extracts action states for all DataFieldForAction items.
 *
 * @param dataFieldForActions List of DataFieldForAction items from UI.LineItem
 * @param metadata The converted metadata
 * @param criticalActions Optional set of action method names annotated Common.IsActionCritical
 * @returns List of all action button states
 */
function extractAllActionStates(
    dataFieldForActions: DataFieldForAction[],
    metadata: ConvertedMetadata,
    criticalActions?: Set<string>
): ActionButtonState[] {
    return dataFieldForActions.map((item) => buildActionButtonState(item, metadata, criticalActions));
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
