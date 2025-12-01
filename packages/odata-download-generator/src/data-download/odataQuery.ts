import { ODataService } from '@sap-ux/axios-extension';
import buildQuery, { type Filter } from 'odata-query';
import { ODataDownloadGenerator } from './odataDownloadGenerator';
import { type SelectedEntityAnswer } from './prompts';
import { type ReferencedEntities } from './types';

/**
 * todo: take a single entity list to download
 *
 * @param entities
 * @param odataService
 * @param additionalEntityPaths
 * @returns
 */
export async function fetchData(
    entities: ReferencedEntities,
    odataService: ODataService,
    selectedEntities?: SelectedEntityAnswer[],
    top?: number
): Promise<{ entityData?: []; error?: string }> {
    // const query = createQueryBuilderV4(entities.listEntity).build();

    let entitiesToExpand: { [path: string]: { expand: string[] } } = {};

    for (const pageEntity of entities.pageObjectEntities ?? []) {
        /*  const skip = selectedEntities?.find((entityPath) => {
            return entityPath.fullPath.startsWith(pageEntity.entityPath);
        }); */
        // Skip expansion of the list entity itself
        if (pageEntity.entitySetName !== entities.listEntity.entitySetName) {
            // Last part of context path is the navigation property entity name
            // const navEntity = entity.match((/[^\/]+$/))?.[0];
            // todo: reverse engineer the context path to entity set name from the metadata
            //if (navEntity) {
            Object.assign(entitiesToExpand, { [pageEntity.entityPath]: {} });
            //}
        }
    }
    let nestedExpands;
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
    const mainEntity = entities.listEntity;
    let mainEntityFilters: Filter<string>[] = [];
    mainEntity.semanticKeys.forEach((key) => {
        if (key.value) {
            let filter: string | object = key.value;
            // Create the range and set values
            const filterParts = key.value.split(',');
            let filterRanges: Filter<string>[] = [];
            filterParts.forEach((filterPart) => {
                const filterRangeParts = filterPart.trim().split('-');

                if (filterRangeParts.length === 2) {
                    filterRanges.push({
                        [key.name]: {
                            ge: filterRangeParts[0],
                            le: filterRangeParts[1]
                        }
                    });
                }
            });

            mainEntityFilters.push(
                filterRanges.length == 1
                    ? filterRanges[0]
                    : {
                          or: filterRanges
                      }
            );
        }
    });

    // Build the query object
    let queryInput = {};

    if (entitiesToExpand) {
        Object.assign(queryInput, { expand: entitiesToExpand });
    }
    if (mainEntityFilters) {
        Object.assign(queryInput, {
            // todo: multiple keys should be and'd
            filter: mainEntityFilters.length === 1 ? mainEntityFilters[0] : mainEntityFilters
        });
    } else if (top) {
        Object.assign(queryInput, {
            top
        });
    }
    const queryString = buildQuery(queryInput);
    const query = `${mainEntity.entitySetName}${queryString}`;
    ODataDownloadGenerator.logger.info(`Query for odata: ${query}`);
    try {
        const data = await odataService?.get(query);
        // Process the result set into individual entity data for files
        return { entityData: data?.odata() };
    } catch (error) {
        ODataDownloadGenerator.logger.error(`An error occurred when querying for odata: ${error}`);
        return { error: 'An error occurred when querying for odata. See the log for details.' };
    }
}
