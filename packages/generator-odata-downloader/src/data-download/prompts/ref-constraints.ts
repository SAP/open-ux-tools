import type { ListQuestion } from '@sap-ux/inquirer-common';
import type { HierarchyEntity } from '../types';

/**
 * Get prompts used to create referential constraints files where they are missing in hierarchy related entities.
 * Missing constraints would otherwise lead to errors using mock data server.
 *
 * @param hierarchyEntities
 */
export function getMissingReferentialConstraintsPrompts(hierarchyEntities: HierarchyEntity[]): ListQuestion[] {
    const missingRefConsPrompts: ListQuestion[] = [];
    // Create 2 list propmts per entity, source and target, listing the non-nav props
    const getRefConsPrompts = (entity: HierarchyEntity): ListQuestion[] => [
        {
            name: `${entity.entitySetName}/${entity.nodeProperty}/source`,
            type: 'list',
            message: `Source: ${entity.entitySetName} > ${entity.missingReferentialConstraints?.navPropName}`,
            default: false,
            choices: entity.entityProperties.map((key) => ({ name: key, value: key }))
        },
        {
            name: `${entity.entitySetName}/${entity.nodeProperty}/target`,
            type: 'list',
            message: `Target: ${entity.entitySetName} > ${entity.missingReferentialConstraints?.navPropName}`,
            default: false,
            choices: entity.entityProperties.map((key) => ({ name: key, value: key }))
        }
    ];

    hierarchyEntities.forEach((entity) => {
        if (!entity.parentProperty && entity.missingReferentialConstraints?.navPropName) {
            missingRefConsPrompts.push(...getRefConsPrompts(entity));
        }
    });
    return missingRefConsPrompts;
}
