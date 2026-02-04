import type { ODataService } from '@sap-ux/axios-extension';
import buildQuery, { type Filter } from 'odata-query';
import { t } from '../utils/i18n';
import { ODataDownloadGenerator } from './odata-download-generator';
import { type SelectedEntityAnswer } from './prompts/prompts';
import type { ReferencedEntities } from './types';

export type EntitySetsFlat = { [entityPath: string]: string };

/**
 *
 * @param entityPaths
 */
export function getExpands(entityPaths: { entityPath: string; entitySetName: string }[]): {
    expands: {};
    entityPathParts: string[];
} {
    const entityPathParts: string[] = [];
    const expand = entityPaths.reduce(
        (tree, { entityPath: path }) => {
            const parts = path.split('/');
            let current = tree;

            parts.forEach((part, index) => {
                if (!current.expand) {
                    current.expand = {};
                }
                if (!current.expand[part]) {
                    current.expand[part] = index === parts.length - 1 ? {} : { expand: {} };
                }
                current = current.expand[part];
                if (!entityPathParts.includes(part)) {
                    entityPathParts.push(part);
                }
            });

            return tree;
        },
        { expand: {} }
    );

    return { expands: expand, entityPathParts };
}

/**
 * Create the odata query by expanding and filtering the list entity.
 *
 * @param listEntity
 * @param selectedEntities
 * @param top
 * @returns
 */
export function createQueryFromEntities(
    listEntity: ReferencedEntities['listEntity'],
    selectedEntities: SelectedEntityAnswer[],
    top = 1
): { query: string } {
    const selectedPaths = selectedEntities?.map((entity) => {
        return { entityPath: entity.fullPath, entitySetName: entity.entity.entitySetName };
    });

    const { expands: entitiesToExpand, entityPathParts } = getExpands(selectedPaths);

    // To provide feedback about which entity set files would be created by this query
    const entitySetNames = entityPathParts
        .map((path) => {
            const found = selectedEntities.find((selectedEntity) => {
                return path === selectedEntity.entity.entityPath ? selectedEntity.entity.entitySetName : undefined;
            });
            return found?.entity.entitySetName;
        })
        .filter((item): item is string => item !== undefined);
    ODataDownloadGenerator.logger.info(
        t('info.entityFilesToBeGenerated', { entities: Object.keys(entitySetNames).join(', ') })
    );

    const mainEntity = listEntity;
    const mainEntityFilters: Filter<string>[] = [];
    mainEntity.semanticKeys.forEach((key) => {
        // Process ranges and/or comma seperated values
        if (key.value) {
            if (key.type === 'Edm.String') {
                // Create the range and set values
                const filterParts = key.value.split(',');
                const filters: Filter<string>[] = [];
                filterParts.forEach((filterPart) => {
                    const filterRangeParts = filterPart.trim().split('-');

                    if (filterRangeParts.length === 1) {
                        // Single value
                        filters.push({
                            [key.name]: filterPart
                        });
                    } else if (filterRangeParts.length === 2) {
                        // Range
                        filters.push({
                            [key.name]: {
                                ge: filterRangeParts[0],
                                le: filterRangeParts[1]
                            }
                        });
                    }
                });

                mainEntityFilters.push(
                    filters.length == 1
                        ? filters[0]
                        : {
                              or: filters
                          }
                );
            } else {
                mainEntityFilters.push({
                    [key.name]: key.value
                });
            }
        }
    });

    // Build the query object
    const queryInput = {};

    if (entitiesToExpand) {
        Object.assign(queryInput, entitiesToExpand);
    }
    if (mainEntityFilters.length > 0) {
        Object.assign(queryInput, {
            // todo: multiple keys should be and'd
            filter: mainEntityFilters.length === 1 ? mainEntityFilters[0] : mainEntityFilters,
            count: true
        });
    } else if (top) {
        Object.assign(queryInput, {
            top
        });
    }
    const queryString = buildQuery(queryInput);
    const query = `${mainEntity.entitySetName}${queryString}`;
    ODataDownloadGenerator.logger.info(`Query for odata: ${query}`);
    return { query };
}
/**
 * todo: take a single entity list to download
 *
 * @param entities
 * @param odataService
 * @param selectedEntities
 * @param top
 * @returns
 */
export async function fetchData(
    entities: ReferencedEntities, // todo: Only pass root/listy entity
    odataService: ODataService,
    selectedEntities: SelectedEntityAnswer[],
    top?: number
): Promise<{ odataResult: { entityData?: []; error?: string } }> {
    const query = createQueryFromEntities(entities.listEntity, selectedEntities, top);
    const odataResult = await executeQuery(odataService, query.query);
    return {
        odataResult
    };
}

/**
 *
 * @param odataService
 * @param query
 */
async function executeQuery(odataService: ODataService, query: string): Promise<{ entityData?: []; error?: string }> {
    try {
        const data = await odataService?.get(query);
        // Process the result set into individual entity data for files
        return { entityData: data?.odata() };
    } catch (error) {
        const errorText = t('errors.odataQueryError', { error });
        ODataDownloadGenerator.logger.error(errorText);
        return { error: errorText };
    }
}
