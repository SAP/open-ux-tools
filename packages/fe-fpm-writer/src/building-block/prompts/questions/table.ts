import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers } from 'inquirer';
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
import type { PromptContext, Prompts, PromptsGroup, TablePromptsAnswer } from '../types';
import { BuildingBlockType } from '../../types';

const TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID = 'tableBuildingBlockProperties';
const TABLE_VISUALIZATION_PROPERTIES_GROUP_ID = 'tableVisualizationProperties';

/**
 * Returns a list of prompts required to generate a table building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for table.
 */
export async function getTableBuildingBlockPrompts(context: PromptContext): Promise<Prompts<TablePromptsAnswer>> {
    const { projectProvider } = context;
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
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate'), {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true,
                message: t('viewOrFragmentPath.message'),
                dependantPromptNames: ['aggregationPath', 'filterBar']
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                default: 'relative',
                required: true
            }),
            ...((await isCapProject(projectProvider))
                ? [
                      await getCAPServicePrompt(context, {
                          groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                          required: true,
                          message: t('service'),
                          dependantPromptNames: []
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier'),
                    additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                    groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                    required: true,
                    placeholder: t('qualifierPlaceholder')
                },
                [UIAnnotationTerms.LineItem]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation'),
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message'),
                type: 'list',
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
            getBooleanPrompt({
                name: 'buildingBlockData.headerVisible',
                message: t('headerVisible'),
                default: defaultAnswers.headerVisible,
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
            getBooleanPrompt({
                name: 'buildingBlockData.readOnly',
                message: t('readOnlyMode'),
                default: defaultAnswers.readOnly,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableAutoColumnWidth',
                message: t('autoColumnWidth'),
                default: defaultAnswers.enableAutoColumnWidth,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableExport',
                message: t('dataExport'),
                default: defaultAnswers.enableExport,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableFullScreen',
                message: t('fullScreenMode'),
                default: defaultAnswers.enableFullScreen,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enablePaste',
                message: t('pasteFromClipboard'),
                default: defaultAnswers.enablePaste,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.isSearchable',
                message: t('tableSearchableToggle'),
                default: defaultAnswers.isSearchable,
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            })
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Table
            }
        }
    };
}
