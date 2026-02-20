import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import {
    getBindingContextTypePrompt,
    getBuildingBlockIdPrompt,
    getEntityPrompt,
    getTargetPropertiesPrompt,
    getAggregationPathPrompt,
    getViewOrFragmentPathPrompt
} from '../utils';
import type { PromptContext, Prompts } from '../../../prompts/types';
import { BuildingBlockType, bindingContextAbsolute } from '../../types';
import type { BuildingBlockConfig, RichTextEditor } from '../../types';
import { resolveBindingContextTypeChoices } from '../utils/prompt-helpers';

export type RichTextEditorPromptsAnswer = BuildingBlockConfig<RichTextEditor> & Answers;

/**
 * Returns a list of prompts required to generate a rich text editor building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for rich text editor.
 */
export async function getRichTextEditorBuildingBlockPrompts(
    context: PromptContext
): Promise<Prompts<RichTextEditorPromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.richTextEditor.');

    return {
        questions: [
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                guiOptions: {
                    mandatory: true
                }
            }),
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath']
                }
            }),
            getBindingContextTypePrompt({
                name: 'buildingBlockData.metaPath.bindingContextType',
                message: t('bindingContextType') as string,
                default: bindingContextAbsolute,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.entitySet']
                },
                choices: resolveBindingContextTypeChoices(context)
            }),
            getEntityPrompt(context, {
                name: 'buildingBlockData.metaPath.entitySet',
                default: context.options?.pageContextEntitySet,
                message: t('entitySet') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.targetProperty']
                }
            }),
            getTargetPropertiesPrompt(context, {
                name: 'buildingBlockData.targetProperty',
                message: t('targetProperty') as string,
                guiOptions: {
                    mandatory: true
                }
            }),
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: {
                    mandatory: true
                }
            })
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.RichTextEditor
            }
        }
    };
}
