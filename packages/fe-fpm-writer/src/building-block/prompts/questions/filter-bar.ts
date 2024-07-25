import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers } from 'inquirer';
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
import type { Prompts, PromptContext } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, FilterBar } from '../../types';

export type FilterBarPromptsAnswer = BuildingBlockConfig<FilterBar> & Answers;

const defaultAnswers: Answers = {
    id: 'FilterBar'
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

    return {
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate'), {
                required: true,
                message: t('viewOrFragmentPath.message'),
                dependantPromptNames: ['aggregationPath']
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                required: true
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          required: true,
                          message: t('service'),
                          dependantPromptNames: []
                      })
                  ]
                : []),
            getAggregationPathPrompt(context, { message: t('aggregation'), required: true }),
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
                [UIAnnotationTerms.SelectionFields]
            ),
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
