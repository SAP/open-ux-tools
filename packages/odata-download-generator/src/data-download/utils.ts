import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import { FioriElementsVersion, PageTypeV4, type Specification } from '@sap/ux-specification/dist/types/src';
import type { PagesV4 } from '@sap/ux-specification/dist/types/src/v4';
import { isEqual, mergeWith, uniqWith } from 'lodash';
import { ODataDownloadGenerator } from './odata-download-generator';
import type { EntitySetsFlat } from './odata-query';
import type { Entity, ReferencedEntities, SemanticKeyFilter } from './types';
import { navPropNameExclusions } from './types';

/**
 * Merge array properties by removing dups and concatenating.
 *
 * @param objValue - The destination value
 * @param srcValue - The source value
 * @returns The merged array or undefined
 */
function mergeCustomizer(objValue: unknown, srcValue: unknown): unknown[] | undefined {
    if (Array.isArray(objValue)) {
        return uniqWith(objValue.concat(srcValue), isEqual);
    }
    return undefined;
}
/**
 * Creates an object keyed on entity set name containing expanded results.
 *
 * @param odataResult - The OData result to process
 * @param entitySetsFlat - Map of entity paths to entity set names
 * @param entitySetName - The name of the entity set
 * @returns Object keyed on entity set name containing entity data arrays
 */
export function createEntitySetData(
    odataResult: object | unknown[],
    entitySetsFlat: EntitySetsFlat,
    entitySetName: string
): { [key: string]: object[] } {
    const resultDataByEntitySet: { [key: string]: object[] } = {};
    const odataRestulAsArray: Record<string, unknown>[] = Array.isArray(odataResult)
        ? (odataResult as Record<string, unknown>[])
        : [odataResult as Record<string, unknown>];

    // Each entry is of the same entity set data
    odataRestulAsArray.forEach((resultEntry) => {
        Object.entries(entitySetsFlat).forEach(([entityPath, entitySetName]) => {
            // There are nested expanded entities
            if (resultEntry[entityPath]) {
                const entitySetData = createEntitySetData(resultEntry[entityPath], entitySetsFlat, entitySetName);
                mergeWith(resultDataByEntitySet, entitySetData, mergeCustomizer);
                // Since we have assigned the property value to its own entity set property we can remove it from the parent (to prevent dups and file bloat)
                delete resultEntry[entityPath];
            }
        });
        if (resultDataByEntitySet[entitySetName]) {
            // prevent duplicates, this would break the mock data server but can be returned from queries
            const found = resultDataByEntitySet[entitySetName].find((entity) => isEqual(entity, resultEntry));
            if (!found) {
                resultDataByEntitySet[entitySetName].push(resultEntry);
            }
        } else {
            resultDataByEntitySet[entitySetName] = [resultEntry];
        }
    });

    return resultDataByEntitySet;
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
                ODataDownloadGenerator.logger.info(
                    'No list entity defined. A main list entity is required for data downloading.'
                );
                return undefined;
            }
            entities.pageObjectEntities = pageObjectEntities;
        }
    }
    return entities;
}
