import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { findEntitySetByName } from './entity-set';

/**
 * Annotation pattern for RecursiveHierarchy.
 */
const RECURSIVE_HIERARCHY_ANNOTATION = 'RecursiveHierarchy';

/**
 * Gets the qualifier from a Hierarchy.RecursiveHierarchy annotation for the given entity set.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns The qualifier string if found, undefined otherwise.
 */
export function getRecursiveHierarchyQualifierForEntitySet(entitySet: EntitySet): string | undefined {
    return findRecursiveHierarchyKey(entitySet)?.split('#')[1];
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
 * Checks if the given entity set name has a Hierarchy.RecursiveHierarchy annotation in the metadata.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
export function hasRecursiveHierarchyForEntity(metadata: ConvertedMetadata, entitySetName: string): boolean {
    const entitySet = findEntitySetByName(metadata, entitySetName);
    if (!entitySet) {
        return false;
    }

    return hasRecursiveHierarchyForEntitySet(entitySet);
}

/**
 * Gets the qualifier from a Hierarchy.RecursiveHierarchy annotation for the given entity set.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for recursive hierarchy annotation.
 * @returns The qualifier string if found, undefined otherwise.
 */
export function getRecursiveHierarchyQualifier(metadata: ConvertedMetadata, entitySetName: string): string | undefined {
    const entitySet = findEntitySetByName(metadata, entitySetName);
    if (!entitySet) {
        return undefined;
    }

    return getRecursiveHierarchyQualifierForEntitySet(entitySet);
}
