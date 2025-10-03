import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import { getBuildingBlockIdPrompt, getViewOrFragmentPathPrompt, getAggregationPathPrompt } from '../utils';
import type { PromptContext, Prompts } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, Page } from '../../types';
import { SapShortTextType, SapLongTextType } from '@sap-ux/i18n';

export type PagePromptsAnswer = BuildingBlockConfig<Page> & Answers;

/**
 * Returns a list of prompts required to generate a page building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for page.
 */
export async function getPageBuildingBlockPrompts(context: PromptContext): Promise<Prompts<PagePromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.page.');

    return {
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath']
                }
            }),
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: {
                    mandatory: true
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                default: 'Page',
                guiOptions: {
                    mandatory: true
                }
            }),
            {
                type: 'input',
                name: 'buildingBlockData.title',
                message: t('title.message') as string,
                guiOptions: {
                    mandatory: true,
                    translationProperties: {
                        type: SapShortTextType.Heading,
                        annotation: t('title.translationAnnotation') as string
                    }
                }
            },
            {
                type: 'input',
                name: 'buildingBlockData.description',
                message: t('description.message') as string,
                guiOptions: {
                    translationProperties: {
                        type: SapLongTextType.Description,
                        annotation: t('description.translationAnnotation') as string
                    }
                }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Page
            }
        }
    };
}
