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
import type { ChartPromptsAnswer, PromptContext, Prompts } from '../types';
import { BuildingBlockType } from '../../types';

const defaultAnswers: Answers = {
    id: 'Chart'
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
                required: true,
                message: t('viewOrFragmentPath.message'),
                dependantPromptNames: ['aggregationPath', 'filterBar']
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                required: true
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                default: 'relative',
                required: true
            }),
            ...((await isCapProject(project))
                ? [
                      await getCAPServicePrompt(context, {
                          required: true,
                          message: t('service'),
                          dependantPromptNames: []
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                required: true
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier'),
                    description: t('valuesDependentOnEntityTypeInfo'),
                    required: true,
                    placeholder: t('qualifierPlaceholder')
                },
                [UIAnnotationTerms.Chart]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation'),
                required: true
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message'),
                type: 'list',
                placeholder: t('filterBar.placeholder'),
                creation: { inputPlaceholder: t('filterBar.inputPlaceholder') }
            }),
            {
                type: 'checkbox',
                name: 'buildingBlockData.personalization',
                message: t('personalization.message'),
                selectType: 'static',
                choices: [
                    { name: t('personalization.choices.type'), value: 'Type' },
                    { name: t('personalization.choices.item'), value: 'Item' },
                    { name: t('personalization.choices.sort'), value: 'Sort' }
                ],
                placeholder: t('personalization.placeholder')
            },
            {
                type: 'list',
                selectType: 'static',
                name: 'buildingBlockData.selectionMode',
                message: t('selectionMode.message'),
                choices: [
                    { name: t('selectionMode.choices.single'), value: 'Single' },
                    { name: t('selectionMode.choices.multiple'), value: 'Multiple' }
                ]
            },
            {
                type: 'input',
                name: 'buildingBlockData.selectionChange',
                message: t('selectionChange'),
                placeholder: t('selectionChangePlaceholder')
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Chart
            }
        }
    };
}
