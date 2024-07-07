import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { i18nNamespaces, translate } from '../../../i18n';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBindingContextTypePrompt,
    getBooleanPrompt,
    getBuildingBlockIdPrompt,
    getCAPServicePrompt,
    getEntityPrompt,
    getFilterBarIdPrompt,
    getViewOrFragmentPathPrompt,
    isCapProject
} from '../utils';
import type { ProjectProvider } from '../utils';
import type { Prompts, PromptsGroup, TablePromptsAnswer } from '../types';
import { BuildingBlockType } from '../../types';

const TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID = 'tableBuildingBlockProperties';
const TABLE_VISUALIZATION_PROPERTIES_GROUP_ID = 'tableVisualizationProperties';

/**
 * Returns a list of prompts required to generate a table building block.
 *
 * @param fs the memfs editor instance
 * @param basePath Path to project
 * @param projectProvider Project provider
 * @returns Prompt with questions for table.
 */
export async function getTableBuildingBlockPrompts(
    fs: Editor,
    basePath: string,
    projectProvider: ProjectProvider
): Promise<Prompts<TablePromptsAnswer>> {
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.table.');
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
        type: 'ResponsiveTable',
        selectionMode: 'Single',
        headerVisible: true,
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
            getViewOrFragmentPathPrompt(
                fs,
                basePath,
                t('viewOrFragmentPath.message'),
                t('viewOrFragmentPath.validate'),
                ['aggregationPath', 'filterBar'],
                { groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID, required: true }
            ),
            getBuildingBlockIdPrompt(fs, t('id.message'), t('id.validation'), basePath, defaultAnswers.id, {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getBindingContextTypePrompt(t('bindingContextType'), 'relative', ['buildingBlockData.metaPath.qualifier'], {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            ...((await isCapProject(projectProvider))
                ? [
                      await getCAPServicePrompt(t('service'), projectProvider, [], {
                          groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                          required: true
                      })
                  ]
                : []),
            getEntityPrompt(t('entity'), projectProvider, ['buildingBlockData.metaPath.qualifier'], {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getAnnotationPathQualifierPrompt(t('qualifier'), projectProvider, [UIAnnotationTerms.LineItem], {
                additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true,
                placeholder: t('qualifierPlaceholder')
            }),
            getAggregationPathPrompt(t('aggregation'), fs, basePath, {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getFilterBarIdPrompt(t('filterBar.message'), 'list', fs, basePath, {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                placeholder: t('filterBar.placeholder'),
                creation: { inputPlaceholder: t('filterBar.inputPlaceholder') }
            }),

            //second prompt group
            {
                type: 'list',
                name: 'buildingBlockData.type',
                message: t('tableType.message'),
                choices: [
                    // ResponsiveTable | GridTable
                    { name: 'Responsive Table', value: 'ResponsiveTable' },
                    { name: 'Grid Table', value: 'GridTable' }
                ],
                default: defaultAnswers.type,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            },
            {
                type: 'list',
                name: 'buildingBlockData.selectionMode',
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
            },
            getBooleanPrompt('buildingBlockData.headerVisible', t('headerVisible'), defaultAnswers.headerVisible, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            {
                type: 'input',
                name: 'buildingBlockData.header',
                message: t('header.message'),
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            },
            {
                type: 'checkbox',
                name: 'buildingBlockData.personalization',
                message: t('personalization.message'),
                choices: [
                    { name: t('personalization.choices.Sort'), value: 'Sort' },
                    { name: t('personalization.choices.Column'), value: 'Column' },
                    { name: t('personalization.choices.Filter'), value: 'Filter' }
                ],
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            },
            {
                type: 'list',
                name: 'buildingBlockData.variantManagement',
                message: t('tableVariantManagement'),
                choices: [
                    { name: 'Page', value: 'Page' },
                    { name: 'Control', value: 'Control' },
                    { name: 'None', value: 'None' }
                ],
                default: defaultAnswers.variantManagement,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            },
            getBooleanPrompt('buildingBlockData.readOnly', t('readOnlyMode'), defaultAnswers.readOnly, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt(
                'buildingBlockData.enableAutoColumnWidth',
                t('autoColumnWidth'),
                defaultAnswers.enableAutoColumnWidth,
                {
                    groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
                }
            ),
            getBooleanPrompt('buildingBlockData.enableExport', t('dataExport'), defaultAnswers.enableExport, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt(
                'buildingBlockData.enableFullScreen',
                t('fullScreenMode'),
                defaultAnswers.enableFullScreen,
                {
                    groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
                }
            ),
            getBooleanPrompt('buildingBlockData.enablePaste', t('pasteFromClipboard'), defaultAnswers.enablePaste, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt(
                'buildingBlockData.isSearchable',
                t('tableSearchableToggle'),
                defaultAnswers.isSearchable,
                {
                    groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
                }
            )
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Table
            }
        }
    };
}
