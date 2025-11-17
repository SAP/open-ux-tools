import { ODataService } from '@sap-ux/axios-extension';
import buildQuery from 'odata-query';
import { Entity, ReferencedEntities } from './prompts';
import { SelectedEntityAnswer } from './utils';
import { ODataDownloadGenerator } from './odataDownloadGenerator';

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
    let mainEntityFilters: { [key: string]: string } | undefined;
    mainEntity.semanticKeys.forEach((key) => {
        if (key.value) {
            mainEntityFilters = mainEntityFilters ?? {};
            mainEntityFilters[key.name] = key.value;
        }
    });

    // Build the query object
    let queryInput = {};

    if (entitiesToExpand) {
        Object.assign(queryInput, { expand: entitiesToExpand })
    }
    if (mainEntityFilters) {
        Object.assign(queryInput, { 
            filter: mainEntityFilters 
        });
    } else if (top){
        Object.assign(queryInput, {
            top
        })
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
