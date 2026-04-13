import type { EntitySet } from '@sap-ux/vocabularies-types';

/**
 * Annotation pattern for RecursiveHierarchy.
 */
const RECURSIVE_HIERARCHY_ANNOTATION = 'RecursiveHierarchy';

/**
 * Checks if the given entity set has a Hierarchy.RecursiveHierarchy annotation.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
function hasRecursiveHierarchyForEntitySet(entitySet: EntitySet): boolean {
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
function hasAggregateTransformations(entitySet: EntitySet): boolean {
    const transformations =
        entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
        entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations;

    return Array.isArray(transformations) && transformations.length > 0;
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
function hasAggregateTransformationsForEntitySet(
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

/**
 * Determines table capabilities for a given entity set, analyzing its transformations and hierarchy.
 *
 * @param entitySet The entity set for which capabilities are being evaluated.
 * @param requiredTransformations An optional array of required transformation names to be considered.
 * @returns An object containing flags for aggregate transformations and recursive hierarchy specific to the entity set:
 * - `hasAggregateTransformations`: Indicates if aggregate transformations are present in general.
 * - `hasAggregateTransformationsForEntitySet`: Indicates if aggregate transformations are applicable to the specific entity set.
 * - `hasRecursiveHierarchyForEntitySet`: Indicates if a recursive hierarchy is present for the specific entity set.
 */
export function getTableCapabilitiesByEntitySet(
    entitySet: EntitySet,
    requiredTransformations?: readonly string[]
): {
    hasAggregateTransformations: boolean;
    hasAggregateTransformationsForEntitySet: boolean;
    hasRecursiveHierarchyForEntitySet: boolean;
} {
    return {
        hasAggregateTransformations: hasAggregateTransformations(entitySet),
        hasAggregateTransformationsForEntitySet: hasAggregateTransformationsForEntitySet(
            entitySet,
            requiredTransformations
        ),
        hasRecursiveHierarchyForEntitySet: hasRecursiveHierarchyForEntitySet(entitySet)
    };
}
