import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata, EntitySet, NavigationProperty } from '@sap-ux/vocabularies-types';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../../i18n';
import LoggerHelper from '../logger-helper';
import type { TableType, TemplateType } from '@sap-ux/fiori-elements-writer';
import {
    filterAggregateTransformations,
    hasCompleteAggregateTransformationsForEntity,
    hasRecursiveHierarchyForEntity
} from '@sap-ux/inquirer-common';

export type EntityAnswer = {
    entitySetName: string;
    entitySetType: string;
    /**
     * Represents a parameter used along with the main entity to query data.
     * When this parameter is set, the prompt for selecting navigation properties is skipped
     * This property is populated only if the metadata entity set includes a `Common.ResultContext` annotation,
     * indicating that the entity set requires additional parameters for querying.
     */
    mainEntityParameterName?: string;
};

export type NavigationEntityAnswer = {
    navigationPropertyName: string;
    entitySetName: string;
};

export interface EntityChoiceOptions {
    choices: ListChoiceOptions<EntityAnswer>[];
    draftRootIndex?: number;
    defaultMainEntityIndex?: number;
    convertedMetadata?: ConvertedMetadata;
    odataVersion?: OdataVersion;
}

export type EntitySetFilter = 'filterDraftEnabled' | 'filterAggregateTransformationsOnly';

/**
 * Finds the navigation property name that links a parameterised entity set to its target entity set.
 *
 * This function checks if the given entity set has the `Common.ResultContext` annotation, indicating
 * that it is a parameterised entity. It then searches for a navigation property that:
 * - Points to a target entity (`containsTarget === true`).
 * - Has a partner navigation property named `Parameters` (linking back to the parameters entity).
 *
 * If such a navigation property is found, its name is returned and skips navigation entity selection prompt
 * Otherwise, `null` is returned.
 *
 * @param entitySet - The entity set to search for navigation properties.
 * @param entityTypes - The list of entity types to search for matching navigation properties.
 * @returns The name of the matching navigation property, or `null` if no match is found.
 */
function getNavigationPropertyForParameterisedEntity(
    entitySet: EntitySet,
    entityTypes?: ConvertedMetadata['entityTypes']
): string | undefined {
    // Check if the entity type has the Common.ResultContext annotation
    const hasResultContextAnnotation = Boolean(entitySet?.entityType?.annotations?.Common?.ResultContext);

    if (!hasResultContextAnnotation) {
        // If the entity set is not parameterised, no parametrised navigation is expected
        return undefined;
    }

    // Get all navigation properties of the parameterised entity type
    const navigationProperties = entitySet?.entityType?.navigationProperties ?? [];
    // Find the first navigation property that meets the criteria.
    for (const navigationProperty of navigationProperties) {
        if (
            navigationProperty.containsTarget === true && // Points to a target entity
            navigationProperty.partner // The partner navigation property name is defined
        ) {
            const isMatchingEntitySet = entityTypes?.filter(
                (entityType: any) => entityType.fullyQualifiedName === navigationProperty.targetTypeName
            );
            // Check if the target type name matches the provided entity type name
            if (isMatchingEntitySet) {
                // Return the navigation property name
                return navigationProperty.name;
            }
        }
    }

    // If no matching navigation property is found, return undefined
    return undefined;
}
/**
 * Returns the entity choice options for use in a list inquirer prompt.
 *
 * @param edmx metadata string
 * @param options
 * @param options.entitySetFilter
 *     `filterDraftEnabled` : Only draft enabled entities wil be returned when true, useful for Form Object Page app generation.
 *     `filterAggregateTransformationsOnly` : Only return entity choices that have an aggregate annotation (Aggregation.ApplySupported) with the `Transformations` property set,
 *  specifically used for ALP V4 app generation. If this option is set and the specified metadata is not V4, the option will be ignored.
 * @param options.defaultMainEntityName The default selected entity set name
 * @returns entity options
 */
export function getEntityChoices(
    edmx: string,
    {
        entitySetFilter,
        defaultMainEntityName
    }: {
        entitySetFilter?: EntitySetFilter;
        defaultMainEntityName?: string;
    } = {}
): EntityChoiceOptions {
    const choices: ListChoiceOptions<EntityAnswer>[] = [];
    let draftRootIndex: number | undefined;
    let defaultMainEntityIndex: number | undefined;
    let convertedMetadata: ConvertedMetadata | undefined;
    let odataVersion: OdataVersion | undefined;
    try {
        convertedMetadata = convert(parse(edmx));
        const parsedOdataVersion = Number.parseInt(convertedMetadata?.version, 10);
        if (Number.isNaN(parsedOdataVersion)) {
            LoggerHelper.logger.error(t('errors.unparseableOdataVersion'));
            throw new Error(t('errors.unparseableOdataVersion'));
        }
        // Note that odata version > `4` e.g. `4.1`, is not currently supported by `@sap-ux/edmx-converter`
        odataVersion = parsedOdataVersion === 4 ? OdataVersion.v4 : OdataVersion.v2;
        let entitySets: EntitySet[] = [];

        if (entitySetFilter === 'filterDraftEnabled') {
            entitySets = filterDraftEnabledEntities(convertedMetadata.entitySets) ?? [];
        } else if (entitySetFilter === 'filterAggregateTransformationsOnly' && odataVersion === OdataVersion.v4) {
            // Only for v4 odata version, if a v2 metadata is passed, this will be ignored
            entitySets = filterAggregateTransformations(convertedMetadata.entitySets);
        } else {
            entitySets = convertedMetadata.entitySets;
        }
        entitySets.forEach((entitySet, index) => {
            const mainEntityParameterName = getNavigationPropertyForParameterisedEntity(
                entitySet,
                convertedMetadata?.entityTypes
            );
            const choice: ListChoiceOptions<EntityAnswer> = {
                name: entitySet.name,
                value: {
                    entitySetName: entitySet.name,
                    entitySetType: entitySet.entityTypeName, // Fully qualified entity type name
                    ...(mainEntityParameterName && {
                        mainEntityParameterName
                    }) // parameterised navigation property name
                }
            };
            choices.push(choice);
            // Select the first found draft root index
            if (!draftRootIndex && entitySet.annotations?.Common?.DraftRoot) {
                draftRootIndex = index;
            }

            if (defaultMainEntityName && entitySet.name === defaultMainEntityName) {
                defaultMainEntityIndex = index;
            }
        });
    } catch (err) {
        LoggerHelper.logger.error(t('errors.unparseableMetadata', { error: err.message }));
    }

    return {
        choices,
        draftRootIndex,
        defaultMainEntityIndex,
        convertedMetadata,
        odataVersion
    };
}

/**
 * Get the entity set name from its type name.
 *
 * @param entitySets the entity sets to search
 * @param entityType the entity type name to search for
 * @returns the entity set name if found, otherwise undefined
 */
function findEntitySetName(entitySets: EntitySet[], entityType: string): string | undefined {
    const foundEntitySet = entitySets.find((entitySet) => {
        return entitySet.entityTypeName === entityType;
    });
    return foundEntitySet ? foundEntitySet.name : undefined;
}

/**
 * Get the navigation entity choices for a main entity.
 *
 * @param metadata the converted metadata (edmx)
 * @param odataVersion the odata version, which will determine the navigation properties to return
 * @param mainEntityName the main entity name to get the navigation properties for
 * @returns the navigation entity choices
 */
export function getNavigationEntityChoices(
    metadata: ConvertedMetadata,
    odataVersion: OdataVersion,
    mainEntityName: string
): ListChoiceOptions<NavigationEntityAnswer>[] {
    const choices: ListChoiceOptions[] = [];
    const mainEntitySet = metadata.entitySets.find((entitySet) => entitySet.name === mainEntityName);

    let navProps: NavigationProperty[] = [];
    if (odataVersion === OdataVersion.v4) {
        navProps = mainEntitySet?.entityType.navigationProperties.filter((navProp) => navProp.isCollection) ?? [];
    } else {
        navProps = mainEntitySet?.entityType.navigationProperties ?? [];
    }

    navProps.forEach((navProp) => {
        choices.push({
            name: navProp.name,
            value: {
                navigationPropertyName: navProp.name,
                entitySetName: findEntitySetName(metadata.entitySets, navProp.targetTypeName)
            } as NavigationEntityAnswer
        });
    });

    if (choices.length > 0) {
        choices.unshift({ name: t('prompts.navigationEntitySelection.choiceNone'), value: {} });
    }
    return choices;
}

/**
 * Returns only entities that have a type property of 'HasDraftEnabled'.
 *
 * @param entitySets the entity sets to filter by draft enabled entities
 * @returns the filtered entity sets
 */
export function filterDraftEnabledEntities(entitySets: EntitySet[]): EntitySet[] | undefined {
    return entitySets.filter((entitySet) => {
        const entitySetTypeProperties = entitySet.entityType.entityProperties;
        return !!entitySetTypeProperties.find((property) => property.name === 'HasDraftEntity');
    });
}

/**
 * Get the default table type based on the template type and previous answers.
 *
 * @param templateType the template type of the application to be generated from the prompt answers
 * @param metadata the metadata (edmx) string of the service
 * @param odataVersion the OData version of the service
 * @param mainEntitySetName the name of the main entity set
 * @param currentTableType the current table type selected by the user
 * @returns the default table type and a boolean indicating if AnalyticalTable should be set as default
 */
export function getDefaultTableType(
    templateType: TemplateType,
    metadata: ConvertedMetadata,
    odataVersion: OdataVersion,
    mainEntitySetName?: string,
    currentTableType?: TableType
): { tableType: TableType; setAnalyticalTableDefault: boolean } {
    let tableType: TableType;
    let setAnalyticalTableDefault = false;

    if (
        (templateType === 'lrop' || templateType === 'worklist') &&
        odataVersion === OdataVersion.v4 &&
        hasCompleteAggregateTransformationsForEntity(metadata, mainEntitySetName)
    ) {
        // If the main entity type is annotated with Aggregation.ApplySupported containing all 9 transformations, use AnalyticalTable as default
        tableType = 'AnalyticalTable';
        setAnalyticalTableDefault = true;
    } else if (
        (templateType === 'lrop' || templateType === 'worklist') &&
        odataVersion === OdataVersion.v4 &&
        hasRecursiveHierarchyForEntity(metadata, mainEntitySetName)
    ) {
        // If the main entity type is annotated with Hierarchy.RecursiveHierarchy, use TreeTable as default
        tableType = 'TreeTable';
    } else if (templateType === 'alp') {
        // For ALP, use AnalyticalTable as default
        tableType = 'AnalyticalTable';
    } else if (currentTableType) {
        // If the user has already selected a table type use it
        tableType = currentTableType;
    } else {
        // Default to ResponsiveTable for other cases
        tableType = 'ResponsiveTable';
    }
    return {
        tableType,
        setAnalyticalTableDefault
    };
}
