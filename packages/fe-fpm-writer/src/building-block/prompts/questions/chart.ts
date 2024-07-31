import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
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
import type { PromptContext, Prompts } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, Chart } from '../../types';

export type ChartPromptsAnswer = BuildingBlockConfig<Chart> & Answers;

const defaultAnswers = {
    id: 'Chart',
    bindingContextType: 'absolute'
};

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for chart.
 */
export async function getChartBuildingBlockPrompts(context: PromptContext): Promise<Prompts<ChartPromptsAnswer>> {
    const { project } = context;
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    return {
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate'), {
                message: t('viewOrFragmentPath.message'),
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath', 'buildingBlockData.filterBar']
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                guiOptions: {
                    mandatory: true
                }
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType'),
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          message: t('service'),
                          guiOptions: {
                              mandatory: true,
                              dependantPromptNames: []
                          }
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity'),
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier'),
                    guiOptions: {
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder'),
                        hint: t('valuesDependentOnEntityTypeInfo')
                    }
                },
                [UIAnnotationTerms.Chart]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation'),
                guiOptions: {
                    mandatory: true
                }
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message'),
                type: 'list',
                guiOptions: {
                    placeholder: t('filterBar.placeholder'),
                    creation: { placeholder: t('filterBar.inputPlaceholder') }
                }
            }),
            {
                type: 'checkbox',
                name: 'buildingBlockData.personalization',
                message: t('personalization.message'),
                choices: [
                    { name: t('personalization.choices.type'), value: 'Type' },
                    { name: t('personalization.choices.item'), value: 'Item' },
                    { name: t('personalization.choices.sort'), value: 'Sort' }
                ],
                guiOptions: {
                    placeholder: t('personalization.placeholder'),
                    selectType: 'static'
                }
            },
            {
                type: 'list',
                name: 'buildingBlockData.selectionMode',
                message: t('selectionMode.message'),
                choices: [
                    { name: t('selectionMode.choices.single'), value: 'Single' },
                    { name: t('selectionMode.choices.multiple'), value: 'Multiple' }
                ],
                guiOptions: {
                    selectType: 'static'
                }
            },
            {
                type: 'input',
                name: 'buildingBlockData.selectionChange',
                message: t('selectionChange'),
                guiOptions: {
                    placeholder: t('selectionChangePlaceholder')
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
