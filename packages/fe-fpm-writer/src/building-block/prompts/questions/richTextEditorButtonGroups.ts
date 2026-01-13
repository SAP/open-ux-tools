import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import type { Prompts, PromptContext } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, RichTextEditorButtonGroups } from '../../types';
import { getAggregationPathPrompt, getViewOrFragmentPathPrompt } from '../utils';
import { join } from 'path';
import { getExistingButtonGroups } from '../utils/xml';

export type RichTextEditorButtonGroupsPromptsAnswer = BuildingBlockConfig<RichTextEditorButtonGroups> & Answers;

const t = translate(i18nNamespaces.buildingBlock, 'prompts.richTextEditorButtonGroups.');

/**
 * Returns the default button group choices for RTE.
 */
function getDefaultButtonGroupsChoices(): Array<{ name: string; value: string }> {
    return [
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
    ];
}

/**
 * Get button groups choices based on existing XML content.
 * If no existing button groups, all are checked by default.
 *
 * @param context - Prompt context
 * @param answers - Current answers
 * @returns Array of button group choices with checked state based on XML
 */
async function getButtonGroupsChoices(context: PromptContext, answers: Answers) {
    const { project, appPath, fs } = context;
    if (!project) {
        return [];
    }

    // Get existing button groups from XML if viewOrFragmentPath is available
    let existingButtonGroups = new Set<string>();
    if (answers.viewOrFragmentPath) {
        const xmlFilePath = join(appPath, answers.viewOrFragmentPath);
        existingButtonGroups = await getExistingButtonGroups(xmlFilePath, answers.aggregationPath, fs);
    }

    // If no existing button groups, default all to checked
    const isInitial = !existingButtonGroups || existingButtonGroups.size === 0;

    return getDefaultButtonGroupsChoices().map((choice) => ({
        ...choice,
        checked: isInitial || existingButtonGroups.has(choice.value)
    }));
}

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
                    dependantPromptNames: ['aggregationPath']
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
