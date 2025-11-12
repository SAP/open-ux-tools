import { Answers, CheckboxChoiceOptions } from 'inquirer';
import { Entity, ReferencedEntities } from './prompts';
import { add } from 'lodash';

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
                    entityFileData[pageEntity.entitySetName].push(...pageEntityArray);
                    // Next level expanded properties...todo: should be recursive
                    additionalEntities?.forEach((addEntity) => {
                        pageEntityArray.forEach((pageEntity: any) => {
                            if (pageEntity[addEntity.entity.entityPath]) {
                                entityFileData[addEntity.entity.entitySetName] =
                                    entityFileData[addEntity.entity.entitySetName] || [];
                                entityFileData[addEntity.entity.entitySetName].push(
                                    ...pageEntity[addEntity.entity.entityPath]
                                );
                            }
                        });
                        // delete
                    });
                    // remove the reference as the entity will be separate file
                    // delete (mainEntityRow as any)[pageEntity.entityPath];
                }
            });
        }
        entityFileData[entities.listEntity.entitySetName].push(mainEntityRow);
    });

    /* entityFileData = {
        [entities.listEntity]: entities. */

    return entityFileData;
}

export interface SelectedEntityAnswer extends Answers {
    fullPath: string;
    entity: Entity;
}

export function createRelatedEntityChoices(
    relatedEntities: Map<Entity, Entity[]>
): CheckboxChoiceOptions<SelectedEntityAnswer>[] {
    const choices: CheckboxChoiceOptions[] = [];
    relatedEntities.forEach((entities, parentEntity) => {
        entities.forEach((entity) => {
            // fix issue with prompt values containing `name
            const entityClone = {
                entityPath: entity.entityPath,
                entitySetName: entity.entitySetName
            };

            choices.push({
                name: `${parentEntity.entitySetName} (${parentEntity.entityPath}) > ${entity.entitySetName} (${entity.entityPath})`,
                value: {
                    fullPath: `${parentEntity.entityPath}/${entity.entityPath}`,
                    entity: entityClone
                }
            });
        });
    });
    return choices;
}
