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
import { BuildingBlockType, bindingContextAbsolute, bindingContextRelative } from '../../types';
import type { BuildingBlockConfig, RichTextEditor } from '../../types';
import { loadEntitySets, getEntitySetOptions } from '../utils/prompt-helpers';

export type RichTextEditorPromptsAnswer = BuildingBlockConfig<RichTextEditor> & Answers;

/**
 * Returns binding context type choices for a prompt, optionally disabling the "relative" option and providing a tooltip.
 *
 * @param disableRelative - If true, disables the "relative" option in the returned choices.
 * @returns An array of choice objects for binding context type selection.
 */
function getBindingContextTypeChoices(disableRelative: boolean = false) {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.');
    return [
        { name: t('common.bindingContextType.option.absolute') as string, value: bindingContextAbsolute },
        {
            name: t('common.bindingContextType.option.relative') as string,
            value: bindingContextRelative,
            ...(disableRelative ? { disabled: true, title: t('richTextEditor.relativeBindingDisabledTooltip') } : {})
        }
    ];
}

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
    const { project } = context;

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
                choices: project
                    ? async () => {
                          const entitySets = await loadEntitySets(context);
                          const { pageContextEntitySet } = context.options ?? {};

                          if (!pageContextEntitySet) {
                              return getBindingContextTypeChoices();
                          }

                          // Check if there are any entity sets available for relative binding context.
                          // If none are found, disable the "Relative" option since the user has nothing to select.
                          const options = getEntitySetOptions(entitySets, pageContextEntitySet, bindingContextRelative);
                          if (!options.length) {
                              return getBindingContextTypeChoices(true);
                          }

                          return getBindingContextTypeChoices();
                      }
                    : getBindingContextTypeChoices()
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
