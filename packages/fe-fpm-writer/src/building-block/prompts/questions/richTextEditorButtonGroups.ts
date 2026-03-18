import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import type { Prompts, PromptContext } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, RichTextEditorButtonGroups } from '../../types';
import { getAggregationPathPrompt, getViewOrFragmentPathPrompt } from '../utils';
import { getButtonGroupsChoices } from '../utils/prompt-helpers';

export type RichTextEditorButtonGroupsPromptsAnswer = BuildingBlockConfig<RichTextEditorButtonGroups> & Answers;

const t = translate(i18nNamespaces.buildingBlock, 'prompts.richTextEditorButtonGroups.');

/**
 * Returns a list of prompts required to generate a rich text editor building block.
 *
 * @param context
 * @returns Prompt with questions for rich text editor.
 */
export async function getRichTextEditorButtonGroupsBuildingBlockPrompts(
    context: PromptContext
): Promise<Prompts<RichTextEditorButtonGroupsPromptsAnswer>> {
    return {
        questions: [
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath', 'buildingBlockData.buttonGroups']
                }
            }),
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: {
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.buttonGroups']
                }
            }),
            {
                type: 'checkbox',
                name: 'buildingBlockData.buttonGroups',
                message: t('message') as string,
                choices: (answers: Answers) => getButtonGroupsChoices(context, answers),
                guiOptions: {
                    hint: t('replaceDefaultButtonGroupsHint') as string,
                    selectType: 'dynamic'
                }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups
            }
        }
    };
}
