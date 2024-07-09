import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { i18nNamespaces, translate } from '../../../i18n';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBuildingBlockIdPrompt,
    getCAPServicePrompt,
    getEntityPrompt,
    getViewOrFragmentPathPrompt,
    isCapProject
} from '../utils';
import type { ProjectProvider } from '../utils';
import type { Prompts, FilterBarPromptsAnswer } from '../types';
import { BuildingBlockType } from '../../types';

/**
 * Returns a list of prompts required to generate a filterbar building block.
 *
 * @param fs the memfs editor instance
 * @param basePath Path to project
 * @param projectProvider Project provider
 * @returns Prompt with questions for filterbar.
 */
export async function getFilterBarBuildingBlockPrompts(
    fs: Editor,
    basePath: string,
    projectProvider: ProjectProvider
): Promise<Prompts<FilterBarPromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');

    const defaultAnswers: Answers = {
        id: 'FilterBar'
    };
    return {
        questions: [
            getViewOrFragmentPathPrompt(fs, basePath, t('viewOrFragmentPath.validate'), {
                required: true,
                message: t('viewOrFragmentPath.message'),
                dependantPromptNames: ['aggregationPath']
            }),
            getBuildingBlockIdPrompt(fs, t('id.validation'), basePath, {
                message: t('id.message'),
                default: defaultAnswers.id,
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
            getAggregationPathPrompt(fs, basePath, { message: t('aggregation'), required: true }),
            getEntityPrompt(projectProvider, {
                message: t('entity'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                required: true
            }),
            getAnnotationPathQualifierPrompt(projectProvider, [UIAnnotationTerms.SelectionFields], {
                message: t('qualifier'),
                additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                required: true,
                placeholder: t('qualifierPlaceholder')
            }),
            {
                type: 'input',
                name: 'buildingBlockData.filterChanged',
                message: t('filterChanged')
            },
            {
                type: 'input',
                name: 'buildingBlockData.search',
                message: t('search')
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.FilterBar
            }
        }
    };
}
