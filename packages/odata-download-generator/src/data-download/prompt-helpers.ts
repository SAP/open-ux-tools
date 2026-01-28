import type { ODataService } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import type { ServiceSpecification } from '@sap-ux/project-access';
import { FileName } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import type { EntityType } from '@sap-ux/vocabularies-types';
import type { CollectionFacet } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { UIAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { readFile } from 'fs/promises';
import type { CheckboxChoiceOptions } from 'inquirer';
import { join } from 'path';
import type { Answers } from 'yeoman-generator';
import { t } from '../utils/i18n';
import type { EntitySetsFlat } from './odata-query';
import { fetchData } from './odata-query';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import type { SelectedEntityAnswer, SelectedEntityAnswerAsJSONString } from './prompts/prompts';
import { promptNames } from './prompts/prompts';
import type { AppConfig, Entity } from './types';
import { getSystemNameFromStore } from './utils';

// todo: Create type for gen specific answers
/**
 *
 * @param odataService
 * @param appConfig
 * @param answers
 */
export async function getData(
    odataService: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    answers: Answers // todo: narrower type
): Promise<{ odataQueryResult: []; entitySetsFlat: EntitySetsFlat } | string> {
    if (odataService.metadata && appConfig.appAccess && odataService.connectedSystem) {
        if (odataService.servicePath && appConfig.appAccess && appConfig.referencedEntities) {
            odataService.connectedSystem.serviceProvider.log = ODataDownloadGenerator.logger;
            const odataServiceProvider = odataService.connectedSystem?.serviceProvider.service<ODataService>(
                odataService.servicePath
            );

            if (answers[promptNames.confirmDownload] === true) {
                // this.state.appEntities = appConfig.referencedEntities;
                const selectedEntitiesAsJsonStrings = answers[
                    promptNames.relatedEntitySelection
                ] as SelectedEntityAnswerAsJSONString[];
                const selectedEntities = selectedEntitiesAsJsonStrings.map((entityAsJSONString) => {
                    return JSON.parse(entityAsJSONString) as SelectedEntityAnswer;
                });
                const { odataResult, entitySetsFlat } = await fetchData(
                    appConfig.referencedEntities,
                    odataServiceProvider!,
                    selectedEntities,
                    1
                );
                if (odataResult.entityData) {
                    ODataDownloadGenerator.logger.debug(`Got result rows: ${odataResult.entityData.length}`);
                    return { odataQueryResult: odataResult.entityData, entitySetsFlat };
                } else if (odataResult.error) {
                    return `${odataResult.error}`;
                }
            }
        }
    }
    return t('errors.dataNotFetched');
}

/**
 *
 * @param collectionFacet
 */
function getAllReferenceFacets(collectionFacet: CollectionFacet): string[] {
    const refTargetPaths: string[] = [];
    collectionFacet.Facets.forEach((facet) => {
        if (facet.$Type === UIAnnotationTypes.ReferenceFacet && facet.Target.type === 'AnnotationPath') {
            const value = facet.Target.value;
            const pathSepIndex = value.lastIndexOf('/');
            if (pathSepIndex > -1) {
                refTargetPaths.push(value.substring(0, value.lastIndexOf('/')));
            }
        } else if (facet.$Type === UIAnnotationTypes.CollectionFacet) {
            refTargetPaths.push(...getAllReferenceFacets(facet));
        }
    });
    return refTargetPaths;
}

/**
 *
 * @param entityType
 */
function getDefaultSelectionPaths(entityType: EntityType): string[] {
    const refTargetPaths: string[] = [];
    entityType.annotations.UI?.Facets?.forEach((facet) => {
        if (facet.$Type === UIAnnotationTypes.ReferenceFacet && facet.Target?.type === 'AnnotationPath') {
            const value = facet.Target.value;
            const pathSepIndex = value?.lastIndexOf('/');
            if (pathSepIndex > -1) {
                refTargetPaths.push(value.substring(0, value.lastIndexOf('/')));
            }
        }
        if (facet.$Type === UIAnnotationTypes.CollectionFacet) {
            refTargetPaths.push(...getAllReferenceFacets(facet));
        }
    });

    return refTargetPaths ?? [];
}

export type Expands = {
    [entityPath: string]: {
        expand: Expands;
        selected?: boolean;
        fullPath: string;
    };
};
/**
 * Creates a query expand config that can be used to build the query and display entities with their full paths
 *
 * @param rootEntity
 * @param parentPath
 * @param choices
 * @param poEntityPaths
 * @returns
 */
export function getEntitySelectionChoices(
    rootEntity: Entity,
    parentPath: string = '',
    choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] = [],
    poEntityPaths?: string[]
): { entitySetsFlat: EntitySetsFlat; choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] } {
    const entitySetsFlat = {};
    const navEntities = rootEntity.navPropEntities;
    if (navEntities) {
        // Check the entity types assigned annotations for cross refs to other entities that should be selected by default
        // Reference entities of the parent have a path of the nav property entity which we are iterating next so we can pre-select
        // todo: memoize, we will hit the szme type multiple times
        const defaultSelectionPaths = rootEntity.entityType ? getDefaultSelectionPaths(rootEntity.entityType) : [];
        for (const navEntity of navEntities) {
            const expandPath = navEntity.entityPath;
            const fullPath = parentPath.concat(`${parentPath ? '/' : ''}${expandPath}`);

            if (navEntity.navPropEntities && navEntity.navPropEntities.length > 0) {
                getEntitySelectionChoices(navEntity, fullPath, choices, poEntityPaths);
            }
            // Create selection choice for each visited entity
            const entityChoice: SelectedEntityAnswer = {
                fullPath,
                entity: {
                    entityPath: navEntity.entityPath,
                    entitySetName: navEntity.entitySetName,
                    selected: defaultSelectionPaths.includes(navEntity.entityPath) || poEntityPaths?.includes(fullPath)
                }
            };
            const choiceId = `${fullPath}`;
            if (!choices) {
                choices = [];
            }
            choices.push({
                name: choiceId,
                value: JSON.stringify(entityChoice)
            });
            entitySetsFlat[expandPath] = navEntity.entitySetName; // Can overwrite since we will only need to know each unique entity set name later
        }
    }
    return {
        entitySetsFlat, // Set of all entity names, used to create files
        choices
    };
}

/**
 * Create an expand/entity selection list from the specified entities nav properties
 *
 * @param rootEntity
 * @param pageObjectEntities
 * @returns
 */
export function createEntityChoices(
    rootEntity: Entity,
    pageObjectEntities?: Entity[]
): { entitySetsFlat: EntitySetsFlat; choices: CheckboxChoiceOptions<SelectedEntityAnswerAsJSONString>[] } | undefined {
    // Get all PO entity paths for pre-selection
    const poEntityPaths = pageObjectEntities
        ?.map((poEntity) => {
            // Create the relative paths from the list entity
            const fullPath =
                poEntity.page?.contextPath ??
                poEntity.page?.routePattern?.replace(':?query:', '').replace(/\({[^}]*}\)/g, '');
            if (fullPath?.startsWith(`/${rootEntity.entityPath}/`)) {
                return fullPath.replace(`/${rootEntity.entityPath}/`, '');
            }
            return fullPath;
        })
        .filter((item): item is string => item !== undefined);

    if (rootEntity.navPropEntities) {
        const entityChoices = getEntitySelectionChoices(rootEntity, undefined, undefined, poEntityPaths);

        entityChoices.choices.sort((a, b) => a.name!.localeCompare(b.name!));
        return entityChoices;
    }
}

/**
 * Get the service path and service name from the service
 *
 * @param appRoot
 * @param service
 * @returns
 */
export async function getServiceDetails(
    appRoot: string,
    service: ServiceSpecification
): Promise<{
    servicePath: string | undefined;
    systemName: string | undefined;
}> {
    // Read backend middleware config
    const ui5Config = await UI5Config.newInstance(await readFile(join(appRoot, FileName.Ui5Yaml), 'utf-8'));
    const backendConfig = ui5Config.getBackendConfigsFromFioriToolsProxyMiddleware()[0];

    //servicePaths.push(appConfig?.servicePath ?? '');
    let systemName;
    if (backendConfig) {
        systemName = isAppStudio()
            ? backendConfig?.destination
            : await getSystemNameFromStore(backendConfig.url, backendConfig?.client);
    }

    return {
        servicePath: service.uri,
        systemName
    };
}
