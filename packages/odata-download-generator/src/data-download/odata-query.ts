import type { ODataService } from '@sap-ux/axios-extension';
import { merge } from 'lodash';
import buildQuery, { type Filter } from 'odata-query';
import { t } from '../utils/i18n';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import { type SelectedEntityAnswer } from './prompts';
import type { Entity } from './types';
import { type ReferencedEntities } from './types';

export type EntitySetsFlat = { [entityPath: string]: string };
/**
 * Creates a single expand config for the specified entities using slash operator.
 *
 * @param entities
 */
export function getNestedExpands(entities: Entity[]): { expands: {}; entitySetsFlat: EntitySetsFlat } {
    const entitiesToExpand = {};
    const entitySetsFlat = {};
    for (const navEntity of entities) {
        const expandPath = navEntity.entityPath;
        if (navEntity.navPropEntities && navEntity.navPropEntities.length > 0) {
            const { expands: nestedEntities, entitySetsFlat: nestedEntitySets } = getNestedExpands(navEntity.navPropEntities);
            entitiesToExpand[expandPath] = { expand: nestedEntities };
            merge(entitySetsFlat, nestedEntitySets);
        } else {
            entitiesToExpand[expandPath] = {}; // Leaf entity, empty object or could be array entry
        }
        entitySetsFlat[expandPath] = navEntity.entitySetName; // Can overwrite since we will only need to know each unique entity set name later
    }
    return {
        expands: entitiesToExpand,
        entitySetsFlat
    };
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
    selectedEntities?: SelectedEntityAnswer[],
    top = 1
): { query: string; entitySetsFlat: EntitySetsFlat } {
    const { expands: entitiesToExpand, entitySetsFlat = {} } = listEntity.navPropEntities ? getNestedExpands(listEntity.navPropEntities) : {};

    if (selectedEntities) {
        for (const entity of selectedEntities) {
            //entitiesToExpand.push(entityPath.fullPath);
            const parentPath = entity.fullPath.match(/^.*?(?=\/)/)?.[0];
            if (parentPath && entitiesToExpand?.[parentPath]) {
                entitiesToExpand[parentPath].expand
                    ? entitiesToExpand[parentPath].expand.push(entity.entity.entityPath)
                    : (entitiesToExpand[parentPath].expand = [entity.entity.entityPath]);
            }

            /* entitiesToExpand.forEach((entity) => {
                nestedExpand = nestedExpands?.[entity.entityPath] ? Object.assign(nestedExpands[entity.entityPath], {  })
            }) */
        }
    }
    const mainEntity = listEntity;
    const mainEntityFilters: Filter<string>[] = [];
    mainEntity.semanticKeys.forEach((key) => {
        if (key.value) {
            const filter: string | object = key.value;
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
        }
    });

    // Build the query object
    const queryInput = {};

    if (entitiesToExpand) {
        Object.assign(queryInput, { expand: entitiesToExpand });
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
 * @param additionalEntityPaths
 * @param selectedEntities
 * @param top
 * @returns
 */
export async function fetchData(
    entities: ReferencedEntities,
    odataService: ODataService,
    selectedEntities?: SelectedEntityAnswer[],
    top?: number
): Promise<{ odataResult: { entityData?: []; error?: string }; entitySetsQueried: EntitySetsFlat }> {
    const query = createQueryFromEntities(entities.listEntity, selectedEntities, top);
    const odataResult = await executeQuery(odataService, query.query);
    return {
        odataResult,
        entitySetsQueried: query.entitySetsFlat
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
