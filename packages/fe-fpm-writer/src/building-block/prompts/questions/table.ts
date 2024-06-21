import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { i18nNamespaces, initI18n, translate } from '../../../i18n';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBooleanPrompt,
    getBuildingBlockIdPrompt,
    getCAPServicePrompt,
    getEntityPrompt,
    getFilterBarIdListPrompt,
    getViewOrFragmentFilePrompt,
    isCapProject
} from '../utils';
import type { ProjectProvider } from '../utils';
import type { Prompts, PromptsGroup, TablePromptsAnswer } from '../types';

const TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID = 'tableBuildingBlockProperties';
const TABLE_VISUALIZATION_PROPERTIES_GROUP_ID = 'tableVisualizationProperties';

export async function getTableBuildingBlockPrompts(
    fs: Editor,
    basePath: string,
    projectProvider: ProjectProvider
): Promise<Prompts<TablePromptsAnswer>> {
    await initI18n();
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
                ['aggregationPath', 'filterBarId'],
                { groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID, required: true }
            ),
            await getBuildingBlockIdPrompt(fs, t('id.message'), t('id.validation'), basePath, defaultAnswers.id, {
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
            getEntityPrompt(t('entity'), projectProvider, ['qualifier'], {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getAnnotationPathQualifierPrompt(
                'qualifier',
                t('qualifier'),
                projectProvider,
                [UIAnnotationTerms.LineItem],
                {
                    additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                    groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                    required: true,
                    placeholder: t('qualifierPlaceholder')
                }
            ),
            getAggregationPathPrompt(t('aggregation'), fs, basePath, {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                required: true
            }),
            getFilterBarIdListPrompt(t('filterBar.message'), fs, basePath, {
                groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID
            }),

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
            },
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
            },
            getBooleanPrompt('displayHeader', t('displayHeader'), defaultAnswers.displayHeader, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            {
                type: 'input',
                name: 'header',
                message: t('header.message'),
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            },
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
            },
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
            },
            getBooleanPrompt('readOnly', t('readOnlyMode'), defaultAnswers.readOnly, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt('enableAutoColumnWidth', t('autoColumnWidth'), defaultAnswers.enableAutoColumnWidth, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt('enableExport', t('dataExport'), defaultAnswers.enableExport, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt('enableFullScreen', t('fullScreenMode'), defaultAnswers.enableFullScreen, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt('enablePaste', t('pasteFromClipboard'), defaultAnswers.enablePaste, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            }),
            getBooleanPrompt('isSearchable', t('tableSearchableToggle'), defaultAnswers.isSearchable, {
                groupId: TABLE_VISUALIZATION_PROPERTIES_GROUP_ID
            })
        ]
    };
}
