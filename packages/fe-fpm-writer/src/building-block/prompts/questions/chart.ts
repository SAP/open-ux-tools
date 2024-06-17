import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { i18nNamespaces, initI18n, translate } from '../../../i18n';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBuildingBlockIdPrompt,
    getCAPServicePrompt,
    getEntityPrompt,
    getFilterBarIdListPrompt,
    getViewOrFragmentFilePrompt,
    isCapProject,
    validateElementId
} from '../utils';
import type { ProjectProvider } from '../utils';
import type { ChartPromptsAnswer, Prompts } from '../types';

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
    // ToDO - init i18n in api contructor?
    await initI18n();
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    const validateFn = async (value: string, answers?: Answers) => {
        return value && answers?.viewOrFragmentFile && (await validateElementId(answers?.viewOrFragmentFile, value))
            ? t('id.validateExistingValueMsg')
            : true;
    };
    const defaultAnswers: Answers = {
        id: 'Chart'
    };
    return {
        questions: [
            getViewOrFragmentFilePrompt(
                fs,
                basePath,
                t('viewOrFragmentFile.message'),
                t('viewOrFragmentFile.validate'),
                ['aggregationPath', 'filterBarId'],
                { required: true }
            ),
            getBuildingBlockIdPrompt(
                t('id.message'),
                t('id.validation'),
                defaultAnswers.id,
                {
                    required: true
                },
                validateFn
            ),
            ...((await isCapProject(projectProvider))
                ? [await getCAPServicePrompt(t('service'), projectProvider, [], { required: true })]
                : []),
            getEntityPrompt(t('entity'), projectProvider, ['qualifier'], { required: true }),
            getAnnotationPathQualifierPrompt('qualifier', t('qualifier'), projectProvider, [UIAnnotationTerms.Chart], {
                additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                required: true,
                placeholder: t('qualifierPlaceholder')
            }),
            getAggregationPathPrompt(t('aggregation'), fs, {
                required: true
            }),
            getFilterBarIdListPrompt(t('filterBar'), fs),
            {
                type: 'checkbox',
                name: 'personalization',
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
                name: 'selectionMode',
                message: t('selectionMode.message'),
                choices: [
                    { name: t('selectionMode.choices.single'), value: 'Single' },
                    { name: t('selectionMode.choices.multiple'), value: 'Multiple' }
                ]
            },
            {
                type: 'input',
                name: 'selectionChange',
                message: t('selectionChange'),
                placeholder: t('selectionChangePlaceholder')
            }
        ]
    };
}
