import { convertEdmxToConvertedMetadata } from '@sap-ux/inquirer-common';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { FileName /** getSpecificationModuleFromCache */ } from '@sap-ux/project-access';
import type { BackendSystem } from '@sap-ux/store';
import { BackendSystemKey, getService } from '@sap-ux/store';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import { UI5Config } from '@sap-ux/ui5-config';
import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SelectedEntityAnswer } from './prompts';
import type { AppConfig, Entity, ReferencedEntities, SemanticKeyFilter } from './types';
import { navPropNameExclusions } from './types';
// import { ODataDownloadGenerator } from './odataDownloadGenerator';
// import { Logger } from '@sap-ux/logger';
import { FioriElementsVersion, PageTypeV4, type Specification } from '@sap/ux-specification/dist/types/src';
import type { PagesV4, PageV4 } from '@sap/ux-specification/dist/types/src/v4';
import { isEqual, mergeWith, uniqWith } from 'lodash';
import type { EntitySetsFlat } from './odata-query';
import { ODataDownloadGenerator } from './odataDownloadGenerator';

// Merge array properties by removing dups and concating
/**
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
 * @param entitySetsQueried
 * @param entitySetName
 */
export function createEntitySetData(odataResult: {} | [], entitySetsQueried: EntitySetsFlat, entitySetName: string): { [key: string]: {}[] } {
    const resultDataByEntitySet: { [key: string]: {}[] } = {};
    const odataRestulAsArray = Array.isArray(odataResult) ? odataResult : [odataResult];

    // Each entry is of the same entity set data
    odataRestulAsArray.forEach((resultEntry) => {
        Object.entries(entitySetsQueried).forEach(([entityPath, entitySetName]) => {
            // There are nested expanded entities
            if (resultEntry[entityPath]) {
                const entitySetData = createEntitySetData(resultEntry[entityPath], entitySetsQueried, entitySetName);
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
 * Parses the OData result and converts it into separate entity data containing rows of data for each entity.
 *
 * @param entities
 * @param odataResult
 * @param odataResult.odata
 * @param odataResult.entitySetsQueried
 * @param additionalEntities
 * @returns
 */
export function convertODataResultToEntityFileData(
    entities: ReferencedEntities,
    odataResult: { odata: []; entitySetsQueried: EntitySetsFlat },
    additionalEntities?: SelectedEntityAnswer[]
): { [key: string]: {}[] } {
    let entityFileData: { [key: string]: {}[] } = {};
    let odataResultArray: object[];
    // Process odata result rows into separate entity files
    // odataResultArray = Array.isArray(odataResult.odata) ? odataResult : [odataResult];
    entityFileData = createEntitySetData(odataResult.odata, odataResult.entitySetsQueried, entities.listEntity.entitySetName);

    // Each row corresponds to main entity data
    // todo: Re-implement as a recursive function
    // odataResultArray.forEach((mainEntityRow: object) => {
    //     //entityFileData[entities.listEntity.entitySetName] = entityFileData[entities.listEntity.entitySetName] || [];

    //     const rowFileData = createEntitySetData(mainEntityRow, entities.listEntity);
    //     if (entityFileData[entities.listEntity.entitySetName]) {
    //         entityFileData[entities.listEntity.entitySetName].push(...rowFileData[entities.listEntity.entitySetName]);
    //     } else {
    //         entityFileData[entities.listEntity.entitySetName] = [...rowFileData[entities.listEntity.entitySetName]]
    //     }

    //    /*  entities.listEntity.navPropEntities?.forEach((entity) {
    //         mainEntityRow[entity.]
    //     }

    //     if (Array.isArray(entities.pageObjectEntities)) {
    //         entities.pageObjectEntities.forEach((pageEntity) => {
    //             if ((mainEntityRow as any)[pageEntity.entityPath]) {
    //                 entityFileData[pageEntity.entitySetName] = entityFileData[pageEntity.entitySetName] || [];
    //                 const pageEntityArray = (mainEntityRow as any)[pageEntity.entityPath];

    //                 // Next level expanded properties...todo: should be recursive
    //                 additionalEntities?.forEach((addEntity) => {
    //                     pageEntityArray.forEach((pageEntity: any) => {
    //                         if (pageEntity[addEntity.entity.entityPath]) {
    //                             let entityData = pageEntity[addEntity.entity.entityPath];
    //                             entityData = Array.isArray(entityData) ? entityData : [entityData];
    //                             entityFileData[addEntity.entity.entitySetName] = entityFileData[addEntity.entity.entitySetName] || [];
    //                             entityFileData[addEntity.entity.entitySetName].push(...entityData);
    //                         }
    //                         // remove the additional entities refs from the page entity as they have their own file
    //                         delete pageEntity[addEntity.entity.entityPath];
    //                     });
    //                 });
    //                 entityFileData[pageEntity.entitySetName].push(...pageEntityArray);
    //                 // remove the reference as the entity will be separate file
    //                 delete (mainEntityRow as any)[pageEntity.entityPath];
    //             }
    //         });
    //     } */

    // });

    /* entityFileData = {
        [entities.listEntity]: entities. */

    return entityFileData;
}

/**
 * Load the system from store if available otherwise return as a new system choice.
 *
 * @param systemUrl
 * @param client
 * @returns
 */
export async function getSystemNameFromStore(systemUrl: string, client?: string): Promise<string | undefined> {
    const systemStore = await getService<BackendSystem, BackendSystemKey>({
        //logger, // todo: inti logger from YUI
        entityName: 'system'
    });
    // todo: try...catch?
    const system = await systemStore.read(new BackendSystemKey({ url: systemUrl, client }));
    return system?.name ?? 'NewSystemChoice';
}

/**
 * Fond the key properties fo the specified entity set name in the specified metadata
 *
 * @param entitySetName
 * @param convertedEdmx
 * @returns
 */
/* function getSemanticKeyProperties(entitySetName: string, convertedEdmx: ConvertedMetadata): SemanticKeyFilter[] {
    const entity = convertedEdmx.entitySets.find((es) => es.name === entitySetName);
    const keyNames: SemanticKeyFilter[] = [];
    if (entity?.entityType.annotations.Common?.SemanticKey) {
        const semanticKey = entity.entityType.annotations.Common.SemanticKey;
        semanticKey.forEach((keyProperty) => {
            keyNames.push({
                name: keyProperty.value,
                type: keyProperty.$target?.type ?? 'Emd.String',
                value: undefined
            });
        });
        entity;
    }
    return keyNames;
} */
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
 * Get all the navigation property entities (entity set name and path) of the specified entity set name
 * that may be selected for additional download
 *
 * @param
 * @param omitEntities enitiy set name to omit from the nav properties
 */

/* function getNavPropertyEntities(entitySet: EntitySet, omitEntities?: string[]): Entity[] | undefined {
    const entities: Entity[] = [];
    Object.entries(entitySet.navigationPropertyBinding).forEach(([path, entitySet]) => {
        // todo: Should we use the entity type exclusion instead
        entitySet.entityTypeName;
        if (!navPropNameExclusions.includes(path) && !omitEntities?.includes(entitySet.name)) {
            entities.push({
                entitySet: entitySet,
                entityPath: path,
                entitySetName: entitySet.name
            });
        }
    });
    return entities;
} */

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
 *
 * @param listEntity
 * @param contextPath
 */
/* function getEntityFromContextPath(
    mainEntitySetName: string,
    pageEntityPath: string,
    convertedEdmx: ConvertedMetadata
): Entity | undefined {
    const mainEntitySet = convertedEdmx.entitySets.find((es) => es.name === mainEntitySetName);
    const navProps = mainEntitySet?.entityType.navigationProperties.filter((navProp) => navProp.isCollection) ?? [];
    const pageObjectEntity = navProps.find((navProp) => {
        return pageEntityPath === navProp.name;
    });

    if (!pageObjectEntity) return;

    const entitySet = findEntitySet(convertedEdmx.entitySets, pageObjectEntity?.targetTypeName!)!;

    return {
        entitySetName: entitySet.name,
        entityPath: pageEntityPath,
        entitySet
    };
} */

/**
 *
 * @param mainEntitySetName
 * @param pageEntityPath
 * @param convertedEdmx
 */
/* function getPageEntitySetInfo(mainEntitySetName: string, pageEntityPath: string, convertedEdmx: ConvertedMetadata): Entity | undefined {
    const mainEntitySet = convertedEdmx.entitySets.find((es) => es.name === mainEntitySetName);
    const navProps = mainEntitySet?.entityType.navigationProperties.filter((navProp) => navProp.isCollection) ?? [];
    const pageObjectEntity = navProps.find((navProp) => {
        return pageEntityPath === navProp.name;
    });

    if (!pageObjectEntity) {
        return;
    }

    const entitySet = findEntitySet(convertedEdmx.entitySets, pageObjectEntity?.targetTypeName)!;

    return {
        entitySetName: entitySet.name,
        entityPath: pageEntityPath,
        entityType: entitySet.entityType
    };
} */

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
function getNavPropsForExpansion(entityType: EntityType, convertedMetadata: ConvertedMetadata, ancestorTypes?: string[], maxDepth = 4): Entity[] {
    const navPropEntities: Entity[] = [];
    if (--maxDepth > 0) {
        if (ancestorTypes) {
            ancestorTypes.push(entityType.name);
        } else {
            ancestorTypes = [entityType.name];
        }
        entityType.navigationProperties.forEach((entityTypeNavProp) => {
            // Exclude entities that are using specific property names and prevent re-inclusion of the entity type again along the same branch
            if (!navPropNameExclusions.includes(entityTypeNavProp.name) && !ancestorTypes?.includes(entityTypeNavProp.targetType.name)) {
                let nestedNavPropEntities: Entity[] = [];
                if (entityTypeNavProp.targetType.navigationProperties.length > 0 && maxDepth > 0) {
                    nestedNavPropEntities = getNavPropsForExpansion(entityTypeNavProp.targetType, convertedMetadata, [...ancestorTypes!], maxDepth);
                }
                navPropEntities.push({
                    entityType: entityTypeNavProp.targetType,
                    entityPath: entityTypeNavProp.name,
                    entitySetName: findEntitySet(convertedMetadata.entitySets, entityTypeNavProp.targetTypeName)?.name ?? 'Check parent entity file',
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
 * @returns
 */
export async function getAppConfig(appAccess: ApplicationAccess): Promise<AppConfig | undefined> {
    let entities: ReferencedEntities | undefined;
    let backendConfig: FioriToolsProxyConfigBackend | undefined;
    const mainService = appAccess.app.services['mainService'];

    // todo: we may need to update the metadata if its outdated
    if (mainService.local) {
        const metadataPath = join(mainService.local);
        const convertedMetadata = convertEdmxToConvertedMetadata(await readFile(metadataPath, 'utf-8'));
        const appSpec = await appAccess.getSpecification<Specification>();
        const appConfig = await appSpec.readApp({ app: appAccess });

        if (appConfig.applicationModel && appConfig.applicationModel?.target?.fioriElements == FioriElementsVersion.v4) {
            const appModel = appConfig.applicationModel;
            const pages = appModel.pages as unknown as PagesV4;
            let mainListEntityType: EntityType | undefined;
            const objectPages: PageV4[] = [];

            // Get all the app referenced pages and list entity
            Object.values(pages).forEach((page) => {
                // Get the main list entity
                if (page.pageType === PageTypeV4.ListReport && page.entityType && page.entitySet) {
                    mainListEntityType = convertedMetadata.entityTypes.find((et) => et.fullyQualifiedName === page.entityType);
                    if (mainListEntityType) {
                        const entityKeys = getSemanticKeyProperties(mainListEntityType);
                        entities = {
                            listEntity: {
                                entitySetName: page.entitySet,
                                semanticKeys: entityKeys,
                                entityPath: 'root',
                                entityType: mainListEntityType
                            }
                        };

                        // Add nav props of the list entity
                        entities.listEntity.navPropEntities = getNavPropsForExpansion(mainListEntityType, convertedMetadata);
                    }
                } else if (page.pageType === PageTypeV4.ObjectPage && page.entityType && page.entitySet) {
                    objectPages?.push(page);
                }
            });

            if (!entities?.listEntity) {
                ODataDownloadGenerator.logger.info('No list entity defined. A main list entity is required for data downloading.');
                return undefined;
            }

            const pageObjectEntities: Entity[] = [];
            const navPropEntities = new Map<Entity, Entity[]>();

            // Get all the page entities and their nav prop paths from the list entity
            objectPages?.forEach((page) => {
                if (page.entitySet && page.entityType && page.entityType !== mainListEntityType?.fullyQualifiedName) {
                    const objectPageEntitySet = findEntitySet(convertedMetadata.entitySets, page.entityType);
                    const pageEntity: Entity = {
                        entityPath: page.navigationProperty!,
                        entitySetName: page.entitySet,
                        entityType: objectPageEntitySet?.entityType,
                        page
                    };
                    pageObjectEntities.push(pageEntity);
                    // Page entity nav prop types will be offered as selection options
                    const pageNavEntities: Entity[] = [];
                    objectPageEntitySet?.entityType.navigationProperties.forEach((entityTypeNavProp) => {
                        // Exclude entities that are using specific property names and prevent re-inclusion of list entity again
                        if (!navPropNameExclusions.includes(entityTypeNavProp.name) && entityTypeNavProp.targetTypeName !== mainListEntityType?.name) {
                            pageNavEntities.push({
                                entityType: entityTypeNavProp.targetType,
                                entityPath: entityTypeNavProp.name,
                                entitySetName: findEntitySet(convertedMetadata.entitySets, entityTypeNavProp.targetTypeName)?.name ?? 'Check parent entity file'
                            });
                        }
                    });
                    navPropEntities.set(pageEntity, pageNavEntities);
                }
            });

            /*  if ((target as any).name === 'sap.fe.templates.ObjectPage') {
                const contextPath = (target as any).options?.settings?.contextPath;
                // todo: include root object page also where only one path
                const entity = getEntityFromContextPath(
                    entities.listEntity.entitySetName,
                    contextPath.match(/[^\/]+$/)?.[0],
                    convertedMetadata
                );
                if (entity) {
                    //pageObjectEntities.push(contextPath.replace(/^\//, ''));
                    pageObjectEntities.push(entity);
                    const navEntities = getNavPropertyEntities(entity.entitySet as EntitySet, [
                        entities.listEntity.entitySetName
                    ]);
                    if (navEntities) {
                        navPropEntities.set(entity, navEntities);
                    }
                }
            } */

            entities.pageObjectEntities = pageObjectEntities;
            entities.navPropEntities = navPropEntities;
        }

        // Read the manifest to get the routing targets
        /* const routeTargets = manifest?.['sap.ui5']?.routing?.targets;

        if (routeTargets) {
            // todo: map to get all in one iteration
            const listPageTarget = Object.values(routeTargets).find((target) => {
                return (target as any).name === 'sap.fe.templates.ListReport';
            });
            if (listPageTarget && (listPageTarget as any).options?.settings) {
                const listPageSettings = (listPageTarget as any).options?.settings;
                const listEntitySetName: string = listPageSettings.contextPath?.replace(/^\//, '') || listPageSettings.entitySet;
                const entityKeys = getSemanticKeyProperties(listEntitySetName, convertedMetadata);
                entities = {
                    listEntity: {
                        entitySetName: listEntitySetName,
                        semanticKeys: entityKeys
                    }
                };

                const pageObjectEntities: Entity[] = [];
                const navPropEntities = new Map<Entity, Entity[]>();

                for (const target of Object.values(routeTargets)) {
                    if ((target as any).name === 'sap.fe.templates.ObjectPage') {
                        const contextPath = (target as any).options?.settings?.contextPath;
                        // todo: include root object page also where only one path
                        const entity = getEntityFromContextPath(
                            entities.listEntity.entitySetName,
                            contextPath.match(/[^\/]+$/)?.[0],
                            convertedMetadata
                        );
                        if (entity) {
                            //pageObjectEntities.push(contextPath.replace(/^\//, ''));
                            pageObjectEntities.push(entity);
                            const navEntities = getNavPropertyEntities(entity.entitySet as EntitySet, [
                                entities.listEntity.entitySetName
                            ]);
                            if (navEntities) {
                                navPropEntities.set(entity, navEntities);
                            }
                        }
                    }
                }
                entities.pageObjectEntities = pageObjectEntities;
                entities.navPropEntities = navPropEntities;
            }
        } */
        // Read backend middleware config
        const ui5Config = await UI5Config.newInstance(await readFile(join(appAccess.app.appRoot, FileName.Ui5Yaml), 'utf-8'));
        backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
    }

    return {
        referencedEntities: entities,
        servicePath: mainService.uri,
        backendConfig: backendConfig
    };
}
