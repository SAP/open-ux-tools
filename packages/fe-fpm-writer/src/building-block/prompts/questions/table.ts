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
import type { PromptContext, Prompts, PromptsGroup } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, Table } from '../../types';

export type TablePromptsAnswer = BuildingBlockConfig<Table> & Answers;

const groupIds = {
    commonBlockProperties: 'tableBuildingBlockProperties',
    visualisationProperties: 'tableVisualizationProperties',
    manifestLibraries: 'manifestLibraries'
};

const defaultAnswers = {
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
    isSearchable: true,
    bindingContextType: 'absolute'
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
        },
        {
            id: groupIds.manifestLibraries,
            title: t('manifestLibrariesTitle'),
            description: t('manifestLibrariesDescription', { returnObjects: true })
        }
    ];

    return {
        groups,
        questions: [
            //first prompt group
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate'), {
                message: t('viewOrFragmentPath.message'),
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath', 'buildingBlockData.filterBar']
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation'), {
                message: t('id.message'),
                default: defaultAnswers.id,
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true
                }
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType'),
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          message: t('service'),
                          guiOptions: {
                              groupId: groupIds.commonBlockProperties,
                              mandatory: true,
                              dependantPromptNames: []
                          }
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity'),
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier'),
                    guiOptions: {
                        hint: t('valuesDependentOnEntityTypeInfo'),
                        groupId: groupIds.commonBlockProperties,
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder')
                    }
                },
                [UIAnnotationTerms.LineItem]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation'),
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    mandatory: true
                }
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message'),
                type: 'list',
                guiOptions: {
                    groupId: groupIds.commonBlockProperties,
                    placeholder: t('filterBar.placeholder'),
                    creation: { placeholder: t('filterBar.inputPlaceholder') }
                }
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
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
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
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            },
            getBooleanPrompt({
                name: 'buildingBlockData.headerVisible',
                message: t('headerVisible'),
                default: defaultAnswers.headerVisible,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            {
                type: 'input',
                name: 'buildingBlockData.header',
                message: t('header.message'),
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
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
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
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
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            },
            getBooleanPrompt({
                name: 'buildingBlockData.readOnly',
                message: t('readOnlyMode'),
                default: defaultAnswers.readOnly,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableAutoColumnWidth',
                message: t('autoColumnWidth'),
                default: defaultAnswers.enableAutoColumnWidth,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableExport',
                message: t('dataExport'),
                default: defaultAnswers.enableExport,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableFullScreen',
                message: t('fullScreenMode'),
                default: defaultAnswers.enableFullScreen,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enablePaste',
                message: t('pasteFromClipboard'),
                default: defaultAnswers.enablePaste,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.isSearchable',
                message: t('tableSearchableToggle'),
                default: defaultAnswers.isSearchable,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            })
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Table
            }
        }
    };
}
