import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { t } from '../i18n';

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
 * Annotation pattern for RecursiveHierarchy.
 */
const RECURSIVE_HIERARCHY_ANNOTATION = 'RecursiveHierarchy';

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

/**
 * Finds the RecursiveHierarchy annotation key for the given entity set.
 * This is a helper function that both existence check and qualifier extraction can use.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns The RecursiveHierarchy key if found, undefined otherwise.
 */
function findRecursiveHierarchyKey(entitySet: EntitySet): string | undefined {
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
 * Checks if the given entity set has a Hierarchy.RecursiveHierarchy annotation.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
export function hasRecursiveHierarchyForEntitySet(entitySet: EntitySet): boolean {
    return !!findRecursiveHierarchyKey(entitySet);
}

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
 * Converts an EDMX string to a ConvertedMetadata object.
 *
 * @param edmx - The EDMX string to convert.
 * @returns The converted metadata object.
 * @throws If the EDMX cannot be parsed or the OData version is unparseable.
 */
export function convertEdmxToConvertedMetadata(edmx: string): ConvertedMetadata {
    try {
        const convertedMetadata = convert(parse(edmx));
        const parsedOdataVersion = Number.parseInt(convertedMetadata?.version, 10);
        if (Number.isNaN(parsedOdataVersion)) {
            throw new TypeError(t('errors.unparseableOdataVersion'));
        }
        return convertedMetadata;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(t('errors.unparseableMetadata', { error: errorMessage }));
    }
}
