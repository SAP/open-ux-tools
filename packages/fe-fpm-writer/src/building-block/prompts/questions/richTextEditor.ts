import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import {
    getBindingContextTypePrompt,
    getBuildingBlockIdPrompt,
    getEntityPrompt,
    getTargetPropertiesPrompt,
    getAggregationPathPrompt
} from '../utils';
import type { PromptContext, Prompts } from '../../../prompts/types';
import { BuildingBlockType, bindingContextAbsolute } from '../../types';
import type { BuildingBlockConfig, RichTextEditor } from '../../types';

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
    const defaultAnswers = {
        buttonGroup: {
            name: 'font-style',
            visible: true,
            buttons: 'bold,italic,underline'
        }
    };

    return {
        questions: [
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                guiOptions: {
                    mandatory: true
                }
            }),
            getBindingContextTypePrompt({
                name: 'buildingBlockData.metaPath.bindingContextType',
                message: t('bindingContextType') as string,
                default: bindingContextAbsolute,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.entitySet']
                }
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
            }),
            {
                name: 'buildingBlockData.buttonGroup.name',
                type: 'input',
                message: t('buttonGroup.name') as string,
                default: defaultAnswers.buttonGroup.name
            },
            {
                name: 'buildingBlockData.buttonGroup.buttons',
                type: 'input',
                message: t('buttonGroup.buttons') as string,
                default: defaultAnswers.buttonGroup.buttons
            },
            {
                name: 'buildingBlockData.buttonGroup.visible',
                type: 'input',
                message: t('buttonGroup.visible') as string,
                default: defaultAnswers.buttonGroup.visible
            },
            {
                name: 'buildingBlockData.buttonGroup.priority',
                type: 'input',
                message: t('buttonGroup.priority') as string
            },
            {
                name: 'buildingBlockData.buttonGroup.customToolbarPriority',
                type: 'input',
                message: t('buttonGroup.customToolbarPriority') as string
            },
            {
                name: 'buildingBlockData.buttonGroup.row',
                type: 'input',
                message: t('buttonGroup.row') as string
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.RichTextEditor,
                buttonGroup: defaultAnswers.buttonGroup
            }
        }
    };
}
