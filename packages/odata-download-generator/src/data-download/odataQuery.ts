import { ODataService } from '@sap-ux/axios-extension';
import buildQuery from 'odata-query';
import { ReferencedEntities } from './prompts';
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

    let entitiesToExpand = [];

    for (const pageEntity of entities.pageObjectEntities ?? []) {
        const skip = selectedEntities?.find((entityPath) => {
            return entityPath.fullPath.startsWith(pageEntity.entityPath);
        });
        // Skip expansion of the list entity itself
        if (pageEntity.entitySetName !== entities.listEntity.entitySetName && !skip) {
            // Last part of context path is the navigation property entity name
            // const navEntity = entity.match((/[^\/]+$/))?.[0];
            // todo: reverse engineer the context path to entity set name from the metadata
            //if (navEntity) {
            entitiesToExpand.push(pageEntity.entityPath);
            //}
        }
    }

    if (selectedEntities) {
        for (const entityPath of selectedEntities) {
            entitiesToExpand.push(entityPath.fullPath);
        }
    }
    const mainEntity = entities.listEntity;
    let mainEntityKeys: { [key: string]: string } = {};
    mainEntity.keys.forEach((key) => {
        if (key.value) {
            mainEntityKeys[key.name] = key.value;
        }
    });
    const keyQuery = mainEntity.keys ? buildQuery({ key: mainEntityKeys }).replaceAll('\'','') : '';
    const expandQuery = buildQuery({ expand: entitiesToExpand });
    const data = await odataService?.get(`${mainEntity.entitySetName}${keyQuery}${expandQuery}`);
    // Process the result set into individual entity data for files
    return { entityData: data?.odata() };
}
