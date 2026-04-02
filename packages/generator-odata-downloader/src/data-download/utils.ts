import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import { FioriElementsVersion, PageTypeV4, type Specification } from '@sap/ux-specification/dist/types/src';
import type { PagesV4 } from '@sap/ux-specification/dist/types/src/v4';
import { t } from '../utils/i18n';
import { ODataDownloadGenerator } from './odata-download-generator';
import type { EntitySetsFlat } from './odata-query';
import type { Entity, ReferencedEntities, SemanticKeyFilter, HierarchyEntity } from './types';
import { navPropNameExclusions } from './types';

/**
 * Merges entity set data by concatenating arrays and deduplicating using Set for O(n) performance.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged object with deduplicated arrays
 */
function mergeEntitySetData(
    target: { [key: string]: object[] },
    source: { [key: string]: object[] }
): { [key: string]: object[] } {
    for (const key of Object.keys(source)) {
        if (target[key]) {
            const seen = new Set(target[key].map((item) => JSON.stringify(item)));
            for (const item of source[key]) {
                const itemStr = JSON.stringify(item);
                if (!seen.has(itemStr)) {
                    seen.add(itemStr);
                    target[key].push(item);
                }
            }
        } else {
            target[key] = source[key];
        }
    }
    return target;
}
/**
 * Creates an object keyed on entity set name containing expanded results.
 *
 * @param odataResult - The OData result to process
 * @param entitySetsFlat - Map of entity paths to entity set names
 * @param entitySetName - The name of the entity set
 * @param hierarchyEntities - Optional hierarchy descriptors; when provided, root node parent properties are cleared
 * @returns Object keyed on entity set name containing entity data arrays
 */
export function createEntitySetData(
    odataResult: object | unknown[],
    entitySetsFlat: EntitySetsFlat,
    entitySetName: string,
    hierarchyEntities?: HierarchyEntity[]
): { [key: string]: object[] } {
    const resultDataByEntitySet: { [key: string]: object[] } = {};
    const odataRestulAsArray: Record<string, unknown>[] = Array.isArray(odataResult)
        ? (odataResult as Record<string, unknown>[])
        : [odataResult as Record<string, unknown>];

    // Track seen entities using JSON string as key for O(1) lookup
    // This tracks items added in this call (not from merges - those are handled by mergeEntitySetData)
    const seenInThisCall: { [key: string]: Set<string> } = {};

    // Each entry is of the same entity set data
    odataRestulAsArray.forEach((resultEntry) => {
        Object.entries(entitySetsFlat).forEach(([entityPath, entitySetName]) => {
            // There are nested expanded entities
            if (resultEntry[entityPath]) {
                const entitySetData = createEntitySetData(resultEntry[entityPath], entitySetsFlat, entitySetName);
                mergeEntitySetData(resultDataByEntitySet, entitySetData);
                // Since we have assigned the property value to its own entity set property we can remove it from the parent (to prevent dups and file bloat)
                delete resultEntry[entityPath];
            }
        });

        // Initialize seen set for this entity set if needed
        if (!seenInThisCall[entitySetName]) {
            // Build initial set from any existing data (could be from merges)
            seenInThisCall[entitySetName] = new Set(
                (resultDataByEntitySet[entitySetName] ?? []).map((item) => JSON.stringify(item))
            );
        }

        const entryStr = JSON.stringify(resultEntry);
        if (!seenInThisCall[entitySetName].has(entryStr)) {
            seenInThisCall[entitySetName].add(entryStr);
            if (resultDataByEntitySet[entitySetName]) {
                resultDataByEntitySet[entitySetName].push(resultEntry);
            } else {
                resultDataByEntitySet[entitySetName] = [resultEntry];
            }
        }
    });

    if (hierarchyEntities?.length) {
        normalizeHierarchyNodeIds(resultDataByEntitySet, hierarchyEntities);
        clearRootHierarchyParentProperty(resultDataByEntitySet, hierarchyEntities);
    }

    return resultDataByEntitySet;
}

/** Regex matching a 32-character uppercase hex string (ABAP RAW16 GUID without dashes). */
const upperHexGuidPattern = /^[0-9A-F]{32}$/;

/**
 * Converts a 32-character uppercase hex string to standard GUID format (lowercase, 8-4-4-4-12 dashes).
 *
 * @param hex - The 32-character hex string
 * @returns The GUID-formatted string
 */
function hexToGuid(hex: string): string {
    const h = hex.toLowerCase();
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Normalizes hierarchy NodeId values to match the parent property GUID format.
 * ABAP exposes the same underlying GUID in different formats depending on the EDM type:
 * Edm.Guid properties use lowercase with dashes, while Edm.String NodeId values use uppercase
 * hex without dashes. The mock data server uses strict equality to match parent-child relationships,
 * so the formats must be aligned.
 *
 * @param entityFileData - The entity set data map keyed by entity set name
 * @param hierarchyEntities - The detected hierarchy entity descriptors
 */
export function normalizeHierarchyNodeIds(
    entityFileData: { [key: string]: object[] },
    hierarchyEntities: HierarchyEntity[]
): void {
    for (const hierarchy of hierarchyEntities) {
        if (!['Edm.Guid', 'Edm.UUID'].includes(hierarchy.parentPropertyType)) {
            continue;
        }
        const pathParts = hierarchy.nodeProperty.split('/');
        for (const entityData of Object.values(entityFileData)) {
            for (const entity of entityData) {
                const record = entity as Record<string, unknown>;
                let nodeValue: string | undefined;
                if (pathParts.length > 1) {
                    const complexObj = record[pathParts[0]] as Record<string, unknown> | undefined;
                    nodeValue = complexObj?.[pathParts[1]] as string | undefined;
                } else {
                    nodeValue = record[pathParts[0]] as string | undefined;
                }
                if (typeof nodeValue === 'string' && upperHexGuidPattern.test(nodeValue)) {
                    const guidValue = hexToGuid(nodeValue);
                    if (pathParts.length > 1) {
                        (record[pathParts[0]] as Record<string, unknown>)[pathParts[1]] = guidValue;
                    } else {
                        record[pathParts[0]] = guidValue;
                    }
                }
            }
        }
    }
}

/**
 * Clears the parent property on root hierarchy nodes (DistanceFromRoot === 0).
 * The mock data server uses an empty parent property to determine the root of the hierarchy from the data.
 *
 * @param entityFileData - The entity set data map keyed by entity set name
 * @param hierarchyEntities - The detected hierarchy entity descriptors
 */
export function clearRootHierarchyParentProperty(
    entityFileData: { [key: string]: object[] },
    hierarchyEntities: HierarchyEntity[]
): void {
    for (const hierarchy of hierarchyEntities) {
        const pathParts = hierarchy.nodeProperty.split('/');
        for (const entityData of Object.values(entityFileData)) {
            for (const entity of entityData) {
                const record = entity as Record<string, unknown>;
                if (!(hierarchy.parentProperty in record)) {
                    continue;
                }
                const distanceFromRoot =
                    pathParts.length > 1
                        ? (record[pathParts[0]] as Record<string, unknown>)?.DistanceFromRoot
                        : record.DistanceFromRoot;
                if (distanceFromRoot === 0) {
                    record[hierarchy.parentProperty] = '';
                }
            }
        }
    }
}

/**
 * Load the system from store if available otherwise return as a new system choice.
 *
 * @param systemUrl - The system URL
 * @param client - The client number
 * @returns The system name or 'NewSystemChoice' if not found
 */
export async function getSystemNameFromStore(systemUrl: string, client?: string | number): Promise<string | undefined> {
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        logger: ODataDownloadGenerator.logger,
        entityName: 'system'
    });

    if (typeof client === 'number') {
        client = String(client);
    }
    const system = await systemStore.read(new BackendSystemKey({ url: systemUrl, client }));
    return system?.name ?? 'NewSystemChoice';
}
/**
 * Gets the semantic key properties from an entity type.
 *
 * @param entityType - The entity type to get semantic keys from
 * @returns Array of semantic key filters
 */
function getSemanticKeyProperties(entityType: EntityType): SemanticKeyFilter[] {
    const keyNames: SemanticKeyFilter[] = [];
    if (entityType?.annotations.Common?.SemanticKey) {
        const semanticKey = entityType.annotations.Common.SemanticKey;
        semanticKey.forEach((keyProperty) => {
            keyNames.push({
                name: keyProperty.value,
                type: keyProperty.$target?.type ?? 'Edm.String',
                value: undefined
            });
        });
    }
    // If no semantic key annotations defined use the key properties
    if (keyNames.length === 0) {
        entityType.keys.forEach((keyProperty) => {
            keyNames.push({
                name: keyProperty.name,
                type: keyProperty.type,
                value: undefined
            });
        });
    }
    return keyNames;
}

/**
 * Find the entity set of the specified type, since mock server needs the files to be named as entity set names.
 *
 * @param entitySets - Array of entity sets to search
 * @param entityTypeFullName - The fully qualified entity type name to find
 * @returns The matching entity set or undefined
 */
function findEntitySet(entitySets: EntitySet[], entityTypeFullName: string): EntitySet | undefined {
    return entitySets.find((entitySet) => entitySet.entityTypeName === entityTypeFullName);
}

/**
 * Gets the navigation property tree which will form the expand queries.
 * Certain property names will be excluded.
 * A limit to the depth can be provided.
 * If the same entity is found or its a leaf, recursion will stop to avoid infinite loops.
 *
 * @param entityType - The entity type to get navigation properties from
 * @param convertedMetadata - The converted metadata object
 * @param ancestorTypes - Keeps track of ancestors to prevent self referential loops and endless nested expansions
 * @param maxDepth - Maximum depth for recursion
 * @returns Array of navigation property entities
 */
function getNavPropsForExpansion(
    entityType: EntityType,
    convertedMetadata: ConvertedMetadata,
    ancestorTypes?: string[],
    maxDepth = 4
): Entity[] {
    const navPropEntities: Entity[] = [];
    if (--maxDepth > 0) {
        entityType.navigationProperties.forEach((entityTypeNavProp) => {
            // Exclude entities that are using specific property names
            if (!navPropNameExclusions.includes(entityTypeNavProp.name)) {
                let nestedNavPropEntities: Entity[] = [];
                if (entityTypeNavProp.targetType.navigationProperties.length > 0 && maxDepth > 0) {
                    nestedNavPropEntities = getNavPropsForExpansion(
                        entityTypeNavProp.targetType,
                        convertedMetadata,
                        ancestorTypes,
                        maxDepth
                    );
                }
                navPropEntities.push({
                    entityType: entityTypeNavProp.targetType,
                    entityPath: entityTypeNavProp.name,
                    entitySetName:
                        convertedMetadata.entitySets.find(
                            (entitySet) => entitySet.entityTypeName === entityTypeNavProp.targetTypeName
                        )?.name ?? 'Unknown',
                    navPropEntities: [...nestedNavPropEntities]
                });
            }
        });
    }
    return navPropEntities;
}

/**
 * Scans converted metadata for entity sets with Aggregation.RecursiveHierarchy annotations.
 * Extracts the node identifier property and parent reference property for each.
 *
 * @param convertedMetadata - The converted metadata object
 * @returns Array of hierarchy entity descriptors
 */
export function getHierarchyEntities(convertedMetadata: ConvertedMetadata): HierarchyEntity[] {
    const hierarchyEntities: HierarchyEntity[] = [];
    for (const entitySet of convertedMetadata.entitySets) {
        const aggregationAnnotations = entitySet.entityType?.annotations?.Aggregation;
        if (!aggregationAnnotations) {
            continue;
        }
        const hierarchyKey = Object.keys(aggregationAnnotations).find((key) => key.startsWith('RecursiveHierarchy'));
        if (!hierarchyKey) {
            continue;
        }
        const qualifier = hierarchyKey.split('#')[1] ?? '';
        const aggregationAnnotation = aggregationAnnotations[hierarchyKey as keyof typeof aggregationAnnotations];
        if (!aggregationAnnotation) {
            continue;
        }
        const nodeProperty = (aggregationAnnotation as { NodeProperty?: { value?: string } }).NodeProperty?.value;
        const parentNavProp = (
            aggregationAnnotation as {
                ParentNavigationProperty?: { $target?: { referentialConstraint?: { sourceProperty: string }[] } };
            }
        ).ParentNavigationProperty?.$target;
        const parentProperty = parentNavProp?.referentialConstraint?.[0]?.sourceProperty;

        if (nodeProperty && parentProperty) {
            const isDraft = entitySet.entityType.keys.some((key) => key.name === 'IsActiveEntity');
            const parentPropertyType =
                entitySet.entityType.entityProperties.find((prop) => prop.name === parentProperty)?.type ??
                'Edm.String';
            hierarchyEntities.push({
                entitySetName: entitySet.name,
                entityTypeName: entitySet.entityType.fullyQualifiedName,
                qualifier,
                nodeProperty,
                parentProperty,
                parentPropertyType,
                isDraft
            });
        }
    }
    if (hierarchyEntities.length) {
        ODataDownloadGenerator.logger.debug(
            `Hierarchy entities found: ${hierarchyEntities.map((h) => h.entitySetName).join(', ')}`
        );
    }
    return hierarchyEntities;
}

/**
 * Load the entity model for processing to determine the odata queries that are relevant for the application.
 *
 * @param appAccess - Application access reference
 * @param specification - The specification instance
 * @param remoteMetadata - The backend service metadata, as distinct to the local metadata
 * @returns The referenced entities or undefined if not found
 */
export async function getEntityModel(
    appAccess: ApplicationAccess,
    specification: Specification,
    remoteMetadata: string
): Promise<ReferencedEntities | undefined> {
    let entities: ReferencedEntities | undefined;
    const mainService = appAccess.app.services['mainService'];

    if (mainService.local) {
        const convertedMetadata = convert(parse(remoteMetadata));
        const appConfig = await specification.readApp({ app: appAccess });

        if (
            appConfig.applicationModel &&
            appConfig.applicationModel?.target?.fioriElements == FioriElementsVersion.v4
        ) {
            const appModel = appConfig.applicationModel;
            const pages = appModel.pages as unknown as PagesV4;
            let mainListEntityType: EntityType | undefined;
            const pageObjectEntities: Entity[] = [];

            // Get all the app referenced pages and list entity
            Object.values(pages).forEach((page) => {
                // Get the main list entity
                if (page.pageType === PageTypeV4.ListReport && page.entityType && page.entitySet) {
                    mainListEntityType = convertedMetadata.entityTypes.find(
                        (et) => et.fullyQualifiedName === page.entityType
                    );
                    if (mainListEntityType) {
                        const entityKeys = getSemanticKeyProperties(mainListEntityType);
                        entities = {
                            listEntity: {
                                entitySetName: page.entitySet,
                                semanticKeys: entityKeys,
                                entityPath: page.entitySet,
                                entityType: mainListEntityType
                            }
                        };

                        // Add nav props of the list entity
                        entities.listEntity.navPropEntities = getNavPropsForExpansion(
                            mainListEntityType,
                            convertedMetadata
                        );
                    }
                } else if (page.pageType === PageTypeV4.ObjectPage && page.entityType && page.entitySet) {
                    // Dont add the page object for the main entity since it will be the query root entity set
                    if (
                        page.entitySet &&
                        page.entityType &&
                        page.entityType !== mainListEntityType?.fullyQualifiedName
                    ) {
                        const objectPageEntitySet = findEntitySet(convertedMetadata.entitySets, page.entityType);
                        const pageEntity: Entity = {
                            entityPath: page.navigationProperty!,
                            entitySetName: page.entitySet,
                            entityType: objectPageEntitySet?.entityType,
                            page
                        };
                        pageObjectEntities.push(pageEntity);
                    }
                }
            });

            if (!entities?.listEntity) {
                ODataDownloadGenerator.logger.info(t('info.noListEntityDefined'));
                return undefined;
            }
            entities.pageObjectEntities = pageObjectEntities;
            entities.hierarchyEntities = getHierarchyEntities(convertedMetadata);
        }
    }
    return entities;
}
