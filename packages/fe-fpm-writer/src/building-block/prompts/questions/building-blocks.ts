import { i18nNamespaces, initI18n, translate } from '../../../i18n';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockTypePromptsAnswer, PromptQuestion } from '../types';

/**
 * Returns a list of prompts required to generate building blocks.
 *
 * @returns The list of prompts for building block types selection.
 */
export async function getBuildingBlockTypePrompts(): Promise<PromptQuestion<BuildingBlockTypePromptsAnswer>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.super.');
    return [
        {
            type: 'list',
            name: 'buildingBlockType',
            message: t('buildingBlockType.message'),
            choices: [
                { name: t('buildingBlockType.choices.chart'), value: BuildingBlockType.Chart },
                { name: t('buildingBlockType.choices.filterBar'), value: BuildingBlockType.FilterBar },
                { name: t('buildingBlockType.choices.table'), value: BuildingBlockType.Table }
            ]
        }
    ];
}
