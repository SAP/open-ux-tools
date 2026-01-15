import { convertEdmxToConvertedMetadata } from '@sap-ux/inquirer-common';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import type { AppConfig, Entity, ReferencedEntities, SemanticKeyFilter } from './types';
import { navPropNameExclusions } from './types';
import { FioriElementsVersion, PageTypeV4, type Specification } from '@sap/ux-specification/dist/types/src';
import type { PagesV4 } from '@sap/ux-specification/dist/types/src/v4';
import { isEqual, mergeWith, uniqWith } from 'lodash';
import type { EntitySetsFlat } from './odata-query';
import { ODataDownloadGenerator } from './odataDownloadGenerator';

/**
 * Merge array properties by removing dups and concating
 *
 * @param objValue
 * @param srcValue
 */
function mergeCustomizer(objValue, srcValue) {
    if (Array.isArray(objValue)) {
        return uniqWith(objValue.concat(srcValue), isEqual);
    }
}
/**
 * Creates an object keyed on entity set name containing expanded results
 *
 * @param odataResult
 * @param entitySetsFlat
 * @param entitySetName
 */
export function createEntitySetData(
    odataResult: {} | [],
    entitySetsFlat: EntitySetsFlat,
    entitySetName: string
): { [key: string]: {}[] } {
    const resultDataByEntitySet: { [key: string]: {}[] } = {};
    const odataRestulAsArray = Array.isArray(odataResult) ? odataResult : [odataResult];

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
        //let entityData = Array.isArray(resultEntry) ? resultEntry : [resultEntry];
        if (resultDataByEntitySet[entitySetName]) {
            resultDataByEntitySet[entitySetName].push(resultEntry);
        } else {
            resultDataByEntitySet[entitySetName] = [resultEntry];
        }

        /* if (nodeEntity.navPropEntities) {
                // Traverse each nav property and add to entity set data
                nodeEntity.navPropEntities?.forEach((entity: Entity) => {
                    // get nav prop data if expanded
                    const expandedEntityData = resultEntry[entity.entityPath];
                    if (expandedEntityData) {
                        const entitySetData = createEntitySetData(expandedEntityData, entity);
                        merge(resultDataByEntitySet, entitySetData);
                    }
                });
            } else {
                // We are at a leaf, assign the data to an entity set file
                let entityData = Array.isArray(odataResult) ? odataResult : [odataResult];
                if (resultDataByEntitySet[nodeEntity.entitySetName]) {
                    resultDataByEntitySet[nodeEntity.entitySetName].push(...entityData);
                } else {
                    resultDataByEntitySet[nodeEntity.entitySetName] = [...entityData];
                }
            } */
    });

    return resultDataByEntitySet;
}

/**
 * Load the system from store if available otherwise return as a new system choice.
 *
 * @param systemUrl
 * @param client
 * @returns
 */
export async function getSystemNameFromStore(systemUrl: string, client?: string | number): Promise<string | undefined> {
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        //logger, // todo: inti logger from YUI
        entityName: 'system'
    });

    if (typeof client === 'number') {
        client = String(client);
    }
    // todo: try...catch?
    const system = await systemStore.read(new BackendSystemKey({ url: systemUrl, client }));
    return system?.name ?? 'NewSystemChoice';
}
/**
 *
 * @param entityType
 * @returns
 */
function getSemanticKeyProperties(entityType: EntityType): SemanticKeyFilter[] {
    const keyNames: SemanticKeyFilter[] = [];
    if (entityType?.annotations.Common?.SemanticKey) {
        const semanticKey = entityType.annotations.Common.SemanticKey;
        semanticKey.forEach((keyProperty) => {
            keyNames.push({
                name: keyProperty.value,
                type: keyProperty.$target?.type ?? 'Emd.String',
                value: undefined
            });
        });
    }
    return keyNames;
}

/**
 * Find the entity set of the specified type, since mock server needs the files to be named as entity set names.
 *
 * @param entitySets
 * @param entityTypeFullName
 * @returns
 */
function findEntitySet(entitySets: EntitySet[], entityTypeFullName: string): EntitySet | undefined {
    const foundEntitySet = entitySets.find((entitySet) => {
        return entitySet.entityTypeName === entityTypeFullName;
    });
    return foundEntitySet ? foundEntitySet : undefined;
}

/**
 * Gets the navigation property tree which will form the expand queries.
 * Certain property names will be excluded.
 * A limit to the depth can be provided.
 * If the same entity is found or its a leaf, recursion will stop to avoid infinite loops.
 *
 * @param entityType
 * @param convertedMetadata
 * @param ancestorTypes Keeps track of ancestors to prevent self referential loops and endless nested expansions
 * @param maxDepth
 * @returns
 */
function getNavPropsForExpansion(
    entityType: EntityType,
    convertedMetadata: ConvertedMetadata,
    ancestorTypes?: string[],
    maxDepth = 4
): Entity[] {
    const navPropEntities: Entity[] = [];
    if (--maxDepth > 0) {
        if (ancestorTypes) {
            ancestorTypes.push(entityType.name);
        } else {
            ancestorTypes = [entityType.name];
        }
        entityType.navigationProperties.forEach((entityTypeNavProp) => {
            // Exclude entities that are using specific property names and prevent re-inclusion of the entity type again along the same branch
            if (
                !navPropNameExclusions.includes(entityTypeNavProp.name) &&
                !ancestorTypes?.includes(entityTypeNavProp.targetType.name)
            ) {
                let nestedNavPropEntities: Entity[] = [];
                if (entityTypeNavProp.targetType.navigationProperties.length > 0 && maxDepth > 0) {
                    nestedNavPropEntities = getNavPropsForExpansion(
                        entityTypeNavProp.targetType,
                        convertedMetadata,
                        [...ancestorTypes!],
                        maxDepth
                    );
                }
                navPropEntities.push({
                    entityType: entityTypeNavProp.targetType,
                    entityPath: entityTypeNavProp.name,
                    entitySetName:
                        findEntitySet(convertedMetadata.entitySets, entityTypeNavProp.targetTypeName)?.name ??
                        'Check parent entity file',
                    navPropEntities: [...nestedNavPropEntities]
                });
            }
        });
    }
    return navPropEntities;
}

/**
 *
 * @param appAccess
 * @param remoteMetadata the service metadata used to build the query model
 * @returns
 */
export async function getEntityModel(
    appAccess: ApplicationAccess,
    remoteMetadata: string
): Promise<AppConfig | undefined> {
    let entities: ReferencedEntities | undefined;
    const mainService = appAccess.app.services['mainService'];

    if (mainService.local) {
        const convertedMetadata = convertEdmxToConvertedMetadata(remoteMetadata);
        const appSpec = await appAccess.getSpecification<Specification>();
        const appConfig = await appSpec.readApp({ app: appAccess });

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
    return {
        referencedEntities: entities
    };
}
