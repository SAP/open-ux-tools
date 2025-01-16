import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata, EntitySet, NavigationProperty } from '@sap-ux/vocabularies-types';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../../i18n';
import LoggerHelper from '../logger-helper';

export type EntityAnswer = {
    entitySetName: string;
    entitySetType: string;
};

export type NavigationEntityAnswer = {
    navigationPropertyName: string;
    entitySetName: string;
};

interface EntityChoiceOptions {
    choices: ListChoiceOptions<EntityAnswer>[];
    draftRootIndex?: number;
    defaultMainEntityIndex?: number;
    convertedMetadata?: ConvertedMetadata;
    odataVersion?: OdataVersion;
}

export type EntitySetFilter = 'filterDraftEnabled' | 'filterAggregateTransformationsOnly';
/**
 * Returns the entity choice options for use in a list inquirer prompt.
 *
 * @param edmx metadata string
 * @param options
 * @param options.useEntityTypeAsName Choice options will use the non-namepspaced entity set type as the choice name (label) and value property `entitySetName` when true, otherwise the entity set name will be used.
 * @param options.entitySetFilter
 *     `filterDraftEnabled` : Only draft enabled entities wil be returned when true, useful for Form Object Page app generation.
 *     `filterAggregateTransformationsOnly` : Only return entity choices that have an aggregate annotation (Aggregation.ApplySupported) with the `Transformations` property set,
 *  specifically used for ALP V4 app generation.
 * @param options.defaultMainEntityName The default selected entity set name
 * @returns entity options
 */
export function getEntityChoices(
    edmx: string,
    {
        useEntityTypeAsName = false,
        entitySetFilter,
        defaultMainEntityName
    }: {
        useEntityTypeAsName?: boolean;
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
        const parsedOdataVersion = parseInt(convertedMetadata?.version, 10);

        if (Number.isNaN(parsedOdataVersion)) {
            LoggerHelper.logger.error(t('errors.unparseableOdataVersion'));
            throw new Error(t('errors.unparseableOdataVersion'));
        }
        // Note that odata version > `4` e.g. `4.1`, is not currently supported by `@sap-ux/edmx-converter`
        odataVersion = parsedOdataVersion === 4 ? OdataVersion.v4 : OdataVersion.v2;

        let entitySets: EntitySet[] = [];

        if (entitySetFilter === 'filterDraftEnabled') {
            entitySets = filterDraftEnabledEntities(convertedMetadata.entitySets) ?? [];
        } else if (entitySetFilter === 'filterAggregateTransformationsOnly') {
            entitySets = filterAggregateTransformations(convertedMetadata.entitySets);
        } else {
            entitySets = convertedMetadata.entitySets;
        }

        entitySets.forEach((entitySet, index) => {
            // Determine whether to use the entity set type name or the entity set name as the choice name.
            // Note that in the case of the entity type name, the namespace will be removed.
            const entitySetChoiceName = useEntityTypeAsName
                ? entitySet.entityTypeName.substring(entitySet.entityTypeName.lastIndexOf('.') + 1)
                : entitySet.name;
            const choice: ListChoiceOptions<EntityAnswer> = {
                name: entitySetChoiceName,
                value: {
                    entitySetName: entitySetChoiceName,
                    entitySetType: entitySet.entityTypeName // Fully qualified entity type name
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
        LoggerHelper.logger.log(t('errors.unparseableMetadata', { error: err.message }));
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
 * @param entitySets
 * @param entityType
 * @returns
 */
function findEntitySetName(entitySets: EntitySet[], entityType: string): string | undefined {
    const foundEntitySet = entitySets.find((entitySet) => {
        return entitySet.entityTypeName === entityType;
    });
    return foundEntitySet ? foundEntitySet.name : undefined;
}

/**
 *
 * @param metadata
 * @param odataVersion
 * @param mainEntityName
 * @returns
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
 * Returns only entity sets that have the `Aggregation.ApplySupported` annotation term with the `Transformations` property.
 *
 * @param entitySets
 * @returns
 */
function filterAggregateTransformations(entitySets: EntitySet[]): EntitySet[] {
    return entitySets.filter((entitySet) => {
        return !!entitySet.annotations?.Aggregation?.ApplySupported?.Transformations;
    });
}

/**
 * Returns only entities that have a type property of 'HasDraftEnabled'.
 *
 * @param entitySets
 * @returns
 */
function filterDraftEnabledEntities(entitySets: EntitySet[]): EntitySet[] | undefined {
    return entitySets.filter((entitySet) => {
        const entitySetTypeProperties = entitySet.entityType.entityProperties;
        return !!entitySetTypeProperties.find((property) => property.name === 'HasDraftEntity');
    });
}
