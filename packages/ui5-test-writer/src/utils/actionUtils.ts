import type { Action, ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import type { ActionButtonState, ButtonState, ButtonVisibilityResult } from '../types.js';
import type {
    ActionAnnotations,
    EntityContainerAnnotations
} from '@sap-ux/vocabularies-types/vocabularies/Edm_Types.js';
import type { DataFieldForAction } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import type { OperationAvailable } from '@sap-ux/vocabularies-types/vocabularies/Core.js';
import type {
    DeleteRestrictionsType,
    InsertRestrictionsType,
    UpdateRestrictionsType
} from '@sap-ux/vocabularies-types/vocabularies/Capabilities.js';
import type { Logger } from '@sap-ux/logger';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import { getMergedConvertedMetadata } from './metadataXmlUtils.js';

const DATA_FIELD_FOR_ACTION = 'DataFieldForAction';

/**
 * Collects the names of actions annotated with `Common.IsActionCritical`.
 *
 * @param metadataXml The service metadata XML (metadata.xml), or undefined
 * @param annotationXmls Annotation XML documents to merge, in manifest order
 * @returns The set of critical action method names (empty if none or on failure)
 */
export function getCriticalActionNames(metadataXml?: string, annotationXmls: string[] = []): Set<string> {
    const names = new Set<string>();
    try {
        const merged = getMergedConvertedMetadata(metadataXml, annotationXmls);
        for (const action of merged?.actions ?? []) {
            if (action.name && isActionCritical(merged as ConvertedMetadata, action.name)) {
                names.add(action.name);
            }
        }
    } catch {
        // On any parse/merge/convert failure, fall back to no critical actions.
    }
    return names;
}

type OperationAvailableWithPaths = OperationAvailable & { $Path?: string; path?: string };
type RestrictionValueWithPaths = (boolean | { $Path?: string; path?: string }) | undefined;
type EntityContainerAnnotationsWithActions = EntityContainerAnnotations & Record<string, ActionAnnotations>;
type DeletableRestrictionWithPath = DeleteRestrictionsType['Deletable'] & { $Path?: string; path?: string };
type InsertableRestrictionWithPath = InsertRestrictionsType['Insertable'] & { $Path?: string; path?: string };
type UpdatableRestrictionWithPath = UpdateRestrictionsType['Updatable'] & { $Path?: string; path?: string };

/**
 * Extracts the action method name from a fully qualified action string.
 *
 * @param actionName The fully qualified action name
 * @returns The action method name
 */
export function extractActionMethodName(actionName: string): string {
    const match = /\.([^.()]+)\(/.exec(actionName);
    if (match?.[1]) {
        return match[1];
    }

    const lastDotIndex = actionName.lastIndexOf('.');
    const parenIndex = actionName.indexOf('(');
    if (lastDotIndex >= 0 && parenIndex >= 0 && parenIndex > lastDotIndex) {
        return actionName.substring(lastDotIndex + 1, parenIndex);
    }

    // Handle namespace-qualified name without parentheses (spec model key format: "namespace.Method")
    if (lastDotIndex >= 0) {
        return actionName.substring(lastDotIndex + 1);
    }

    return actionName;
}

/**
 * Finds the Core.OperationAvailable annotation for a specific action.
 *
 * @param metadata The converted metadata
 * @param actionMethodName The action method name
 * @returns The OperationAvailable annotation value or undefined if not found
 */
export function findOperationAvailableAnnotation(
    metadata: ConvertedMetadata,
    actionMethodName: string
): OperationAvailableWithPaths | undefined {
    if (metadata.actions) {
        const foundAction = metadata.actions.find(
            (action) => action.name === actionMethodName || action.fullyQualifiedName?.includes(`.${actionMethodName}(`)
        );
        if (foundAction?.annotations?.Core?.OperationAvailable !== undefined) {
            return foundAction.annotations.Core.OperationAvailable;
        }
    }

    if (metadata.entityContainer?.annotations) {
        const annotations = metadata.entityContainer.annotations as EntityContainerAnnotationsWithActions;
        const matchingKey = Object.keys(annotations).find(
            (key) => key === actionMethodName || key.endsWith(`.${actionMethodName}`)
        );
        if (matchingKey && annotations[matchingKey]?.Core?.OperationAvailable !== undefined) {
            return annotations[matchingKey].Core.OperationAvailable;
        }
    }

    return undefined;
}

/**
 * Analyzes Core.OperationAvailable annotation to determine action availability.
 * Bound actions require a row/context selection to be invoked, so they are disabled by default
 * when no annotation is present.
 *
 * @param operationAvailable The OperationAvailable annotation value
 * @param requiresSelection Whether the action needs a selected context to be enabled (true for any bound action)
 * @returns Object containing enabled state and optional dynamic path
 */
export function analyzeOperationAvailability(
    operationAvailable: OperationAvailableWithPaths | undefined,
    requiresSelection?: boolean
): {
    enabled: boolean | 'dynamic';
    dynamicPath?: string;
} {
    if (operationAvailable === undefined) {
        return { enabled: !requiresSelection };
    }

    if (typeof operationAvailable === 'boolean') {
        return { enabled: operationAvailable };
    }

    if (typeof operationAvailable === 'object' && operationAvailable !== null) {
        const pathRecord = operationAvailable;
        const path = pathRecord.$Path ?? pathRecord.path;
        if (path) {
            return { enabled: 'dynamic', dynamicPath: path };
        }
    }

    return { enabled: true };
}

/**
 * Extracts the enum member value from an annotation.
 *
 * @param enumValue The enum value object
 * @returns The extracted enum value string
 */
export function extractEnumMemberValue(enumValue: unknown): string | undefined {
    if (typeof enumValue === 'string') {
        return enumValue;
    }
    const enumRecord = enumValue as Record<string, string> | undefined;
    if (enumRecord?.$EnumMember) {
        const parts = enumRecord.$EnumMember.split('/');
        return parts[1] ?? enumRecord.$EnumMember;
    }
    return undefined;
}

/**
 * Builds an ActionButtonState object from a DataFieldForAction annotation item.
 *
 * @param item The DataFieldForAction annotation item
 * @param metadata The converted metadata
 * @param criticalActions Optional set of action method names annotated Common.IsActionCritical
 * @returns ActionButtonState for the action
 */
export function buildActionButtonState(
    item: DataFieldForAction,
    metadata: ConvertedMetadata,
    criticalActions?: Set<string>
): ActionButtonState {
    const actionString = (item.Action as string) || '';
    const actionMethod = extractActionMethodName(actionString);
    const operationAvailable = findOperationAvailableAnnotation(metadata, actionMethod);
    // Any bound action (single- or collection-bound) requires a selected context to be invoked, so
    // it is disabled by default (no row selected)
    const isBound = item.ActionTarget?.isBound === true;
    const { enabled, dynamicPath } = analyzeOperationAvailability(operationAvailable, isBound);

    return {
        label: (item.Label as string) || '',
        action: actionMethod,
        service: metadata.namespace ?? '',
        unbound: !isBound,
        visible: true,
        enabled,
        dynamicPath,
        invocationGrouping: item.InvocationGrouping ? extractEnumMemberValue(item.InvocationGrouping) : undefined,
        isCritical: criticalActions?.has(actionMethod) ?? false
    };
}

/**
 * Builds an ActionButtonState from a spec model aggregation key.
 *
 * Key format: "DataFieldForAction::<namespace>.<Method>::<namespace>.<EntityType>"
 * Example:    "DataFieldForAction::com.example.Copy::com.example.POEntity".
 *
 * @param aggregationKey The spec model aggregation key for the action
 * @param label Display label from the spec model item description
 * @param convertedMetadata The converted OData metadata
 * @param schemaNamespace The OData schema namespace (used as service identifier)
 * @param criticalActions Optional set of action method names annotated Common.IsActionCritical
 * @returns ActionButtonState or undefined if the key is not a DataFieldForAction key
 */
export function buildActionStateFromSpecModelKey(
    aggregationKey: string,
    label: string | undefined,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string,
    criticalActions?: Set<string>
): ActionButtonState | undefined {
    const keyParts = aggregationKey.split('::');
    if (keyParts[0] !== DATA_FIELD_FOR_ACTION || !keyParts[1]) {
        return undefined;
    }

    const actionFullName = keyParts[1]; // "namespace.Method"
    const actionMethod = extractActionMethodName(actionFullName);

    const actionDefinition: Action | undefined = convertedMetadata.actions?.find(
        (action) => action.name === actionMethod || action.fullyQualifiedName?.includes(`.${actionMethod}(`)
    );
    const isBound = actionDefinition?.isBound === true;

    const operationAvailable = findOperationAvailableAnnotation(convertedMetadata, actionMethod);
    const { enabled, dynamicPath } = analyzeOperationAvailability(operationAvailable, isBound);

    return {
        label: label ?? '',
        action: actionMethod,
        service: schemaNamespace,
        unbound: !isBound,
        visible: true,
        enabled,
        dynamicPath,
        isCritical: criticalActions?.has(actionMethod) ?? false
    };
}

/**
 * Determines whether an action is annotated with `Common.IsActionCritical`.
 * Critical actions trigger a confirmation dialog at runtime.
 *
 * @param metadata The converted metadata
 * @param actionMethodName The action method name
 * @returns true if the action carries `Common.IsActionCritical` = true
 */
export function isActionCritical(metadata: ConvertedMetadata, actionMethodName: string): boolean {
    const foundAction = metadata.actions?.find(
        (action) => action.name === actionMethodName || action.fullyQualifiedName?.includes(`.${actionMethodName}(`)
    );
    const common = foundAction?.annotations?.Common as { IsActionCritical?: boolean } | undefined;
    return common?.IsActionCritical?.valueOf() === true;
}

/**
 * Analyzes a restriction value (Insertable, Deletable, or Updatable) to determine button state.
 *
 * @param value The annotation value — boolean, path object, or undefined
 * @returns ButtonState indicating visibility and enabled state
 */
export function analyzeRestrictionValue(value: RestrictionValueWithPaths): ButtonState {
    const defaultState: ButtonState = { visible: true, enabled: true };

    if (value === undefined || value === null) {
        return defaultState;
    }

    if (typeof value === 'boolean') {
        return { visible: value, enabled: value };
    }

    if (typeof value === 'object') {
        const path = value.$Path ?? value.path;
        if (path) {
            return { visible: true, enabled: 'dynamic', dynamicPath: path };
        }
    }

    return defaultState;
}

/**
 * Analyzes InsertRestrictions annotation to determine create button visibility and enabled state.
 *
 * @param restriction The InsertRestrictions annotation for the entity set
 * @returns ButtonState indicating visibility and enabled state based on the Insertable value
 */
export function analyzeInsertRestrictions(restriction: InsertRestrictionsType | undefined): ButtonState {
    const value = restriction ? (restriction['Insertable'] as InsertableRestrictionWithPath) : undefined;
    return analyzeRestrictionValue(value);
}

/**
 * Analyzes DeleteRestrictions annotation to determine delete button visibility and enabled state.
 *
 * @param restriction The DeleteRestrictions annotation for the entity set
 * @returns ButtonState indicating visibility and enabled state based on the Deletable value
 */
export function analyzeDeleteRestrictions(restriction: DeleteRestrictionsType | undefined): ButtonState {
    const value = restriction ? (restriction['Deletable'] as DeletableRestrictionWithPath) : undefined;
    return analyzeRestrictionValue(value);
}

/**
 * Analyzes UpdateRestrictions annotation to determine edit button visibility and enabled state.
 *
 * @param restriction The UpdateRestrictions annotation for the entity set
 * @returns ButtonState indicating visibility and enabled state based on the Updatable value
 */
export function analyzeUpdateRestrictions(restriction: UpdateRestrictionsType | undefined): ButtonState {
    const value = restriction ? (restriction['Updatable'] as UpdatableRestrictionWithPath) : undefined;
    return analyzeRestrictionValue(value);
}

/**
 * Checks the visibility and enabled state of create and delete buttons for a given entity set
 * by analyzing OData Capabilities annotations in the converted metadata.
 *
 * @param convertedMetadata The already-converted OData metadata
 * @param entitySetName The name of the entity set to check
 * @returns ButtonVisibilityResult containing the state of create and delete buttons
 * @throws {Error} If entity set is not found
 */
export function checkButtonVisibilityFromMetadata(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string
): ButtonVisibilityResult {
    const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);

    if (!entitySet) {
        throw new Error(`Entity set '${entitySetName}' not found in metadata`);
    }

    const insertRestrictions = entitySet.annotations?.Capabilities?.InsertRestrictions;
    const deleteRestrictions = entitySet.annotations?.Capabilities?.DeleteRestrictions;

    return {
        create: analyzeInsertRestrictions(insertRestrictions),
        delete: analyzeDeleteRestrictions(deleteRestrictions)
    };
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
        return checkButtonVisibilityFromMetadata(convert(parse(metadataXml)), entitySetName);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to analyze button visibility: ${errorMessage}`);
    }
}

/**
 * Checks the visibility and enabled state of the edit button for a given entity set
 * by analyzing UpdateRestrictions in the metadata.
 *
 * @param metadataXml The OData metadata XML content as a string
 * @param entitySetName The name of the entity set to check
 * @returns ButtonState for the edit button
 * @throws {Error} If metadata cannot be parsed or entity set is not found
 */
export function checkEditVisibility(metadataXml: string, entitySetName: string): ButtonState {
    try {
        const convertedMetadata: ConvertedMetadata = convert(parse(metadataXml));
        const entitySet = convertedMetadata.entitySets.find((es: EntitySet) => es.name === entitySetName);

        if (!entitySet) {
            throw new Error(`Entity set '${entitySetName}' not found in metadata`);
        }

        const updateRestrictions = entitySet.annotations?.Capabilities?.UpdateRestrictions;
        return analyzeUpdateRestrictions(updateRestrictions);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to analyze edit visibility: ${errorMessage}`);
    }
}

/**
 * Safely checks button visibility from already-converted metadata, with error handling.
 *
 * @param convertedMetadata The already-converted OData metadata
 * @param entitySetName The name of the entity set
 * @param log Optional logger instance
 * @returns Button visibility result or undefined if error occurs
 */
export function safeCheckButtonVisibilityFromMetadata(
    convertedMetadata: ConvertedMetadata,
    entitySetName: string,
    log?: Logger
): ButtonVisibilityResult | undefined {
    try {
        return checkButtonVisibilityFromMetadata(convertedMetadata, entitySetName);
    } catch (error) {
        log?.debug(`Failed to check button visibility: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
    }
}

/**
 * Safely checks button visibility with error handling.
 *
 * @param metadata The OData metadata XML content
 * @param entitySetName The name of the entity set
 * @param log Optional logger instance
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
 * Safely checks edit button visibility with error handling.
 *
 * @param metadata The OData metadata XML content
 * @param entitySetName The name of the entity set
 * @param log Optional logger instance
 * @returns ButtonState for the edit button, or undefined if error occurs
 */
export function safeCheckEditVisibility(
    metadata: string,
    entitySetName: string,
    log?: Logger
): ButtonState | undefined {
    try {
        return checkEditVisibility(metadata, entitySetName);
    } catch (error) {
        log?.debug(`Failed to check edit visibility: ${error instanceof Error ? error.message : String(error)}`);
        return undefined;
    }
}
