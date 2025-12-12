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
     * Get button groups choices based on existing XML content.
     *
     * @param context - Prompt context
     * @param answers - Current answers
     * @returns Array of button group choices with checked state based on XML
     */
    async function getButtonGroupsChoices(context: PromptContext, answers: Answers) {
        const { project, appPath, fs } = context;
        debugger;
        
        if (!project) {
            return [];
        }

        // Get existing button groups from XML if viewOrFragmentPath is available
        let existingButtonGroups = new Set<string>();
        if (answers.viewOrFragmentPath) {
            const xmlFilePath = join(appPath, answers.viewOrFragmentPath);
            existingButtonGroups = await getExistingButtonGroups(xmlFilePath, answers.aggregationPath, fs);
        }

        return [
            { name: t('choices.fontStyle') as string, value: 'font-style', checked: existingButtonGroups.has('font-style')},
            { name: t('choices.font') as string, value: 'font', checked: existingButtonGroups.has('font') },
            { name: t('choices.clipboard') as string, value: 'clipboard', checked: existingButtonGroups.has('clipboard') },
            { name: t('choices.structure') as string, value: 'structure', checked: existingButtonGroups.has('structure') },
            { name: t('choices.undo') as string, value: 'undo', checked: existingButtonGroups.has('undo') },
            { name: t('choices.insert') as string, value: 'insert', checked: existingButtonGroups.has('insert') },
            { name: t('choices.link') as string, value: 'link', checked: existingButtonGroups.has('link') },
            { name: t('choices.textAlign') as string, value: 'text-align', checked: existingButtonGroups.has('text-align') },
            { name: t('choices.table') as string, value: 'table', checked: existingButtonGroups.has('table') },
            { name: t('choices.styleSelect') as string, value: 'styleselect', checked: existingButtonGroups.has('styleselect') }
        ];
    }

/**
 * Returns a list of prompts required to generate a rich text editor building block.
 *
 * @returns Prompt with questions for rich text editor.
 */
export async function getRichTextEditorButtonGroupsBuildingBlockPrompts(
    context: PromptContext
): Promise<
    Prompts<RichTextEditorButtonGroupsPromptsAnswer>
> {
    const { project, appPath } = context;

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
