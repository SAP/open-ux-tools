import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers, CheckboxQuestion, InputQuestion, ListQuestion, Question } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { i18nNamespaces, initI18n, translate } from '../../i18n';
import type { Chart, FilterBar, Table } from '../types';
import { BuildingBlockType } from '../types';
import ProjectProvider from '../utils/project';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBindingContextTypePrompt,
    getBooleanPrompt,
    getBuildingBlockIdPrompt,
    getEntityPrompt,
    getFilterBarIdPrompt,
    getViewOrFragmentFilePrompt
} from '../utils/prompts';

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
                { name: t('buildingBlockType.choices.chart'), value: BuildingBlockType.Chart },
                { name: t('buildingBlockType.choices.filterBar'), value: BuildingBlockType.FilterBar },
                { name: t('buildingBlockType.choices.table'), value: BuildingBlockType.Table }
            ]
        } as ListQuestion
    ];
}

export interface ChartPromptsAnswer extends Chart, Answers {
    viewOrFragmentFile: string;
    aggregationPath: string;
    id: string;
    entity: string;
    filterBar: string;
    selectionMode: string;
    selectionChange: string;
    chartQualifier: string;
    bindingContextType: 'relative' | 'absolute';
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
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);
    return [
        getViewOrFragmentFilePrompt(fs, basePath, t('viewOrFragmentFile.message'), t('viewOrFragmentFile.validate')),
        getBuildingBlockIdPrompt(t('id.message'), t('id.validation')),
        getBindingContextTypePrompt(t('bindingContextType')),

        getFilterBarIdPrompt(t('filterBar')),
        {
            type: 'checkbox',
            name: 'personalization',
            message: t('personalization.message'),
            choices: [
                { name: t('personalization.choices.type'), value: 'Type' },
                { name: t('personalization.choices.item'), value: 'Item' },
                { name: t('personalization.choices.sort'), value: 'Sort' }
            ]
        } as CheckboxQuestion,
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
        } as InputQuestion,
        getAggregationPathPrompt(t('aggregation'), fs),
        getEntityPrompt(t('entity'), projectProvider),
        getAnnotationPathQualifierPrompt('chartQualifier', t('chartQualifier'), projectProvider, [
            UIAnnotationTerms.Chart
        ])
    ];
}

export interface TablePromptsAnswer extends Table, Answers {
    viewOrFragmentFile: string;
    aggregationPath: string;
    id: string;
    entity: string;
    filterBar: string;
    selectionChange: string;
    bindingContextType: 'relative' | 'absolute';
    lineItemQualifier: string;
    type: 'ResponsiveTable' | 'GridTable';
    displayHeader: boolean;
    tableHeaderText: string;
}

/**
 * Returns a list of prompts required to generate a table building block.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
 */
export async function getTableBuildingBlockPrompts(
    basePath: string,
    fs: Editor
): Promise<Question<TablePromptsAnswer>[]> {
    await initI18n();
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.table.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);
    return [
        getViewOrFragmentFilePrompt(fs, basePath, t('viewOrFragmentFile.message'), t('viewOrFragmentFile.validate')),
        getBuildingBlockIdPrompt(t('id.message'), t('id.validation')),
        getBindingContextTypePrompt(t('bindingContextType')),
        getEntityPrompt(t('entity'), projectProvider),

        getAnnotationPathQualifierPrompt('lineItemQualifier', t('lineItemQualifier'), projectProvider, [
            UIAnnotationTerms.LineItem
        ]),
        getAggregationPathPrompt(t('aggregation'), fs),
        getFilterBarIdPrompt(t('filterBar')),
        {
            type: 'list',
            name: 'type',
            message: t('tableType.message'),
            choices: [
                // ResponsiveTable | GridTable
                { name: 'Responsive Table', value: 'ResponsiveTable' },
                { name: 'Grid Table', value: 'GridTable' }
            ]
        } as ListQuestion,
        {
            type: 'list',
            name: 'selectionMode',
            message: t('selectionMode.message'),
            choices: [
                // None, Single, Multi or Auto
                { name: t('selectionMode.choices.single'), value: 'Single' },
                { name: t('selectionMode.choices.multiple'), value: 'Multi' },
                { name: t('selectionMode.choices.auto'), value: 'Auto' },
                { name: t('selectionMode.choices.none'), value: 'None' }
            ]
        } as ListQuestion,
        getBooleanPrompt('displayHeader', t('displayHeader')),
        {
            type: 'input',
            name: 'header',
            message: t('tableHeaderText')
        } as InputQuestion,
        {
            type: 'checkbox',
            name: 'personalization',
            message: t('personalization.message'),
            choices: [
                { name: t('personalization.choices.Sort'), value: 'Sort' },
                { name: t('personalization.choices.Column'), value: 'Column' },
                { name: t('personalization.choices.Filter'), value: 'Filter' }
            ]
        } as CheckboxQuestion,
        {
            type: 'list',
            name: 'variantManagement',
            message: t('tableVariantManagement'),
            choices: [
                { name: 'Page', value: 'Page' },
                { name: 'Control', value: 'Control' },
                { name: 'None', value: 'None' }
            ]
        } as ListQuestion,
        getBooleanPrompt('readOnly', t('readOnlyMode')),
        getBooleanPrompt('enableAutoColumnWidth', t('autoColumnWidth')),
        getBooleanPrompt('enableExport', t('dataExport')),
        getBooleanPrompt('enableFullScreen', t('fullScreenMode')),
        getBooleanPrompt('enablePaste', t('pasteFromClipboard')),
        getBooleanPrompt('isSearchable', t('tableSearchableToggle'))
    ];
}

export interface FilterBarPromptsAnswer extends FilterBar, Answers {
    selectionFieldQualifier: string;
    entity: string;
    viewOrFragmentFile: string;
}

/**
 * Returns a list of prompts required to generate a filter bar building block.
 *
 * @param basePath
 * @param fs
 * @returns {Promise<PromptObject<keyof FilterBarPromptsAnswer>[]>} the list of prompts
 */
export async function getFilterBarBuildingBlockPrompts(
    basePath: string,
    fs: Editor
): Promise<Question<FilterBarPromptsAnswer>[]> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);

    return [
        getViewOrFragmentFilePrompt(fs, basePath, t('viewOrFragmentFile.message'), t('viewOrFragmentFile.validate')),
        getBuildingBlockIdPrompt(t('id.message'), t('id.validation')),
        getAggregationPathPrompt(t('message'), fs),
        getEntityPrompt(t('entity'), projectProvider),
        getAnnotationPathQualifierPrompt('selectionFieldQualifier', t('selectionFieldQualifier'), projectProvider, [
            UIAnnotationTerms.SelectionFields
        ]),
        {
            type: 'input',
            name: 'filterChanged',
            message: t('filterChanged')
        },
        {
            type: 'input',
            name: 'search',
            message: t('search')
        }
    ];
}
