import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { transformationsRequiredForAnalyticalTable } from './manifest';
import { findEntitySetByName } from './entity-set';

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
 * Returns only entity sets that have the `Aggregation.ApplySupported` annotation term with the `Transformations` property.
 * This can be found within the entity set annotations or the entity type annotations.
 *
 * @param entitySets the entity sets to filter
 * @returns the filtered entity sets
 */
export function filterAggregateTransformations(entitySets: EntitySet[]): EntitySet[] {
    return entitySets.filter(hasAggregateTransformations);
}

/**
 * Checks if the given entity set name has aggregate transformations in the metadata.
 * If specific transformations are provided, checks if ALL of those transformations are present.
 * If no transformations are specified, returns true if ANY transformations are present.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for aggregate transformations.
 * @param requiredTransformations Optional array of specific transformations to check for. If not provided, checks for any transformations.
 * @returns true if the entity set has the required transformations, false otherwise.
 */
export function hasAggregateTransformationsForEntity(
    metadata: ConvertedMetadata,
    entitySetName: string,
    requiredTransformations?: readonly string[]
): boolean {
    const entitySet = findEntitySetByName(metadata, entitySetName);
    if (!entitySet) {
        return false;
    }

    return hasAggregateTransformationsForEntitySet(entitySet, requiredTransformations);
}
