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
    getFilterBarIdPrompt,
    getViewOrFragmentPathPrompt,
    isCapProject
} from '../utils';
import type { PromptContext, Prompts, PromptsGroup } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, Chart } from '../../types';
import { getManifestPromptsGroup } from './building-blocks';

const MANIFEST_LIBRARIES_GROUP = getManifestPromptsGroup();

export type ChartPromptsAnswer = BuildingBlockConfig<Chart> & Answers;

const defaultAnswers = {
    id: 'Chart',
    bindingContextType: 'absolute'
};

const groupIds = {
    commonChartBuildingBlockProperties: 'chartBuildingBlockProperties',
    chartVisualizationProperties: 'chartVisualizationProperties',
    chartConfigureEvents: 'chartConfigureEvents'
};

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for chart.
 */
export async function getChartBuildingBlockPrompts(context: PromptContext): Promise<Prompts<ChartPromptsAnswer>> {
    const { project } = context;
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    const groups: PromptsGroup[] = [
        {
            id: groupIds.commonChartBuildingBlockProperties,
            title: t('chartBuildingBlockPropertiesTitle') as string,
            description: t('chartBuildingBlockPropertiesDescription', { returnObjects: true }) as string[]
        },
        {
            id: groupIds.chartVisualizationProperties,
            title: t('chartVisualizationPropertiesTitle') as string,
            description: t('chartVisualizationPropertiesDescription', { returnObjects: true }) as string[]
        },
        {
            id: groupIds.chartConfigureEvents,
            title: t('chartConfigureEventsTitle') as string,
            description: t('chartConfigureEventsDescription', { returnObjects: true }) as string[]
        },
        MANIFEST_LIBRARIES_GROUP
    ];
    return {
        groups,
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    groupId: groupIds.commonChartBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath', 'buildingBlockData.filterBar']
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                default: defaultAnswers.id,
                guiOptions: { groupId: groupIds.commonChartBuildingBlockProperties, mandatory: true }
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType') as string,
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    groupId: groupIds.commonChartBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          message: t('service') as string,
                          guiOptions: {
                              groupId: groupIds.commonChartBuildingBlockProperties,
                              mandatory: true,
                              dependantPromptNames: []
                          }
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity') as string,
                guiOptions: {
                    groupId: groupIds.commonChartBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier') as string,
                    guiOptions: {
                        groupId: groupIds.commonChartBuildingBlockProperties,
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder') as string,
                        hint: t('valuesDependentOnEntityTypeInfo') as string
                    }
                },
                [UIAnnotationTerms.Chart]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: { groupId: groupIds.commonChartBuildingBlockProperties, mandatory: true }
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message') as string,
                type: 'list',
                guiOptions: {
                    groupId: groupIds.commonChartBuildingBlockProperties,
                    placeholder: t('filterBar.placeholder') as string,
                    creation: { placeholder: t('filterBar.inputPlaceholder') as string }
                }
            }),
            {
                type: 'checkbox',
                name: 'buildingBlockData.personalization',
                message: t('personalization.message') as string,
                choices: [
                    { name: t('personalization.choices.type') as string, value: 'Type' },
                    { name: t('personalization.choices.item') as string, value: 'Item' },
                    { name: t('personalization.choices.sort') as string, value: 'Sort' }
                ],
                guiOptions: {
                    groupId: groupIds.chartVisualizationProperties,
                    placeholder: t('personalization.placeholder') as string,
                    selectType: 'static'
                }
            },
            {
                type: 'list',
                name: 'buildingBlockData.selectionMode',
                message: t('selectionMode.message') as string,
                choices: [
                    { name: t('selectionMode.choices.single') as string, value: 'Single' },
                    { name: t('selectionMode.choices.multiple') as string, value: 'Multiple' }
                ],
                guiOptions: { groupId: groupIds.chartConfigureEvents, selectType: 'static' }
            },
            {
                type: 'input',
                name: 'buildingBlockData.selectionChange',
                message: t('selectionChange') as string,
                guiOptions: {
                    groupId: groupIds.chartConfigureEvents,
                    placeholder: t('selectionChangePlaceholder') as string
                }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Chart
            }
        }
    };
}
