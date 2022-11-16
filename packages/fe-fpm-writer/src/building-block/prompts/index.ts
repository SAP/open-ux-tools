import type { PromptObject } from 'prompts';
import { translate, i18nNamespaces, initI18n } from '../../i18n';
import type { Chart, FilterBar } from '../types';

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @returns {Promise<PromptObject<keyof Chart>[]>} the list of prompts
 */
export async function getChartBuildingBlockPrompts(): Promise<PromptObject<keyof Chart>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    return [
        {
            type: 'text',
            name: 'id',
            message: t('id')
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

/**
 * Returns a list of prompts required to generate a filter bar building block.
 *
 * @returns {Promise<PromptObject<keyof FilterBar>[]>} the list of prompts
 */
export async function getFilterBarBuildingBlockPrompts(): Promise<PromptObject<keyof FilterBar>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');
    return [
        {
            type: 'text',
            name: 'id',
            message: t('id')
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
