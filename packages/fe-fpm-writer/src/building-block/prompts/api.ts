import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers, CheckboxQuestion, InputQuestion, ListQuestion, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
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
    getChoices,
    getEntityPrompt,
    getFilterBarIdPrompt,
    getViewOrFragmentFilePrompt,
    getXPathStringsForXmlFile
} from '../utils/prompts';
import { getAnnotationPathQualifiers, getEntityTypes } from '../utils/service';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import { relative } from 'path';
import type {
    ChartPromptsAnswer,
    Prompts,
    PromptsGroup,
    TablePromptsAnswer,
    BuildingBlockTypePromptsAnswer,
    FilterBarPromptsAnswer
} from './types';

const TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID = 'tableBuildingBlockProperties';
const TABLE_VISUALIZATION_PROPERTIES_GROUP_ID = 'tableVisualizationProperties';

/**
 * Gets building block choices.
 *
 * @param {string} buildingBlockType - The building block type
 * @param {string} fieldName - The field name
 * @param {unknown} answers - The answers object
 * @param {string} rootPath - The root path
 * @returns
 */
export async function getBuildingBlockChoices<T extends Answers>(
    buildingBlockType: string,
    fieldName: string,
    answers: T,
    rootPath: string
) {
    try {
        const projectProvider = await ProjectProvider.createProject(rootPath);
        const fs = create(createStorage());
        const entity = answers?.entity;
        const annotationTerms: UIAnnotationTerms[] = [];
        switch (fieldName) {
            case 'entity':
                return getChoices((await getEntityTypes(projectProvider)).map((e) => e.fullyQualifiedName));
            case 'aggregationPath': {
                if (!answers.viewOrFragmentFile) {
                    return [];
                }
                return getChoices(getXPathStringsForXmlFile(answers.viewOrFragmentFile, fs));
            }
            case 'viewOrFragmentFile': {
                const files = await findFilesByExtension(
                    '.xml',
                    rootPath,
                    ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                    fs
                );
                return files.map((file) => ({
                    name: relative(rootPath, file),
                    value: file
                }));
            }
            case 'qualifier':
                if (buildingBlockType === BuildingBlockType.Table) {
                    annotationTerms.push(...[UIAnnotationTerms.LineItem]);
                } else if (buildingBlockType === BuildingBlockType.Chart) {
                    annotationTerms.push(...[UIAnnotationTerms.Chart]);
                } else if (buildingBlockType === BuildingBlockType.FilterBar) {
                    annotationTerms.push(...[UIAnnotationTerms.SelectionFields]);
                }
                return getChoices(await getAnnotationPathQualifiers(projectProvider, entity, annotationTerms, true));
            default:
                return [];
        }
    } catch (error) {
        console.error(error);
        return [];
    }
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

/**
 * Returns a list of prompts required to generate a chart building block.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
 */
export async function getChartBuildingBlockPrompts(basePath: string, fs: Editor): Promise<Prompts<ChartPromptsAnswer>> {
    await initI18n();
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);
    const defaultAnswers: Answers = {
        id: 'Chart',
        bindingContextType: 'relative'
    };
    return {
        questions: [
            getViewOrFragmentFilePrompt(
                fs,
                basePath,
                t('viewOrFragmentFile.message'),
                t('viewOrFragmentFile.validate')
            ),
            getBuildingBlockIdPrompt(t('id.message'), t('id.validation'), defaultAnswers.id),
            getBindingContextTypePrompt(t('bindingContextType'), defaultAnswers.bindingContextType),
            getFilterBarIdPrompt(t('filterBar')),
            {
                type: 'checkbox',
                name: 'personalization',
                message: t('personalization.message'),
                selectType: 'static',
                choices: [
                    { name: t('personalization.choices.type'), value: 'Type' },
                    { name: t('personalization.choices.item'), value: 'Item' },
                    { name: t('personalization.choices.sort'), value: 'Sort' }
                ]
            } as CheckboxQuestion,
            {
                type: 'list',
                selectType: 'static',
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
            getEntityPrompt(t('entity'), projectProvider, ['qualifier']),
            getAnnotationPathQualifierPrompt(
                'qualifier',
                t('qualifier'),
                projectProvider,
                [UIAnnotationTerms.Chart],
                undefined,
                t('valuesDependentOnEntityTypeInfo')
            )
        ]
    };
}

/**
 * Returns a list of prompts required to generate a table building block.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
 */
export async function getTableBuildingBlockPrompts(basePath: string, fs: Editor): Promise<Prompts<TablePromptsAnswer>> {
    await initI18n();
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.table.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);
    const groups: PromptsGroup[] = [
        {
            id: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
            title: t('tableBuildingBlockPropertiesTitle'),
            description: t('tableBuildingBlockPropertiesDescription', { returnObjects: true })
        },
        {
            id: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID,
            title: t('tableVisualizationPropertiesTitle'),
            description: t('tableVisualizationPropertiesDescription', { returnObjects: true })
        }
    ];
    const defaultAnswers: Answers = {
        id: 'Table',
        bindingContextType: 'relative',
        type: 'ResponsiveTable',
        selectionMode: 'Single',
        displayHeader: true,
        variantManagement: 'None',
        readOnly: false,
        enableAutoColumnWidth: false,
        enableExport: false,
        enableFullScreen: false,
        enablePaste: false,
        isSearchable: true
    };
    return {
        groups,
        questions: [
            //first prompt group
            getViewOrFragmentFilePrompt(
                fs,
                basePath,
                t('viewOrFragmentFile.message'),
                t('viewOrFragmentFile.validate'),
                ['aggregationPath'],
                TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID
            ),
            getBuildingBlockIdPrompt(
                t('id.message'),
                t('id.validation'),
                defaultAnswers.id,
                TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID
            ),
            getBindingContextTypePrompt(
                t('bindingContextType'),
                defaultAnswers.bindingContextType,
                TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID
            ),
            getEntityPrompt(t('entity'), projectProvider, ['qualifier'], TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID),
            getAnnotationPathQualifierPrompt(
                'qualifier',
                t('qualifier'),
                projectProvider,
                [UIAnnotationTerms.LineItem],
                TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                t('valuesDependentOnEntityTypeInfo')
            ),
            getAggregationPathPrompt(t('aggregation'), fs, TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID),
            getFilterBarIdPrompt(t('filterBar.message'), TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID),

            //second prompt group
            {
                type: 'list',
                name: 'type',
                message: t('tableType.message'),
                choices: [
                    // ResponsiveTable | GridTable
                    { name: 'Responsive Table', value: 'ResponsiveTable' },
                    { name: 'Grid Table', value: 'GridTable' }
                ],
                default: defaultAnswers.type,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
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
                ],
                default: defaultAnswers.selectionMode,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            } as ListQuestion,
            getBooleanPrompt(
                'displayHeader',
                t('displayHeader'),
                defaultAnswers.displayHeader,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            ),
            {
                type: 'input',
                name: 'header',
                message: t('header.message'),
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            } as InputQuestion,
            {
                type: 'checkbox',
                name: 'personalization',
                message: t('personalization.message'),
                choices: [
                    { name: t('personalization.choices.Sort'), value: 'Sort' },
                    { name: t('personalization.choices.Column'), value: 'Column' },
                    { name: t('personalization.choices.Filter'), value: 'Filter' }
                ],
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            } as CheckboxQuestion,
            {
                type: 'list',
                name: 'variantManagement',
                message: t('tableVariantManagement'),
                choices: [
                    { name: 'Page', value: 'Page' },
                    { name: 'Control', value: 'Control' },
                    { name: 'None', value: 'None' }
                ],
                default: defaultAnswers.variantManagement,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            } as ListQuestion,
            getBooleanPrompt(
                'readOnly',
                t('readOnlyMode'),
                defaultAnswers.readOnly,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            ),
            getBooleanPrompt(
                'enableAutoColumnWidth',
                t('autoColumnWidth'),
                defaultAnswers.enableAutoColumnWidth,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            ),
            getBooleanPrompt(
                'enableExport',
                t('dataExport'),
                defaultAnswers.enableExport,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            ),
            getBooleanPrompt(
                'enableFullScreen',
                t('fullScreenMode'),
                defaultAnswers.enableFullScreen,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            ),
            getBooleanPrompt(
                'enablePaste',
                t('pasteFromClipboard'),
                defaultAnswers.enablePaste,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            ),
            getBooleanPrompt(
                'isSearchable',
                t('tableSearchableToggle'),
                defaultAnswers.isSearchable,
                TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            )
        ]
    };
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
): Promise<Prompts<FilterBarPromptsAnswer>> {
    await initI18n();
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);
    const defaultAnswers: Answers = {
        id: 'FilterBar'
    };
    return {
        questions: [
            getViewOrFragmentFilePrompt(
                fs,
                basePath,
                t('viewOrFragmentFile.message'),
                t('viewOrFragmentFile.validate'),
                ['aggregationPath']
            ),
            getBuildingBlockIdPrompt(t('id.message'), t('id.validation'), defaultAnswers.id),
            getAggregationPathPrompt(t('aggregation'), fs),
            getEntityPrompt(t('entity'), projectProvider, ['qualifier']),
            getAnnotationPathQualifierPrompt(
                'qualifier',
                t('qualifier'),
                projectProvider,
                [UIAnnotationTerms.SelectionFields],
                undefined,
                t('valuesDependentOnEntityTypeInfo')
            ),
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
        ]
    };
}
