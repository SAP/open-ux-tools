import { i18nNamespaces, translate } from '../../../i18n';
import { BuildingBlockType } from '../../types';
import type { Answers, Prompts, PromptsGroup, PromptsType } from '../../../prompts/types';

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: PromptsType;
}

/**
 * Returns the manifest prompts group, the same for all available building blocks.
 *
 * @returns The manifest prompts group.
 */
export const getManifestPromptsGroup = (): PromptsGroup => {
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.super.manifestGroup.');
    return {
        id: 'manifestLibraries',
        title: t('manifestLibrariesTitle') as string,
        description: t('manifestLibrariesDescription', { returnObjects: true }) as string[]
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
                message: t('buildingBlockType.message') as string,
                choices: [
                    { name: t('buildingBlockType.choices.chart') as string, value: BuildingBlockType.Chart },
                    { name: t('buildingBlockType.choices.filterBar') as string, value: BuildingBlockType.FilterBar },
                    { name: t('buildingBlockType.choices.table') as string, value: BuildingBlockType.Table }
                ]
            }
        ]
    };
}
