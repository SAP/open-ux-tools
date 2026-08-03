import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n.js';
import { getBuildingBlockIdPrompt, getViewOrFragmentPathPrompt, getAggregationPathPrompt } from '../utils/index.js';
import type { PromptContext, Prompts } from '../../../prompts/types.js';
import { BuildingBlockType, MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT, PageTemplateType } from '../../types.js';
import type { BuildingBlockConfig, Page } from '../../types.js';
import { SapShortTextType, SapLongTextType } from '@sap-ux/i18n';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { coerce, lt } from 'semver';
import { getManifest } from '../../../common/utils.js';

export type PagePromptsAnswer = BuildingBlockConfig<Page> & Answers;

/**
 * Returns a list of prompts required to generate a page building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for page.
 */
export async function getPageBuildingBlockPrompts(context: PromptContext): Promise<Prompts<PagePromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.page.');

    const { content: manifest } = await getManifest(context.appPath, context.fs, false);
    const minUI5Version = manifest ? coerce(getMinimumUI5Version(manifest)) : undefined;
    const hideTemplateType = !!minUI5Version && lt(minUI5Version, MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT);

    return {
        questions: [
            ...(hideTemplateType
                ? []
                : [
                      {
                          type: 'list' as const,
                          name: 'buildingBlockData.templateType',
                          message: t('templateType.message') as string,
                          default: PageTemplateType.Basic,
                          choices: [
                              { value: PageTemplateType.Basic, name: t('templateType.basic') as string },
                              { value: PageTemplateType.Full, name: t('templateType.full') as string }
                          ],
                          guiOptions: { mandatory: true }
                      }
                  ]),
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
                buildingBlockType: BuildingBlockType.Page,
                ...(hideTemplateType ? { templateType: PageTemplateType.Basic } : {})
            }
        }
    };
}
