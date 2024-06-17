import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { i18nNamespaces, initI18n, translate } from '../../i18n';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBuildingBlockIdPrompt,
    getCAPServicePrompt,
    getEntityPrompt,
    getViewOrFragmentFilePrompt,
    validateElementId,
    isCapProject
} from './utils';
import type { ProjectProvider } from './utils';
import type { Prompts, FilterBarPromptsAnswer } from './types';

export async function getFilterBarBuildingBlockPrompts(
    fs: Editor,
    basePath: string,
    projectProvider: ProjectProvider
): Promise<Prompts<FilterBarPromptsAnswer>> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');

    const defaultAnswers: Answers = {
        id: 'FilterBar'
    };
    const validateFn = async (value: string, answers?: Answers) => {
        return value && answers?.viewOrFragmentFile && (await validateElementId(answers?.viewOrFragmentFile, value))
            ? t('id.validateExistingValueMsg')
            : true;
    };
    return {
        questions: [
            getViewOrFragmentFilePrompt(
                fs,
                basePath,
                t('viewOrFragmentFile.message'),
                t('viewOrFragmentFile.validate'),
                ['aggregationPath'],
                { required: true }
            ),
            getBuildingBlockIdPrompt(
                t('id.message'),
                t('id.validation'),
                defaultAnswers.id,
                { required: true },
                validateFn
            ),
            ...((await isCapProject(projectProvider))
                ? [await getCAPServicePrompt(t('service'), projectProvider, [], { required: true })]
                : []),
            getAggregationPathPrompt(t('aggregation'), fs, { required: true }),
            getEntityPrompt(t('entity'), projectProvider, ['qualifier'], { required: true }),
            getAnnotationPathQualifierPrompt(
                'qualifier',
                t('qualifier'),
                projectProvider,
                [UIAnnotationTerms.SelectionFields],
                {
                    additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                    required: true,
                    placeholder: t('qualifierPlaceholder')
                }
            ),
            {
                type: 'input',
                name: 'filterChanged',
                message: t('filterChanged')
            },
            {
                type: 'input',
                name: 'search',
                message: t('search')
            }
        ]
    };
}
