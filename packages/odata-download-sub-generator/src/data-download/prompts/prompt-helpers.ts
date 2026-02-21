import type { ODataService } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import type { ServiceSpecification, ApplicationAccess } from '@sap-ux/project-access';
import { FileName, getSpecificationModuleFromCache } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import type { EntityType } from '@sap-ux/vocabularies-types';
import type { CollectionFacet } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { UIAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { readFile } from 'node:fs/promises';
import type { CheckboxChoiceOptions } from 'inquirer';
import { join } from 'node:path';
import { t } from '../../utils/i18n';
import { fetchData, type EntitySetsFlat } from '../odata-query';
import { ODataDownloadGenerator } from '../odata-download-generator';
import type { SelectedEntityAnswer } from './prompts';
import type { AppConfig, Entity } from '../types';
import { getSystemNameFromStore } from '../utils';
import { PromptState } from '../prompt-state';
import type { Specification } from '@sap/ux-specification/dist/types/src';

/**
 * Fetches OData from the backend service.
 *
 * @param odataService - The OData service answers containing connection details
 * @param appConfig - The application configuration
 * @param selectedEntities - The selected entities to fetch data for
 * @returns The query result or an error message
 */
export async function getData(
    odataService: Partial<OdataServiceAnswers>,
    appConfig: AppConfig,
    selectedEntities: SelectedEntityAnswer[]
): Promise<{ odataQueryResult: [] } | string> {
    if (odataService.metadata && appConfig.appAccess && odataService.connectedSystem) {
        if (odataService.servicePath && appConfig.appAccess && appConfig.referencedEntities) {
            odataService.connectedSystem.serviceProvider.log = ODataDownloadGenerator.logger;
            const odataServiceProvider = odataService.connectedSystem?.serviceProvider.service<ODataService>(
                odataService.servicePath
            );

            if (odataServiceProvider) {
                const { odataResult } = await fetchData(
                    appConfig.referencedEntities.listEntity,
                    odataServiceProvider,
                    selectedEntities,
                    1
                );
                if (odataResult.entityData) {
                    ODataDownloadGenerator.logger.debug(`Got result rows: ${odataResult.entityData.length}`);
                    return { odataQueryResult: odataResult.entityData };
                } else if (odataResult.error) {
                    return `${odataResult.error}`;
                }
            }
        }
    }
    return t('errors.dataNotFetched');
}

/**
 * Recursively extracts all reference facet target paths from a collection facet.
 *
 * @param collectionFacet - The collection facet to extract reference paths from
 * @returns Array of reference target paths
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
 * Get the entity paths referenced by reference facets to be used as default selections.
 *
 * @param entityType - The entity type to get default selection paths from
 * @returns Array of reference target paths
 */
function getDefaultSelectionPaths(entityType: EntityType): string[] {
    if (PromptState.entityTypeRefFacetCache[entityType.name]) {
        return PromptState.entityTypeRefFacetCache[entityType.name];
    }
    const refTargetPaths: string[] = [];
    entityType.annotations?.UI?.Facets?.forEach((facet) => {
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

    PromptState.entityTypeRefFacetCache[entityType.name] = refTargetPaths;
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
 * Creates a query expand config that can be used to build the query and display entities with their full paths.
 *
 * @param currentEntity - The root entity to build choices from
 * @param parentPath - The parent path for constructing full paths
 * @param choices - Accumulated choices array
 * @param poEntityPaths - Page object entity paths for pre-selection
 * @param listPageEntity - The list page entity, used to prevent loops in the entity paths
 * @returns Object containing entity sets flat map and checkbox choices
 */
function getEntitySelectionChoices(
    currentEntity: Entity,
    parentPath: string = '',
    choices: CheckboxChoiceOptions<SelectedEntityAnswer>[] = [],
    poEntityPaths?: string[],
    listPageEntity?: Entity
): { entitySetsFlat: EntitySetsFlat; choices: CheckboxChoiceOptions<SelectedEntityAnswer>[] } {
    const entitySetsFlat = {};
    const navEntities = currentEntity.navPropEntities;
    if (navEntities && navEntities.length > 0) {
        // Check the entity types assigned annotations for cross refs to other entities that should be selected by default
        // Reference entities of the parent have a path of the nav property entity which we are iterating next so we can pre-selected
        const defaultSelectionPaths = currentEntity.entityType
            ? getDefaultSelectionPaths(currentEntity.entityType)
            : [];
        for (const navEntity of navEntities) {
            const expandPath = navEntity.entityPath;
            // For hierarchies this may be ok but we currently do not detect hierarchies
            // Dont re-include entities that are referenced on the path already (this will need to change with hiereachy support)
            if (navEntity.entityType?.name === listPageEntity?.entityType?.name || parentPath.includes(expandPath)) {
                // Stop the tree traversal if the current nodes entity type is the same as the list
                continue;
            }
            const fullPath = parentPath.concat(`${parentPath ? '/' : ''}${expandPath}`);

            if (navEntity.navPropEntities && navEntity.navPropEntities.length > 0) {
                Object.assign(
                    entitySetsFlat,
                    getEntitySelectionChoices(
                        navEntity,
                        fullPath,
                        choices,
                        poEntityPaths,
                        listPageEntity ?? currentEntity
                    ).entitySetsFlat
                );
            }
            // Create selection choice for each visited entity
            const entityChoice: SelectedEntityAnswer = {
                fullPath,
                entity: {
                    entityPath: navEntity.entityPath,
                    entitySetName: navEntity.entitySetName,
                    defaultSelected:
                        defaultSelectionPaths.includes(navEntity.entityPath) || !!poEntityPaths?.includes(fullPath)
                }
            };
            const choiceId = `${fullPath}`;
            if (!choices) {
                choices = [];
            }
            choices.push({
                name: choiceId,
                value: entityChoice,
                checked: entityChoice.entity.defaultSelected
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
 * Create an expand/entity selection list from the specified entities nav properties.
 *
 * @param rootEntity - The root entity to create choices for
 * @param pageObjectEntities - Optional page object entities for pre-selection
 * @returns Object containing entity sets flat map and checkbox choices, or undefined
 */
export function createEntityChoices(
    rootEntity: Entity,
    pageObjectEntities?: Entity[]
): { entitySetsFlat: EntitySetsFlat; choices: CheckboxChoiceOptions<SelectedEntityAnswer>[] } | undefined {
    // Get all PO entity paths for pre-selection
    const poEntityPaths = pageObjectEntities
        ?.map((poEntity) => {
            // Create the relative paths from the list entity
            const fullPath =
                poEntity.page?.contextPath ??
                poEntity.page?.routePattern?.replace(':?query:', '').replaceAll(/\(\{[^}]*\}\)/g, '');
            if (fullPath?.startsWith(`/${rootEntity.entityPath}/`)) {
                return fullPath.replace(`/${rootEntity.entityPath}/`, '');
            }
            return fullPath;
        })
        .filter((item): item is string => item !== undefined);

    if (rootEntity.navPropEntities) {
        const entityChoices = getEntitySelectionChoices(rootEntity, undefined, undefined, poEntityPaths);

        entityChoices.choices.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        return entityChoices;
    }
    return undefined;
}

/**
 * Get the service path and service name from the service.
 *
 * @param appRoot - The application root path
 * @param service - The service specification
 * @returns Object containing service path and system name
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

/**
 * Retrieves the Specification object.
 *
 * @param appAccess - The application access reference
 * @returns A promise that resolves to a Specification object or an error string
 */
export async function getSpecification(appAccess: ApplicationAccess): Promise<Specification | string> {
    const specification: Specification = await getSpecificationModuleFromCache(appAccess.app.appRoot);
    const apiVersion = specification.getApiVersion();
    const version = typeof apiVersion?.version === 'string' ? Number.parseInt(apiVersion.version, 10) : 0;
    if (version < 24) {
        ODataDownloadGenerator.logger.debug(
            `@sap/ux-specification from module cache API version is: ${version}. API version '24' at least is required.`
        );
        return t('prompts.appSelection.validation.specficationApiVersionOutdated', { specApiVersion: version });
    }
    return specification;
}
