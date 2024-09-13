import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBindingContextTypePrompt,
    getBuildingBlockIdPrompt,
    getCAPServicePrompt,
    getEntityPrompt,
    getViewOrFragmentPathPrompt,
    isCapProject
} from '../utils';
import type { Prompts, PromptContext, PromptsGroup } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, FilterBar } from '../../types';
import type { TFunction } from 'i18next';
import { getManifestPromptsGroup } from './building-blocks';

const MANIFEST_LIBRARIES_GROUP = getManifestPromptsGroup();

export type FilterBarPromptsAnswer = BuildingBlockConfig<FilterBar> & Answers;

const defaultAnswers = {
    id: 'FilterBar',
    bindingContextType: 'absolute'
};

const groupIds = {
    commonBlockProperties: 'filterBarBuildingBlockProperties',
    filterConfigureEvents: 'filterConfigureEvents'
};

/**
 * Returns a list of prompts required to generate a filterbar building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for filterbar.
 */
export async function getFilterBarBuildingBlockPrompts(
    context: PromptContext
): Promise<Prompts<FilterBarPromptsAnswer>> {
    const { project } = context;
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');
    const groups: PromptsGroup[] = [
        {
            id: groupIds.commonBlockProperties,
            title: t('filterBarBuildingBlockPropertiesTitle'),
            description: t('filterBarBuildingBlockPropertiesDescription', { returnObjects: true })
        },
        {
            id: groupIds.filterConfigureEvents,
            title: t('filterBarConfigureEventsTitle'),
            description: t('filterBarConfigureEventsDescription', { returnObjects: true })
        },
        MANIFEST_LIBRARIES_GROUP
    ];
    return {
        groups,
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate'), {
                message: t('viewOrFragmentPath.message'),
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath']
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                guiOptions: { groupId: groupIds.commonBlockProperties, mandatory: true }
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType'),
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          message: t('service'),
                          guiOptions: {
                              groupId: groupIds.commonBlockProperties,
                              mandatory: true,
                              dependantPromptNames: []
                          }
                      })
                  ]
                : []),
            getAggregationPathPrompt(context, {
                message: t('aggregation'),
                guiOptions: { groupId: groupIds.commonBlockProperties, mandatory: true }
            }),
            getEntityPrompt(context, {
                message: t('entity'),
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier'),
                    guiOptions: {
                        groupId: groupIds.commonBlockProperties,
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder'),
                        hint: t('valuesDependentOnEntityTypeInfo')
                    }
                },
                [UIAnnotationTerms.SelectionFields]
            ),
            {
                type: 'input',
                name: 'buildingBlockData.filterChanged',
                message: t('filterChanged'),
                guiOptions: { groupId: groupIds.filterConfigureEvents }
            },
            {
                type: 'input',
                name: 'buildingBlockData.search',
                message: t('search'),
                guiOptions: { groupId: groupIds.filterConfigureEvents }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.FilterBar
            }
        }
    };
}
