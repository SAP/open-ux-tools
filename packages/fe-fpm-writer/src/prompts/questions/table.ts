import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../i18n';
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
// todo
import { BuildingBlockType } from '../../building-block/types';

const groupIds = {
    commonBlockProperties: 'tableBuildingBlockProperties',
    visualisationProperties: 'tableVisualizationProperties'
};

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

/**
 * Returns a list of prompts required to generate a table building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for table.
 */
export async function getTableBuildingBlockPrompts(context: PromptContext): Promise<Prompts<TablePromptsAnswer>> {
    const { project } = context;
    const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.table.');
    const groups: PromptsGroup[] = [
        {
            id: groupIds.commonBlockProperties,
            title: t('tableBuildingBlockPropertiesTitle'),
            description: t('tableBuildingBlockPropertiesDescription', { returnObjects: true })
        },
        {
            id: groupIds.visualisationProperties,
            title: t('tableVisualizationPropertiesTitle'),
            description: t('tableVisualizationPropertiesDescription', { returnObjects: true })
        }
    ];
    return {
        groups,
        questions: [
            //first prompt group
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate'), {
                groupId: groupIds.commonBlockProperties,
                required: true,
                message: t('viewOrFragmentPath.message'),
                dependantPromptNames: ['aggregationPath', 'filterBar']
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                groupId: groupIds.commonBlockProperties,
                required: true
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                groupId: groupIds.commonBlockProperties,
                default: 'relative',
                required: true
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          groupId: groupIds.commonBlockProperties,
                          required: true,
                          message: t('service'),
                          dependantPromptNames: []
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity'),
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier'],
                groupId: groupIds.commonBlockProperties,
                required: true
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier'),
                    description: t('valuesDependentOnEntityTypeInfo'),
                    groupId: groupIds.commonBlockProperties,
                    required: true,
                    placeholder: t('qualifierPlaceholder')
                },
                [UIAnnotationTerms.LineItem]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation'),
                groupId: groupIds.commonBlockProperties,
                required: true
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message'),
                type: 'list',
                groupId: groupIds.commonBlockProperties,
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
                groupId: groupIds.visualisationProperties
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
                groupId: groupIds.visualisationProperties
            },
            getBooleanPrompt({
                name: 'buildingBlockData.headerVisible',
                message: t('headerVisible'),
                default: defaultAnswers.headerVisible,
                groupId: groupIds.visualisationProperties
            }),
            {
                type: 'input',
                name: 'buildingBlockData.header',
                message: t('header.message'),
                groupId: groupIds.visualisationProperties
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
                groupId: groupIds.visualisationProperties
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
                groupId: groupIds.visualisationProperties
            },
            getBooleanPrompt({
                name: 'buildingBlockData.readOnly',
                message: t('readOnlyMode'),
                default: defaultAnswers.readOnly,
                groupId: groupIds.visualisationProperties
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableAutoColumnWidth',
                message: t('autoColumnWidth'),
                default: defaultAnswers.enableAutoColumnWidth,
                groupId: groupIds.visualisationProperties
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableExport',
                message: t('dataExport'),
                default: defaultAnswers.enableExport,
                groupId: groupIds.visualisationProperties
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableFullScreen',
                message: t('fullScreenMode'),
                default: defaultAnswers.enableFullScreen,
                groupId: groupIds.visualisationProperties
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enablePaste',
                message: t('pasteFromClipboard'),
                default: defaultAnswers.enablePaste,
                groupId: groupIds.visualisationProperties
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.isSearchable',
                message: t('tableSearchableToggle'),
                default: defaultAnswers.isSearchable,
                groupId: groupIds.visualisationProperties
            })
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Table
            }
        }
    };
}
