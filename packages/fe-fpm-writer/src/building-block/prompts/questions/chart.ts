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
 * @param {Editor} fs the memfs editor instance
 * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
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
            getViewOrFragmentPathPrompt(
                fs,
                basePath,
                t('viewOrFragmentPath.message'),
                t('viewOrFragmentPath.validate'),
                ['aggregationPath', 'filterBar'],
                { required: true }
            ),
            getBuildingBlockIdPrompt(fs, t('id.message'), t('id.validation'), basePath, defaultAnswers.id, {
                required: true
            }),
            getBindingContextTypePrompt(t('bindingContextType'), 'relative', ['buildingBlockData.metaPath.qualifier'], {
                required: true
            }),
            ...((await isCapProject(projectProvider))
                ? [await getCAPServicePrompt(t('service'), projectProvider, [], { required: true })]
                : []),
            getEntityPrompt(t('entity'), projectProvider, ['buildingBlockData.metaPath.qualifier'], { required: true }),
            getAnnotationPathQualifierPrompt(t('qualifier'), projectProvider, [UIAnnotationTerms.Chart], {
                additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                required: true,
                placeholder: t('qualifierPlaceholder')
            }),
            getAggregationPathPrompt(t('aggregation'), fs, basePath, {
                required: true
            }),
            getFilterBarIdPrompt(t('filterBar.message'), 'list', fs, basePath, {
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
