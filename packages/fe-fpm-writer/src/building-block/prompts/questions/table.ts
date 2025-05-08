import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
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
import { getManifestPromptsGroup } from './building-blocks';
import { SapShortTextType } from '@sap-ux/i18n';

const MANIFEST_LIBRARIES_GROUP = getManifestPromptsGroup();

export type TablePromptsAnswer = BuildingBlockConfig<Table> & Answers;

const groupIds = {
    commonTableBuildingBlockProperties: 'tableBuildingBlockProperties',
    visualisationProperties: 'tableVisualizationProperties'
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
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.table.');
    const groups: PromptsGroup[] = [
        {
            id: groupIds.commonTableBuildingBlockProperties,
            title: t('tableBuildingBlockPropertiesTitle') as string,
            description: t('tableBuildingBlockPropertiesDescription', { returnObjects: true }) as string[]
        },
        {
            id: groupIds.visualisationProperties,
            title: t('tableVisualizationPropertiesTitle') as string,
            description: t('tableVisualizationPropertiesDescription', { returnObjects: true }) as string[]
        },
        MANIFEST_LIBRARIES_GROUP
    ];

    return {
        groups,
        questions: [
            //first prompt group
            getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
                message: t('viewOrFragmentPath.message') as string,
                guiOptions: {
                    groupId: groupIds.commonTableBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['aggregationPath', 'buildingBlockData.filterBar']
                }
            }),
            getBuildingBlockIdPrompt(context, t('id.validation') as string, {
                message: t('id.message') as string,
                default: defaultAnswers.id,
                guiOptions: {
                    groupId: groupIds.commonTableBuildingBlockProperties,
                    mandatory: true
                }
            }),
            getBindingContextTypePrompt({
                message: t('bindingContextType') as string,
                default: defaultAnswers.bindingContextType,
                guiOptions: {
                    groupId: groupIds.commonTableBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            ...(project && isCapProject(project)
                ? [
                      await getCAPServicePrompt(context, {
                          message: t('service') as string,
                          guiOptions: {
                              groupId: groupIds.commonTableBuildingBlockProperties,
                              mandatory: true,
                              dependantPromptNames: []
                          }
                      })
                  ]
                : []),
            getEntityPrompt(context, {
                message: t('entity') as string,
                guiOptions: {
                    groupId: groupIds.commonTableBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            getAnnotationPathQualifierPrompt(
                context,
                {
                    message: t('qualifier') as string,
                    guiOptions: {
                        hint: t('valuesDependentOnEntityTypeInfo') as string,
                        groupId: groupIds.commonTableBuildingBlockProperties,
                        mandatory: true,
                        placeholder: t('qualifierPlaceholder') as string
                    }
                },
                [UIAnnotationTerms.LineItem]
            ),
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: {
                    groupId: groupIds.commonTableBuildingBlockProperties,
                    mandatory: true
                }
            }),
            getFilterBarIdPrompt(context, {
                message: t('filterBar.message') as string,
                type: 'list',
                guiOptions: {
                    groupId: groupIds.commonTableBuildingBlockProperties,
                    placeholder: t('filterBar.placeholder') as string,
                    creation: { placeholder: t('filterBar.inputPlaceholder') as string }
                }
            }),
            //second prompt group
            {
                type: 'list',
                name: 'buildingBlockData.type',
                message: t('tableType.message') as string,
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
                message: t('selectionMode.message') as string,
                choices: [
                    // None, Single, Multi or Auto
                    { name: t('selectionMode.choices.single') as string, value: 'Single' },
                    { name: t('selectionMode.choices.multiple') as string, value: 'Multi' },
                    { name: t('selectionMode.choices.auto') as string, value: 'Auto' },
                    { name: t('selectionMode.choices.none') as string, value: 'None' }
                ],
                default: defaultAnswers.selectionMode,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            },
            getBooleanPrompt({
                name: 'buildingBlockData.headerVisible',
                message: t('headerVisible') as string,
                default: defaultAnswers.headerVisible,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            {
                type: 'input',
                name: 'buildingBlockData.header',
                message: t('header.message') as string,
                guiOptions: {
                    groupId: groupIds.visualisationProperties,
                    translationProperties: {
                        type: SapShortTextType.TableTitle,
                        annotation: t('header.translationAnnotation') as string
                    }
                }
            },
            {
                type: 'checkbox',
                name: 'buildingBlockData.personalization',
                message: t('personalization.message') as string,
                choices: [
                    { name: t('personalization.choices.Sort') as string, value: 'Sort' },
                    { name: t('personalization.choices.Column') as string, value: 'Column' },
                    { name: t('personalization.choices.Filter') as string, value: 'Filter' }
                ],
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            },
            {
                type: 'list',
                name: 'buildingBlockData.variantManagement',
                message: t('tableVariantManagement') as string,
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
                message: t('readOnlyMode') as string,
                default: defaultAnswers.readOnly,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableAutoColumnWidth',
                message: t('autoColumnWidth') as string,
                default: defaultAnswers.enableAutoColumnWidth,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableExport',
                message: t('dataExport') as string,
                default: defaultAnswers.enableExport,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enableFullScreen',
                message: t('fullScreenMode') as string,
                default: defaultAnswers.enableFullScreen,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.enablePaste',
                message: t('pasteFromClipboard') as string,
                default: defaultAnswers.enablePaste,
                guiOptions: {
                    groupId: groupIds.visualisationProperties
                }
            }),
            getBooleanPrompt({
                name: 'buildingBlockData.isSearchable',
                message: t('tableSearchableToggle') as string,
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
