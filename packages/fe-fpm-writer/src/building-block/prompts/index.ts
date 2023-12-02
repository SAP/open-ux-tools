import type { Editor } from 'mem-fs-editor';
import { translate, i18nNamespaces, initI18n } from '../../i18n';
import type { Chart, FilterBar } from '../types';
import { BuildingBlockType } from '../types';
import type { Answers, CheckboxQuestion, InputQuestion, ListQuestion, Question } from 'inquirer';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import { relative } from 'path';
import { getChoices, getXPathStringsForXmlFile } from '../utils/prompts';
import { getAnnotationPathQualifiers, getEntityTypes } from '../utils/service';
import ProjectProvider from '../utils/project';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';

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
                { name: t('buildingBlockType.choices.filterBar'), value: BuildingBlockType.FilterBar }
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
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
    const projectProvider = await ProjectProvider.createProject(basePath, fs);
    return [
        {
            type: 'list',
            name: 'viewOrFragmentFile',
            message: t('viewOrFragmentFile.message'),
            choices: async () => {
                const files = await findFilesByExtension(
                    '.xml',
                    basePath,
                    ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                    fs
                );
                return files.map((file) => ({
                    name: relative(basePath, file),
                    value: file
                }));
            },
            validate: (value: string) => (value ? true : t('viewOrFragmentFile.validation'))
        } as ListQuestion,
        {
            type: 'input',
            name: 'id',
            message: t('id.message'),
            validate: (value: any) => (value ? true : t('id.validation'))
        } as InputQuestion,
        {
            type: 'list',
            name: 'bindingContextType',
            message: t('bindingContextType'),
            choices: [
                { name: 'Relative', value: 'relative' },
                { name: 'Absolute', value: 'absolute' }
            ]
        } as ListQuestion,

        {
            type: 'input',
            name: 'filterBar',
            message: t('filterBar')
        } as InputQuestion,
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
        {
            type: 'list',
            name: 'aggregationPath',
            message: t('aggregation'),
            choices: (answers: any) => {
                const { viewOrFragmentFile } = answers;
                const choices = getChoices(getXPathStringsForXmlFile(viewOrFragmentFile, fs));
                if (!choices) {
                    throw new Error('Failed while fetching the aggregation path.');
                }
                return choices;
            }
        } as ListQuestion,
        {
            type: 'list',
            name: 'entity',
            message: t('entity'),
            choices: async () => {
                const choices = getChoices((await getEntityTypes(projectProvider)).map((e) => e.fullyQualifiedName));
                if (!choices) {
                    throw new Error('Failed while fetching the entities');
                }
                return choices;
            }
        } as ListQuestion,
        {
            type: 'list',
            name: 'chartQualifier',
            message: t('chartQualifier'),
            choices: async (answers) => {
                const { entity } = answers;
                const choices = getChoices(
                    await getAnnotationPathQualifiers(projectProvider, entity, [UIAnnotationTerms.Chart], true)
                );
                if (!choices) {
                    throw new Error("Couldn't find any UI.Chart annoatations");
                }
                return choices;
            }
        } as ListQuestion
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
        {
            type: 'list',
            name: 'viewOrFragmentFile',
            message: t('viewOrFragmentFile.message'),
            choices: async () => {
                const files = await findFilesByExtension(
                    '.xml',
                    basePath,
                    ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                    fs
                );
                return files.map((file) => ({
                    name: relative(basePath, file),
                    value: file
                }));
            },
            validate: (value: string) => (value ? true : t('viewOrFragmentFile.validation'))
        } as ListQuestion,

        {
            type: 'input',
            name: 'id',
            message: t('id.message'),
            validate: (value: any) => (value ? true : t('id.validation'))
        },
        {
            type: 'list',
            name: 'aggregationPath',
            message: t('aggregation'),
            choices: (answers: any) => {
                const { viewOrFragmentFile } = answers;
                const choices = getChoices(getXPathStringsForXmlFile(viewOrFragmentFile, fs));
                if (!choices) {
                    throw new Error('Failed while fetching the aggregation path.');
                }
                return choices;
            }
        } as ListQuestion,
        {
            type: 'list',
            name: 'entity',
            message: t('entity'),
            choices: async () => {
                const choices = getChoices((await getEntityTypes(projectProvider)).map((e) => e.fullyQualifiedName));
                if (!choices) {
                    throw new Error('Failed while fetching the entities');
                }
                return choices;
            }
        } as ListQuestion,
        {
            type: 'list',
            name: 'selectionFieldQualifier',
            message: t('selectionFieldQualifier'),
            choices: async (answers) => {
                const { entity } = answers;
                const choices = getChoices(
                    await getAnnotationPathQualifiers(
                        projectProvider,
                        entity,
                        [UIAnnotationTerms.SelectionFields],
                        true
                    )
                );
                if (!choices.length) {
                    throw new Error("Couldn't find the SelectionField annotation");
                }
                return choices;
            }
        } as ListQuestion,
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
