import type { Action, ActionParameter, ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import type { ActionButtonState, ButtonState, ButtonVisibilityResult } from '../types';
import type { ActionAnnotations, EntityContainerAnnotations } from '@sap-ux/vocabularies-types/vocabularies/Edm_Types';
import type { DataFieldForAction } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { OperationAvailable } from '@sap-ux/vocabularies-types/vocabularies/Core';
import type {
    DeleteRestrictionsType,
    InsertRestrictionsType,
    UpdateRestrictionsType
} from '@sap-ux/vocabularies-types/vocabularies/Capabilities';
import type { Logger } from '@sap-ux/logger';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';

const DATA_FIELD_FOR_ACTION = 'DataFieldForAction';

type OperationAvailableWithPaths = OperationAvailable & { $Path?: string; path?: string };
type RestrictionValueWithPaths = (boolean | { $Path?: string; path?: string }) | undefined;

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
        const annotations = metadata.entityContainer.annotations as EntityContainerAnnotations &
            Record<string, ActionAnnotations>;
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
 * Single-entity bound actions (requiring row selection) are disabled by default when no annotation is present.
 *
 * @param operationAvailable The OperationAvailable annotation value
 * @param isEntityBound Whether the action is bound to a single entity (requires row selection to enable)
 * @returns Object containing enabled state and optional dynamic path
 */
export function analyzeOperationAvailability(
    operationAvailable: OperationAvailableWithPaths | undefined,
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
 * @returns ActionButtonState for the action
 */
export function buildActionButtonState(item: DataFieldForAction, metadata: ConvertedMetadata): ActionButtonState {
    const actionString = (item.Action as string) || '';
    const actionMethod = extractActionMethodName(actionString);
    const operationAvailable = findOperationAvailableAnnotation(metadata, actionMethod);
    // Bound actions whose binding parameter is a single entity (not a collection) require
    // row selection to be invoked, so they are disabled by default (no row selected).
    // Collection-bound actions operate on the entity set and are always enabled.
    const actionTarget = item.ActionTarget;
    const isEntityBound = actionTarget?.isBound === true && actionTarget?.parameters?.[0]?.isCollection !== true;
    const { enabled, dynamicPath } = analyzeOperationAvailability(operationAvailable, isEntityBound);

    return {
        label: (item.Label as string) || '',
        action: actionString,
        visible: true,
        enabled,
        dynamicPath,
        invocationGrouping: item.InvocationGrouping ? extractEnumMemberValue(item.InvocationGrouping) : undefined
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
 * @returns ActionButtonState or undefined if the key is not a DataFieldForAction key
 */
export function buildActionStateFromSpecModelKey(
    aggregationKey: string,
    label: string | undefined,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string
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
    const firstParameter: ActionParameter | undefined = actionDefinition?.parameters?.[0];
    const isEntityBound = actionDefinition?.isBound === true && firstParameter?.isCollection !== true;

    const operationAvailable = findOperationAvailableAnnotation(convertedMetadata, actionMethod);
    const { enabled, dynamicPath } = analyzeOperationAvailability(operationAvailable, isEntityBound);

    return {
        label: label ?? '',
        action: actionMethod,
        service: schemaNamespace,
        unbound: !isEntityBound,
        visible: true,
        enabled,
        dynamicPath
    };
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
    const value = restriction
        ? (restriction['Insertable'] as (typeof restriction)['Insertable'] & { $Path?: string; path?: string })
        : undefined;
    return analyzeRestrictionValue(value);
}

/**
 * Analyzes DeleteRestrictions annotation to determine delete button visibility and enabled state.
 *
 * @param restriction The DeleteRestrictions annotation for the entity set
 * @returns ButtonState indicating visibility and enabled state based on the Deletable value
 */
export function analyzeDeleteRestrictions(restriction: DeleteRestrictionsType | undefined): ButtonState {
    const value = restriction
        ? (restriction['Deletable'] as (typeof restriction)['Deletable'] & { $Path?: string; path?: string })
        : undefined;
    return analyzeRestrictionValue(value);
}

/**
 * Analyzes UpdateRestrictions annotation to determine edit button visibility and enabled state.
 *
 * @param restriction The UpdateRestrictions annotation for the entity set
 * @returns ButtonState indicating visibility and enabled state based on the Updatable value
 */
export function analyzeUpdateRestrictions(restriction: UpdateRestrictionsType | undefined): ButtonState {
    const value = restriction
        ? (restriction['Updatable'] as (typeof restriction)['Updatable'] & { $Path?: string; path?: string })
        : undefined;
    return analyzeRestrictionValue(value);
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
            | InsertRestrictionsType
            | undefined;
        const deleteRestrictions = entitySet.annotations?.Capabilities?.DeleteRestrictions as
            | DeleteRestrictionsType
            | undefined;

        return {
            create: analyzeInsertRestrictions(insertRestrictions),
            delete: analyzeDeleteRestrictions(deleteRestrictions)
        };
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

        const updateRestrictions = entitySet.annotations?.Capabilities?.UpdateRestrictions as
            | UpdateRestrictionsType
            | undefined;
        return analyzeUpdateRestrictions(updateRestrictions);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to analyze edit visibility: ${errorMessage}`);
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
