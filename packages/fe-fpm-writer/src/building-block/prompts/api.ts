import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { TFunction } from 'i18next';
import type { Answers, CheckboxQuestion, InputQuestion, ListQuestion, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { i18nNamespaces, initI18n, translate } from '../../i18n';
import { BuildingBlockConfig, BuildingBlockType } from '../types';
import {
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getBooleanPrompt,
    getBuildingBlockIdPrompt,
    getCAPServiceChoices,
    getCAPServicePrompt,
    getChoices,
    getEntityChoices,
    getEntityPrompt,
    getFilterBarIdListPrompt,
    getViewOrFragmentFilePrompt,
    getXPathStringsForXmlFile,
    ProjectProvider,
    getAnnotationPathQualifiers
} from './utils';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import { relative } from 'path';
import type {
    ChartPromptsAnswer,
    Prompts,
    PromptsGroup,
    TablePromptsAnswer,
    BuildingBlockTypePromptsAnswer,
    FilterBarPromptsAnswer,
    ValidationResults,
    PromptQuestion
} from './types';
import { promises as fsPromises } from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import { generateBuildingBlock, getSerializedFileContent } from '..';

const TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID = 'tableBuildingBlockProperties';
const TABLE_VISUALIZATION_PROPERTIES_GROUP_ID = 'tableVisualizationProperties';

export class PromptsAPI {
    basePath: string;
    projectProvider: ProjectProvider;

    constructor(basePath: string, projectProvider: ProjectProvider) {
        this.basePath = basePath;
        this.projectProvider = projectProvider;
    }

    public static async init(basePath: string): Promise<PromptsAPI> {
        const fs = create(createStorage());
        const projectProvider = await ProjectProvider.createProject(basePath, fs);
        return new PromptsAPI(basePath, projectProvider);
    }

    /**
     * Gets building block choices.
     *
     * @param {string} buildingBlockType - The building block type
     * @param {string} fieldName - The field name
     * @param {unknown} answers - The answers object
     * @param {string} rootPath - The root path
     * @returns
     */
    public async getBuildingBlockChoices<T extends Answers>(
        buildingBlockType: string,
        fieldName: string,
        answers: T,
        rootPath: string
    ) {
        try {
            const fs = create(createStorage());
            const entity = answers?.entity;
            const annotationTerms: UIAnnotationTerms[] = [];
            switch (fieldName) {
                case 'service':
                    return await getCAPServiceChoices(this.projectProvider);
                case 'entity':
                    return getEntityChoices(this.projectProvider);
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
                    return getChoices(
                        await getAnnotationPathQualifiers(this.projectProvider, entity, annotationTerms, true)
                    );
                case 'filterBarId': {
                    if (!answers.viewOrFragmentFile) {
                        return [];
                    }
                    return getChoices(
                        await this.getBuildingBlockIdsInFile(answers.viewOrFragmentFile, BuildingBlockType.FilterBar)
                    );
                }
                default:
                    return [];
            }
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    private async validateElementId(viewOrFragmentFile: string, id: string): Promise<HTMLElement | null> {
        const xmlContent = (await fsPromises.readFile(viewOrFragmentFile)).toString();
        const errorHandler = (level: string, message: string): void => {
            throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
        };
        const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
        const element = xmlDocument.getElementById(id);
        return element;
    }

    private async getBuildingBlockIdsInFile(
        viewOrFragmentFile: string,
        buildingBlockType: BuildingBlockType
    ): Promise<string[]> {
        const ids: string[] = [];
        let buildingBlockSelector;
        switch (buildingBlockType) {
            case BuildingBlockType.FilterBar:
                buildingBlockSelector = 'macros:FilterBar';
                break;
            case BuildingBlockType.Table:
                buildingBlockSelector = 'macros:Table';
                break;
            case BuildingBlockType.Chart:
                buildingBlockSelector = 'macros:Chart';
                break;
        }
        if (buildingBlockSelector) {
            const xmlContent = (await fsPromises.readFile(viewOrFragmentFile)).toString();
            const errorHandler = (level: string, message: string): void => {
                throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
            };
            const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
            const elements = xmlDocument.getElementsByTagName(buildingBlockSelector);
            for (let i = 0; i < elements.length; i++) {
                const id = elements[i].getAttributeNode('id')?.value;
                id && ids.push(id);
            }
        }
        return ids;
    }

    /**
     * Returns a list of prompts required to generate building blocks.
     *
     * @returns The list of prompts for building block types selection.
     */
    public async getBuildingBlockTypePrompts(): Promise<PromptQuestion<BuildingBlockTypePromptsAnswer>[]> {
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
            }
        ];
    }

    async isCapProject(): Promise<boolean> {
        const projectType = (await this.projectProvider.getProject()).projectType;
        return ['CAPJava', 'CAPNodejs'].includes(projectType);
    }

    /**
     * Returns a list of prompts required to generate a chart building block.
     *
     * @param {Editor} fs the memfs editor instance
     * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
     */
    public async getChartBuildingBlockPrompts(fs: Editor): Promise<Prompts<ChartPromptsAnswer>> {
        await initI18n();
        const t: TFunction = translate(i18nNamespaces.buildingBlock, 'prompts.chart.');
        const validateFn = async (value: string, answers?: Answers) => {
            return value &&
                answers?.viewOrFragmentFile &&
                (await this.validateElementId(answers?.viewOrFragmentFile, value))
                ? t('id.validateExistingValueMsg')
                : true;
        };
        const defaultAnswers: Answers = {
            id: 'Chart'
        };
        return {
            questions: [
                getViewOrFragmentFilePrompt(
                    fs,
                    this.basePath,
                    t('viewOrFragmentFile.message'),
                    t('viewOrFragmentFile.validate'),
                    ['aggregationPath', 'filterBarId'],
                    { required: true }
                ),
                getBuildingBlockIdPrompt(
                    t('id.message'),
                    t('id.validation'),
                    defaultAnswers.id,
                    {
                        required: true
                    },
                    validateFn
                ),
                ...((await this.isCapProject())
                    ? [await getCAPServicePrompt(t('service'), this.projectProvider, [], { required: true })]
                    : []),
                getEntityPrompt(t('entity'), this.projectProvider, ['qualifier'], { required: true }),
                getAnnotationPathQualifierPrompt(
                    'qualifier',
                    t('qualifier'),
                    this.projectProvider,
                    [UIAnnotationTerms.Chart],
                    {
                        additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                        required: true,
                        placeholder: t('qualifierPlaceholder')
                    }
                ),
                getAggregationPathPrompt(t('aggregation'), fs, {
                    required: true
                }),
                getFilterBarIdListPrompt(t('filterBar')),
                {
                    type: 'checkbox',
                    name: 'personalization',
                    message: t('personalization.message'),
                    selectType: 'static',
                    choices: [
                        { name: t('personalization.choices.type'), value: 'Type' },
                        { name: t('personalization.choices.item'), value: 'Item' },
                        { name: t('personalization.choices.sort'), value: 'Sort' }
                    ],
                    placeholder: t('personalization.placeholder')
                },
                {
                    type: 'list',
                    selectType: 'static',
                    name: 'selectionMode',
                    message: t('selectionMode.message'),
                    choices: [
                        { name: t('selectionMode.choices.single'), value: 'Single' },
                        { name: t('selectionMode.choices.multiple'), value: 'Multiple' }
                    ]
                },
                {
                    type: 'input',
                    name: 'selectionChange',
                    message: t('selectionChange'),
                    placeholder: t('selectionChangePlaceholder')
                }
            ]
        };
    }

    /**
     * Returns a list of prompts required to generate a table building block.
     *
     * @param {Editor} fs the memfs editor instance
     * @returns {Promise<PromptObject<keyof ChartPromptsAnswer>[]>}
     */
    public async getTableBuildingBlockPrompts(fs: Editor): Promise<Prompts<TablePromptsAnswer>> {
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
        const validateFn = async (value: string, answers?: Answers) => {
            return value &&
                answers?.viewOrFragmentFile &&
                (await this.validateElementId(answers?.viewOrFragmentFile, value))
                ? t('id.validateExistingValueMsg')
                : true;
        };
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
                    this.basePath,
                    t('viewOrFragmentFile.message'),
                    t('viewOrFragmentFile.validate'),
                    ['aggregationPath', 'filterBarId'],
                    { groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID, required: true }
                ),
                getBuildingBlockIdPrompt(
                    t('id.message'),
                    t('id.validation'),
                    defaultAnswers.id,
                    {
                        groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                        required: true
                    },
                    validateFn
                ),
                ...((await this.isCapProject())
                    ? [
                          await getCAPServicePrompt(t('service'), this.projectProvider, [], {
                              groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                              required: true
                          })
                      ]
                    : []),
                getEntityPrompt(t('entity'), this.projectProvider, ['qualifier'], {
                    groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                    required: true
                }),
                getAnnotationPathQualifierPrompt(
                    'qualifier',
                    t('qualifier'),
                    this.projectProvider,
                    [UIAnnotationTerms.LineItem],
                    {
                        additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                        groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                        required: true,
                        placeholder: t('qualifierPlaceholder')
                    }
                ),
                getAggregationPathPrompt(t('aggregation'), fs, {
                    groupId: TABLE_BUILDING_BLOCK_PROPERTIES_GROUP_ID,
                    required: true
                }),
                getFilterBarIdListPrompt(t('filterBar.message'), {
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

    /**
     * Returns a list of prompts required to generate a filter bar building block.
     *
     * @param fs
     * @returns {Promise<PromptObject<keyof FilterBarPromptsAnswer>[]>} the list of prompts
     */
    public async getFilterBarBuildingBlockPrompts(fs: Editor): Promise<Prompts<FilterBarPromptsAnswer>> {
        await initI18n();
        const t = translate(i18nNamespaces.buildingBlock, 'prompts.filterBar.');

        const defaultAnswers: Answers = {
            id: 'FilterBar'
        };
        const validateFn = async (value: string, answers?: Answers) => {
            return value &&
                answers?.viewOrFragmentFile &&
                (await this.validateElementId(answers?.viewOrFragmentFile, value))
                ? t('id.validateExistingValueMsg')
                : true;
        };
        return {
            questions: [
                getViewOrFragmentFilePrompt(
                    fs,
                    this.basePath,
                    t('viewOrFragmentFile.message'),
                    t('viewOrFragmentFile.validate'),
                    ['aggregationPath'],
                    { required: true }
                ),
                getBuildingBlockIdPrompt(
                    t('id.message'),
                    t('id.validation'),
                    defaultAnswers.id,
                    { required: true },
                    validateFn
                ),
                ...((await this.isCapProject())
                    ? [await getCAPServicePrompt(t('service'), this.projectProvider, [], { required: true })]
                    : []),
                getAggregationPathPrompt(t('aggregation'), fs, { required: true }),
                getEntityPrompt(t('entity'), this.projectProvider, ['qualifier'], { required: true }),
                getAnnotationPathQualifierPrompt(
                    'qualifier',
                    t('qualifier'),
                    this.projectProvider,
                    [UIAnnotationTerms.SelectionFields],
                    {
                        additionalInfo: t('valuesDependentOnEntityTypeInfo'),
                        required: true,
                        placeholder: t('qualifierPlaceholder')
                    }
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

    /**
     * Validates answers: checks if required prompts have values and runs validate() if exists on prompt
     *
     * @param fs
     * @param questions
     * @param answers
     * @param type
     * @returns {ValidationResults} Object with question names and answer validation results
     */
    public async validateAnswers(
        fs: Editor,
        questions: Question[],
        answers: Answers,
        type: BuildingBlockType
    ): Promise<ValidationResults> {
        // ToDo avoid any
        let blockPrompts: { questions: any[]; groups?: PromptsGroup[] } = { questions: [] };
        if (type === BuildingBlockType.Table) {
            blockPrompts = await this.getTableBuildingBlockPrompts(fs);
        } else if (type === BuildingBlockType.Chart) {
            blockPrompts = await this.getChartBuildingBlockPrompts(fs);
        } else if (type === BuildingBlockType.FilterBar) {
            blockPrompts = await this.getFilterBarBuildingBlockPrompts(fs);
        }
        let result: ValidationResults = {};
        for (const q of questions) {
            const question: Question & { name: string; required?: boolean } = blockPrompts.questions.find(
                (blockQuestion) => q.name === blockQuestion.name
            );
            if (question.required && (answers[question.name] === undefined || answers[question.name] === '')) {
                result = {
                    ...result,
                    [question.name]: {
                        isValid: false,
                        errorMessage: question.type === 'input' ? 'Please enter a value' : 'Please select a value'
                    }
                };
            } else {
                result = { ...result, [question.name]: { isValid: true } };
                if (question && question.name && typeof question.validate === 'function') {
                    const validationResult = await question.validate(answers[question.name], answers);
                    if (typeof validationResult === 'string') {
                        result = { ...result, [question.name]: { isValid: false, errorMessage: validationResult } };
                    }
                }
            }
        }
        return result;
    }

    private getMetaPath(entity: string, qualifier: string, placeholders = false): string {
        let entityPath = entity || (placeholders ? 'REPLACE_WITH_ENTITY' : '');
        const lastIndex = entityPath.lastIndexOf('.');
        entityPath = lastIndex >= 0 ? entityPath.substring?.(lastIndex + 1) : entityPath;
        const metaPath = `/${entityPath}/${qualifier || (placeholders ? 'REPLACE_WITH_A_QUALIFIER' : '')}`;
        return metaPath;
    }

    private getBuildingBlockConfig<T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer>(
        answers: T,
        buildingBlockType: BuildingBlockType,
        placeholders = false
    ): BuildingBlockConfig<T> {
        const { aggregationPath, viewOrFragmentFile, entity, qualifier } = answers;

        const id = answers.id || (placeholders ? 'REPLACE_WITH_BUILDING_BLOCK_ID' : '');
        const metaPath = this.getMetaPath(entity, qualifier, placeholders);
        return {
            aggregationPath,
            viewOrFragmentPath: viewOrFragmentFile ? relative(this.basePath, viewOrFragmentFile) : '',
            buildingBlockData: {
                ...answers,
                id,
                metaPath,
                buildingBlockType
            }
        };
    }

    public generateBuildingBlockWithAnswers = <
        T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer
    >(
        // ToDo - different enum???
        buildingBlockType: BuildingBlockType,
        answers: T
    ): Editor => {
        const configData = this.getBuildingBlockConfig(answers, buildingBlockType);
        if (!configData) {
            throw new Error(`No writer found for building block type: ${buildingBlockType}`);
        }
        const fs: Editor = generateBuildingBlock(this.basePath, configData);
        return fs;
    };

    public getCodeSnippet<T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer>(
        buildingBlockType: BuildingBlockType,
        answers: T
    ): string {
        const configData = this.getBuildingBlockConfig(answers, buildingBlockType, true);
        return getSerializedFileContent(this.basePath, configData);
    }
}
