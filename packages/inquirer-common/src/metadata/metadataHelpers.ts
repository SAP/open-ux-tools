import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { t } from '../i18n';
import {
    findEntitySetByName,
    findRecursiveHierarchyKey,
    hasAggregateTransformations,
    hasAggregateTransformationsForEntitySet,
    hasRecursiveHierarchyForEntitySet
} from '@sap-ux/project-access';

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
