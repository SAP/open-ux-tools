import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';

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
