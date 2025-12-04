import { convertEdmxToConvertedMetadata } from '@sap-ux/inquirer-common';
import { ApplicationAccess, FileName, Manifest } from '@sap-ux/project-access';
import { BackendSystem, BackendSystemKey, getService } from '@sap-ux/store';
import { FioriToolsProxyConfigBackend, UI5Config } from '@sap-ux/ui5-config';
import { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { SelectedEntityAnswer } from './prompts';
import { AppConfig, Entity, navPropNameExclusions, ReferencedEntities, SemanticKeyFilter } from './types';

/**
 * Parses the OData result and converts it into separate entity data containing rows of data for each entity.
 *
 * @param entities
 * @param odataResult
 * @returns
 */
export function convertODataResultToEntityFileData(
    entities: ReferencedEntities,
    odataResult: object,
    additionalEntities?: SelectedEntityAnswer[]
): { [key: string]: {}[] } {
    const entityFileData: { [key: string]: {}[] } = {};
    let odataResultArray: object[];
    // Process odata result rows into separate entity files
    odataResultArray = Array.isArray(odataResult) ? odataResult : [odataResult];

    // Each row corresponds to main entity data
    // todo: Re-implement as a recursive function
    odataResultArray.forEach((mainEntityRow: object) => {
        entityFileData[entities.listEntity.entitySetName] = entityFileData[entities.listEntity.entitySetName] || [];

        if (Array.isArray(entities.pageObjectEntities)) {
            entities.pageObjectEntities.forEach((pageEntity) => {
                if ((mainEntityRow as any)[pageEntity.entityPath]) {
                    entityFileData[pageEntity.entitySetName] = entityFileData[pageEntity.entitySetName] || [];
                    const pageEntityArray = (mainEntityRow as any)[pageEntity.entityPath];

                    // Next level expanded properties...todo: should be recursive
                    additionalEntities?.forEach((addEntity) => {
                        pageEntityArray.forEach((pageEntity: any) => {
                            if (pageEntity[addEntity.entity.entityPath]) {
                                let entityData = pageEntity[addEntity.entity.entityPath];
                                entityData = Array.isArray(entityData) ? entityData : [entityData];
                                entityFileData[addEntity.entity.entitySetName] =
                                    entityFileData[addEntity.entity.entitySetName] || [];
                                entityFileData[addEntity.entity.entitySetName].push(...entityData);
                            }
                            // remove the additional entities refs from the page entity as they have their own file
                            delete pageEntity[addEntity.entity.entityPath];
                        });
                    });
                    entityFileData[pageEntity.entitySetName].push(...pageEntityArray);
                    // remove the reference as the entity will be separate file
                    delete (mainEntityRow as any)[pageEntity.entityPath];
                }
            });
        }
        entityFileData[entities.listEntity.entitySetName].push(mainEntityRow);
    });

    /* entityFileData = {
        [entities.listEntity]: entities. */

    return entityFileData;
}

/**
 * Load the system from store if available otherwise return as a new system choice
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
function getSemanticKeyProperties(entitySetName: string, convertedEdmx: ConvertedMetadata): SemanticKeyFilter[] {
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
}
/**
 * Get all the navigation property entities (entity set name and path) of the specified entity set name
 * that may be selected for additional download
 *
 * @param
 * @param omitEntities enitiy set name to omit from the nav properties
 */

function getNavPropertyEntities(entitySet: EntitySet, omitEntities?: string[]): Entity[] | undefined {
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
}

/**
 * Copied from odata-service-inquirer
 */
function findEntitySet(entitySets: EntitySet[], entityType: string): EntitySet | undefined {
    const foundEntitySet = entitySets.find((entitySet) => {
        return entitySet.entityTypeName === entityType;
    });
    return foundEntitySet ? foundEntitySet : undefined;
}
/**
 *
 * @param listEntity
 * @param contextPath
 */
function getEntityFromContextPath(
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
}

export async function getAppConfig(appAccess: ApplicationAccess): Promise<AppConfig | undefined> {
    let entities: ReferencedEntities | undefined;
    let backendConfig: FioriToolsProxyConfigBackend | undefined;
    const mainService = appAccess.app.services['mainService'];
    // todo: we may need to update the metadata if its outdated
    if (mainService.local) {
        const metadataPath = join(mainService.local);
        const convertedMetadata = convertEdmxToConvertedMetadata(await readFile(metadataPath, 'utf-8'));
        // Read the manifest to get the routing targets
        const manifest = JSON.parse(await readFile(appAccess.app.manifest, 'utf-8')) as Manifest;
        const routeTargets = manifest?.['sap.ui5']?.routing?.targets;

        if (routeTargets) {
            // todo: map to get all in one iteration
            const listPageTarget = Object.values(routeTargets).find((target) => {
                return (target as any).name === 'sap.fe.templates.ListReport';
            });
            if (listPageTarget) {
                const listEntity: string = (listPageTarget as any).options?.settings?.contextPath;
                const listEntitySetName = listEntity.replace(/^\//, '');
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
        }
        // Read backend middleware config
        const ui5Config = await UI5Config.newInstance(
            await readFile(join(appAccess.app.appRoot, FileName.Ui5Yaml), 'utf-8')
        );
        backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];
    }

    return {
        referencedEntities: entities,
        servicePath: mainService.uri,
        backendConfig: backendConfig
    };
}
