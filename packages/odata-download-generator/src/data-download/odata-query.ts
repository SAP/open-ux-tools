import type { ODataService } from '@sap-ux/axios-extension';
import buildQuery, { type Filter } from 'odata-query';
import { t } from '../utils/i18n';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import { type SelectedEntityAnswer } from './prompts/prompts';
import type { ReferencedEntities } from './types';

export type EntitySetsFlat = { [entityPath: string]: string };

/**
 *
 * @param entityPaths
 */
export function getExpands(entityPaths: { entityPath: string; entitySetName: string }[]): {
    expands: {};
    entitySetsFlat: EntitySetsFlat;
} {
    const entitySetsFlat = {};
    const expand = entityPaths.reduce(
        (tree, { entityPath: path, entitySetName }) => {
            const parts = path.split('/');
            entitySetsFlat[parts[parts.length - 1]] = entitySetName; // Can overwrite since we will only need to know each unique entity set name later

            let current = tree;

            parts.forEach((part, index) => {
                if (!current.expand) {
                    current.expand = {};
                }
                if (!current.expand[part]) {
                    current.expand[part] = index === parts.length - 1 ? {} : { expand: {} };
                }
                current = current.expand[part];
            });

            return tree;
        },
        { expand: {} }
    );

    return { expands: expand, entitySetsFlat };
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
): { query: string; entitySetsFlat: EntitySetsFlat } {
    const selectedPaths = selectedEntities?.map((entity) => {
        return { entityPath: entity.fullPath, entitySetName: entity.entity.entitySetName };
    });

    const { entitySetsFlat, expands: entitiesToExpand } = getExpands(selectedPaths);

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
    return { query, entitySetsFlat };
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
    entities: ReferencedEntities,
    odataService: ODataService,
    selectedEntities: SelectedEntityAnswer[],
    top?: number
): Promise<{ odataResult: { entityData?: []; error?: string }; entitySetsFlat: EntitySetsFlat }> {
    const query = createQueryFromEntities(entities.listEntity, selectedEntities, top);
    const odataResult = await executeQuery(odataService, query.query);
    return {
        odataResult,
        entitySetsFlat: query.entitySetsFlat
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
