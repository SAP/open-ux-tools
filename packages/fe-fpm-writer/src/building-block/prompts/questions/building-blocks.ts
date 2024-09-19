import { i18nNamespaces, translate } from '../../../i18n';
import { BuildingBlockType } from '../../types';
import type { Answers, Prompts, PromptsGroup, PromptsType } from '../../../prompts/types';
import type { TFunction } from 'i18next';

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: PromptsType;
}

/**
 * Returns the manifest prompts group, the same for all available building blocks.
 *
 * @returns The manifest prompts group.
 */
export const getManifestPromptsGroup = (): PromptsGroup => {
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.super.manifestGroup.');
    return {
        id: 'manifestLibraries',
        title: t('manifestLibrariesTitle'),
        description: t('manifestLibrariesDescription', { returnObjects: true })
    };
};

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
