import { i18nNamespaces, translate } from '../../../i18n';
import { BuildingBlockType } from '../../types';
import type { Answers, Prompts, PromptsType } from '../../../prompts/types';

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: PromptsType;
}

/**
 * Returns a list of prompts required to generate building blocks.
 *
 * @returns The list of prompts for building block types selection.
 */
export async function getBuildingBlockTypePrompts(): Promise<Prompts<BuildingBlockTypePromptsAnswer>> {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.super.');
    return {
        questions: [
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
        ]
    };
}
