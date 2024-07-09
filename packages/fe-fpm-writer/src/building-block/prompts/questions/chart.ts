import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
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
import type { ProjectProvider } from '../utils';
import type { ChartPromptsAnswer, Prompts } from '../types';
import { BuildingBlockType } from '../../types';

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @param fs the memfs editor instance
 * @param basePath Path to project
 * @param projectProvider Project provider
 * @returns Prompt with questions for chart.
 */
export async function getChartBuildingBlockPrompts(
    fs: Editor,
    basePath: string,
    projectProvider: ProjectProvider
): Promise<Prompts<ChartPromptsAnswer>> {
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    const defaultAnswers: Answers = {
        id: 'Chart'
    };
    return {
        questions: [
            getViewOrFragmentPathPrompt(fs, basePath, t('viewOrFragmentPath.validate'), {
                required: true,
                message: t('viewOrFragmentPath.message'),
                dependantPromptNames: ['aggregationPath', 'filterBar']
            }),
            getBuildingBlockIdPrompt(fs, t('id.validation'), basePath, {
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
            ...((await isCapProject(projectProvider))
                ? [
                      await getCAPServicePrompt(projectProvider, {
                          required: true,
                          message: t('service'),
                          dependantPromptNames: []
                      })
                  ]
                : []),
            getEntityPrompt(projectProvider, {
                message: t('entity'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                required: true
            }),
            getAnnotationPathQualifierPrompt(projectProvider, [UIAnnotationTerms.Chart], {
                message: t('qualifier'),
                additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                required: true,
                placeholder: t('qualifierPlaceholder')
            }),
            getAggregationPathPrompt(fs, basePath, {
                message: t('aggregation'),
                required: true
            }),
            getFilterBarIdPrompt(fs, basePath, {
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
