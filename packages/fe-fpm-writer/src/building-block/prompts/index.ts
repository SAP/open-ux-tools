import type { Editor } from 'mem-fs-editor';
import { translate, i18nNamespaces, initI18n } from '../../i18n';
import type { BuildingBlockType, Chart, FilterBar } from '../types';
import type { Answers, InputQuestion, ListQuestion, Question } from 'inquirer';

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: BuildingBlockType;
}

/**
 * Returns a list of prompts required to generate building blocks.
 *
 * @returns {Promise<PromptObject<keyof BuildingBlockTypePromptsAnswer>[]>} the list of prompts
 */
export async function getBuildingBlockTypePrompts(): Promise<Question<BuildingBlockTypePromptsAnswer>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.super.');
    return [
        {
            type: 'list',
            name: 'buildingBlockType',
            message: t('buildingBlockType.message'),
            choices: [
                { name: t('buildingBlockType.choices.chart'), value: 'chart' },
                { name: t('buildingBlockType.choices.filterBar'), value: 'filter-bar' }
            ]
        } as ListQuestion
    ];
}

export interface ChartPromptsAnswer extends Chart, Answers {
    viewOrFragmentFile: string;
}

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
 */
export async function getChartBuildingBlockPrompts(
    basePath: string,
    fs: Editor
): Promise<Question<ChartPromptsAnswer>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    return [
        // {
        //     type: 'select',
        //     name: 'viewOrFragmentFile',
        //     message: t('viewOrFragmentFile.message'),
        //     choices: async () => {
        //         let files = await findFiles(FileName.Fragment, basePath, ['.git', 'node_modules', 'dist'], fs);
        //         files = files.concat(await findFiles(FileName.View, basePath, ['.git', 'node_modules', 'dist'], fs));
        //         return files.map((file) => ({ title: relative(basePath, file), value: file }));
        //     },
        //     validate: (value: string) => (value ? true : t('viewOrFragmentFile.validation'))
        // } as any,
        {
            type: 'input',
            name: 'id',
            message: t('id.message'),
            validate: (value) => (value ? true : t('id.validation'))
        } as InputQuestion,
        {
            type: 'input',
            name: 'contextPath',
            message: t('contextPath')
        } as InputQuestion,
        {
            type: 'input',
            name: 'metaPath',
            message: t('metaPath')
        } as InputQuestion,
        {
            type: 'input',
            name: 'filterBar',
            message: t('filterBar')
        } as InputQuestion,
        {
            type: 'list',
            name: 'personalization',
            message: t('personalization.message'),
            choices: [
                { name: t('personalization.choices.type'), value: 'Type' },
                { name: t('personalization.choices.item'), value: 'Item' },
                { name: t('personalization.choices.sort'), value: 'Sort' }
            ]
        } as ListQuestion,
        {
            type: 'list',
            name: 'selectionMode',
            message: t('selectionMode.message'),
            choices: [
                { name: t('selectionMode.choices.single'), value: 'Single' },
                { name: t('selectionMode.choices.multiple'), value: 'Multiple' }
            ]
        } as ListQuestion,
        {
            type: 'input',
            name: 'selectionChange',
            message: t('selectionChange')
        } as InputQuestion
    ];
}

export interface FilterBarPromptsAnswer extends FilterBar, Answers {}

/**
 * Returns a list of prompts required to generate a filter bar building block.
 *
 * @returns {Promise<PromptObject<keyof FilterBarPromptsAnswer>[]>} the list of prompts
 */
export async function getFilterBarBuildingBlockPrompts(): Promise<Question<FilterBarPromptsAnswer>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');
    return [
        {
            type: 'text',
            name: 'id',
            message: t('id.message'),
            validate: (value) => (value ? true : t('id.validation'))
        },
        {
            type: 'text',
            name: 'contextPath',
            message: t('contextPath')
        },
        {
            type: 'text',
            name: 'metaPath',
            message: t('metaPath')
        },
        {
            type: 'text',
            name: 'filterChanged',
            message: t('filterChanged')
        },
        {
            type: 'text',
            name: 'search',
            message: t('search')
        }
    ];
}
