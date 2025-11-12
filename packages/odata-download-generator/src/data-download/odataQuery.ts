import { ODataService } from '@sap-ux/axios-extension';
import buildQuery from 'odata-query';
import { Entity, ReferencedEntities } from './prompts';
import { SelectedEntityAnswer } from './utils';

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
    selectedEntities?: SelectedEntityAnswer[]
): Promise<{ entityData: [] }> {
    // const query = createQueryBuilderV4(entities.listEntity).build();

    let entitiesToExpand: { [path: string]: { expand : string[]} } = {};

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
                : entitiesToExpand[parentPath].expand = [entity.entity.entityPath]
            }

            /* entitiesToExpand.forEach((entity) => {
                nestedExpand = nestedExpands?.[entity.entityPath] ? Object.assign(nestedExpands[entity.entityPath], {  })
            }) */
        }
    }
    const mainEntity = entities.listEntity;
    let mainEntityKeys: { [key: string]: string } | undefined;
    mainEntity.keys.forEach((key) => {
        if (key.value) {
            mainEntityKeys = mainEntityKeys ?? {};
            mainEntityKeys[key.name] = key.value;
        }
    });
    const keyQuery = mainEntityKeys ? buildQuery({ key: mainEntityKeys }).replaceAll('\'','') : '';
    const expandQuery = buildQuery({ expand: entitiesToExpand });
    const data = await odataService?.get(`${mainEntity.entitySetName}${keyQuery}${expandQuery}`);
    // Process the result set into individual entity data for files
    return { entityData: data?.odata() };
}
