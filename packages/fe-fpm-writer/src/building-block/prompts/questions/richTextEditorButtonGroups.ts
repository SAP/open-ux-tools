import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import type { Prompts } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, RichTextEditorButtonGroups } from '../../types';

export type RichTextEditorButtonGroupsPromptsAnswer = BuildingBlockConfig<RichTextEditorButtonGroups> & Answers;

/**
 * Returns a list of prompts required to generate a rich text editor building block.
 *
 * @returns Prompt with questions for rich text editor.
 */
export async function getRichTextEditorButtonGroupsBuildingBlockPrompts(): Promise<
    Prompts<RichTextEditorButtonGroupsPromptsAnswer>
> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.richTextEditorButtonGroups.');

    return {
        questions: [
            {
                type: 'checkbox',
                name: 'buildingBlockData.buttonGroups',
                message: t('message') as string,
                choices: [
                    { name: t('choices.fontStyle') as string, value: 'font-style' },
                    { name: t('choices.font') as string, value: 'font' },
                    { name: t('choices.clipboard') as string, value: 'clipboard' },
                    { name: t('choices.structure') as string, value: 'structure' },
                    { name: t('choices.undo') as string, value: 'undo' },
                    { name: t('choices.insert') as string, value: 'insert' },
                    { name: t('choices.link') as string, value: 'link' },
                    { name: t('choices.textAlign') as string, value: 'text-align' },
                    { name: t('choices.table') as string, value: 'table' },
                    { name: t('choices.styleSelect') as string, value: 'styleselect' }
                ],
                guiOptions: {
                    hint: t('replaceDefaultButtonGroupsHint') as string
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
