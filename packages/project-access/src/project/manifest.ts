import { OdataVersion, type TableType, type TemplateType } from '../types';
import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';

/**
 * Annotation pattern for RecursiveHierarchy.
 */
const RECURSIVE_HIERARCHY_ANNOTATION = 'RecursiveHierarchy';

/**
 * Required transformations for analytical table support.
 * NOTE: This constant is primarily used by odata-service-inquirer but is exported
 * here to maintain backward compatibility with external packages that import it.
 */
export const transformationsRequiredForAnalyticalTable = [
    'filter',
    'identity',
    'orderby',
    'skip',
    'top',
    'groupby',
    'aggregate',
    'concat'
] as const;

/**
 * Get the default table type based on the template type and entity capabilities.
 *
 * @param templateType the template type of the application to be generated
 * @param metadata the metadata (edmx) string of the service
 * @param odataVersion the OData version of the service
 * @param isCapService whether the service is a CAP service or not
 * @param mainEntitySetName the name of the main entity set
 * @returns the optimal table type for the given entity
 */
export function getDefaultTableType(
    templateType: TemplateType,
    metadata: ConvertedMetadata,
    odataVersion: OdataVersion,
    isCapService: boolean,
    mainEntitySetName?: string
): TableType {
    // Find the entity set once for all annotation checks
    const entitySet = mainEntitySetName ? findEntitySetByName(metadata, mainEntitySetName) : undefined;

    // Handle ALP template with OData v2 - always use AnalyticalTable
    if (templateType === 'alp' && odataVersion === OdataVersion.v2) {
        return 'AnalyticalTable';
    }

    // Handle OData v4 specific logic
    if (odataVersion === OdataVersion.v4 && entitySet) {
        const canUseAnalytical = templateType === 'lrop' || templateType === 'worklist' || templateType === 'alp';
        const hasHierarchy = hasRecursiveHierarchyForEntitySet(entitySet);
        const hasAnalyticalData = hasAggregateTransformations(entitySet);

        // Check for analytical capabilities first (highest priority)
        if (canUseAnalytical && hasAnalyticalData) {
            // For CAP services, any analytical data is sufficient
            // For non-CAP services, require complete transformations
            const hasAnalyticalCapabilities = shouldUseAnalyticalTable(entitySet, !isCapService);
            if (hasAnalyticalCapabilities) {
                return 'AnalyticalTable';
            }
        }

        // Check for hierarchical data only (no analytical data or analytical requirements not met)
        if ((templateType === 'lrop' || templateType === 'worklist') && hasHierarchy) {
            return 'TreeTable';
        }
    }

    // Default fallback to ResponsiveTable
    return 'ResponsiveTable';
}

/**
 * Finds an entity set by name in the metadata.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The name of the entity set to find.
 * @returns The entity set if found, undefined otherwise.
 */
export function findEntitySetByName(metadata: ConvertedMetadata, entitySetName: string): EntitySet | undefined {
    return metadata.entitySets.find((entitySet) => entitySet.name === entitySetName);
}

/**
 * Checks if the given entity set has a Hierarchy.RecursiveHierarchy annotation.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
export function hasRecursiveHierarchyForEntitySet(entitySet: EntitySet): boolean {
    return !!findRecursiveHierarchyKey(entitySet);
}

/**
 * Finds the RecursiveHierarchy annotation key for the given entity set.
 * This is a helper function that both existence check and qualifier extraction can use.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns The RecursiveHierarchy key if found, undefined otherwise.
 */
export function findRecursiveHierarchyKey(entitySet: EntitySet): string | undefined {
    const hierarchyAnnotations = entitySet?.entityType?.annotations?.Hierarchy;

    if (!hierarchyAnnotations) {
        return undefined;
    }

    // First try exact match for the most common case
    if (hierarchyAnnotations[RECURSIVE_HIERARCHY_ANNOTATION]) {
        return RECURSIVE_HIERARCHY_ANNOTATION;
    }

    // Then check for qualified versions (RecursiveHierarchy#qualifier)
    return Object.keys(hierarchyAnnotations).find((key) => key.startsWith(RECURSIVE_HIERARCHY_ANNOTATION));
}

/**
 * Checks if the given entity set has aggregate transformations.
 * Returns true if ANY transformations are present in either entity set or entity type annotations.
 *
 * @param entitySet The entity set to check for aggregate transformations.
 * @returns true if the entity set has any aggregate transformations, false otherwise.
 */
export function hasAggregateTransformations(entitySet: EntitySet): boolean {
    const transformations =
        entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
        entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations;

    return Array.isArray(transformations) && transformations.length > 0;
}

/**
 * Determines if AnalyticalTable should be used based on entity annotations and transformation requirements.
 *
 * AnalyticalTable is used when entity has analytical data and meets the specified transformation requirements.
 *
 * @param entitySet The entity set to check for annotations.
 * @param requireCompleteTransformations Whether to require all analytical transformations or accept any analytical annotations.
 * @returns True if AnalyticalTable should be used, false otherwise.
 */
export function shouldUseAnalyticalTable(entitySet: EntitySet, requireCompleteTransformations: boolean): boolean {
    // No analytical data means no need for AnalyticalTable
    if (!hasAggregateTransformations(entitySet)) {
        return false;
    }

    // If complete transformations are not required, any analytical annotations are sufficient
    if (!requireCompleteTransformations) {
        return true;
    }

    // Require complete analytical transformations
    return hasAggregateTransformationsForEntitySet(entitySet, transformationsRequiredForAnalyticalTable);
}

/**
 * Checks if the given entity set has aggregate transformations.
 * If specific transformations are provided, checks if ALL of those transformations are present.
 * If no transformations are specified, returns true if ANY transformations are present.
 *
 * @param entitySet The entity set to check for aggregate transformations.
 * @param requiredTransformations Optional array of specific transformations to check for. If not provided, checks for any transformations.
 * @returns true if the entity set has the required transformations, false otherwise.
 */
export function hasAggregateTransformationsForEntitySet(
    entitySet: EntitySet,
    requiredTransformations?: readonly string[]
): boolean {
    const transformations =
        entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
        entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations;

    if (!Array.isArray(transformations)) {
        return false;
    }

    // If no specific transformations required, return true if any transformations exist
    if (!requiredTransformations || requiredTransformations.length === 0) {
        return transformations.length > 0;
    }

    // Check if all required transformations are present
    return requiredTransformations.every((transformation) => transformations.includes(transformation));
}
