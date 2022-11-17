import { FileName, findFiles } from '@sap-ux/project-access';
import { Editor } from 'mem-fs-editor';
import { relative } from 'path';
import type { PromptObject } from 'prompts';
import { translate, i18nNamespaces, initI18n } from '../../i18n';
import type { BuildingBlockType, Chart, FilterBar } from '../types';

export interface BuildingBlockTypePromptsAnswer {
    buildingBlockType: BuildingBlockType;
}

/**
 * Returns a list of prompts required to generate building blocks.
 *
 * @returns {Promise<PromptObject<keyof BuildingBlockTypePromptsAnswer>[]>} the list of prompts
 */
export async function getBuildingBlockTypePrompts(): Promise<PromptObject<keyof BuildingBlockTypePromptsAnswer>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.super.');
    return [
        {
            type: 'select',
            name: 'buildingBlockType',
            message: t('buildingBlockType.message'),
            choices: [
                { title: t('buildingBlockType.choices.chart'), value: 'chart' },
                { title: t('buildingBlockType.choices.filterBar'), value: 'filter-bar' }
            ]
        }
    ];
}

export interface ChartPromptsAnswer extends Chart {
    viewOrFragmentFile: string;
}

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @return {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
 */
export async function getChartBuildingBlockPrompts(
    basePath: string,
    fs: Editor
): Promise<PromptObject<keyof ChartPromptsAnswer>[]> {
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
            name: 'filterBar',
            message: t('filterBar')
        },
        {
            type: 'multiselect',
            name: 'personalization',
            message: t('personalization.message'),
            choices: [
                { title: t('personalization.choices.type'), value: 'Type' },
                { title: t('personalization.choices.item'), value: 'Item' },
                { title: t('personalization.choices.sort'), value: 'Sort' }
            ]
        },
        {
            type: 'select',
            name: 'selectionMode',
            message: t('selectionMode.message'),
            choices: [
                { title: t('selectionMode.choices.single'), value: 'Single' },
                { title: t('selectionMode.choices.multiple'), value: 'Multiple' }
            ]
        },
        {
            type: 'text',
            name: 'selectionChange',
            message: t('selectionChange')
        }
    ];
}

export type FilterBarPromptsAnswer = FilterBar;

/**
 * Returns a list of prompts required to generate a filter bar building block.
 *
 * @returns {Promise<PromptObject<keyof FilterBarPromptsAnswer>[]>} the list of prompts
 */
export async function getFilterBarBuildingBlockPrompts(): Promise<PromptObject<keyof FilterBarPromptsAnswer>[]> {
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
