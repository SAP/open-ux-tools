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
import { getManifestPromptsGroup } from './building-blocks';

const MANIFEST_LIBRARIES_GROUP = getManifestPromptsGroup();

export type FilterBarPromptsAnswer = BuildingBlockConfig<FilterBar> & Answers;

const defaultAnswers = {
    id: 'FilterBar',
    bindingContextType: 'absolute'
};

const groupIds = {
    commonFilterBarBuildingBlockProperties: 'filterBarBuildingBlockProperties',
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
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');
    const groups: PromptsGroup[] = [
        {
            id: groupIds.commonFilterBarBuildingBlockProperties,
            title: t('filterBarBuildingBlockPropertiesTitle') as string,
            description: t('filterBarBuildingBlockPropertiesDescription', { returnObjects: true }) as string[]
        },
        {
            id: groupIds.filterConfigureEvents,
            title: t('filterBarConfigureEventsTitle') as string,
            description: t('filterBarConfigureEventsDescription', { returnObjects: true }) as string[]
        },
        MANIFEST_LIBRARIES_GROUP
    ];
    return {
        groups,
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    groupId: groupIds.commonFilterBarBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath']
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                default: defaultAnswers.id,
                guiOptions: { groupId: groupIds.commonFilterBarBuildingBlockProperties, mandatory: true }
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType') as string,
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    groupId: groupIds.commonFilterBarBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          message: t('service') as string,
                          guiOptions: {
                              groupId: groupIds.commonFilterBarBuildingBlockProperties,
                              mandatory: true,
                              dependantPromptNames: []
                          }
                      })
                  ]
                : []),
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: { groupId: groupIds.commonFilterBarBuildingBlockProperties, mandatory: true }
            }),
            getEntityPrompt(context, {
                message: t('entity') as string,
                guiOptions: {
                    groupId: groupIds.commonFilterBarBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier') as string,
                    guiOptions: {
                        groupId: groupIds.commonFilterBarBuildingBlockProperties,
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder') as string,
                        hint: t('valuesDependentOnEntityTypeInfo') as string
                    }
                },
                [UIAnnotationTerms.SelectionFields]
            ),
            {
                type: 'input',
                name: 'buildingBlockData.filterChanged',
                message: t('filterChanged') as string,
                guiOptions: {
                    groupId: groupIds.filterConfigureEvents,
                    placeholder: t('filterChangedPlaceholder') as string
                }
            },
            {
                type: 'input',
                name: 'buildingBlockData.search',
                message: t('search') as string,
                guiOptions: { groupId: groupIds.filterConfigureEvents, placeholder: t('searchPlaceholder') as string }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.FilterBar
            }
        }
    };
}
