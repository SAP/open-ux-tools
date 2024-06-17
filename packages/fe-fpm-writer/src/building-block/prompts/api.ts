import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { i18nNamespaces, initI18n, translate } from '../../i18n';
import { BuildingBlockType } from '../types';
import type { BuildingBlockConfig } from '../types';
import {
    getCAPServiceChoices,
    getChoices,
    getEntityChoices,
    getXPathStringsForXmlFile,
    ProjectProvider,
    getAnnotationPathQualifiers
} from './utils';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import { relative } from 'path';
import type {
    ChartPromptsAnswer,
    Prompts,
    TablePromptsAnswer,
    BuildingBlockTypePromptsAnswer,
    FilterBarPromptsAnswer,
    ValidationResults,
    PromptQuestion,
    SupportedPrompts,
    SupportedPromptsMap,
    NarrowPrompt,
    PromptListChoices
} from './types';
import { promises as fsPromises } from 'fs';
import { DOMParser } from '@xmldom/xmldom';
import { generateBuildingBlock, getSerializedFileContent } from '..';
import { getChartBuildingBlockPrompts } from './chart';
import { getTableBuildingBlockPrompts } from './table';
import { getFilterBarBuildingBlockPrompts } from './filter-bar';

const unsupportedPrompts = (_fs: Editor, _basePath: string, _projectProvider: ProjectProvider): Prompts<Answers> => ({
    questions: []
});

const PromptsMap: SupportedPromptsMap = {
    [BuildingBlockType.Chart]: getChartBuildingBlockPrompts,
    [BuildingBlockType.Table]: getTableBuildingBlockPrompts,
    [BuildingBlockType.FilterBar]: getFilterBarBuildingBlockPrompts,
    [BuildingBlockType.Field]: unsupportedPrompts
};

export class PromptsAPI {
    basePath: string;
    projectProvider: ProjectProvider;
    fs: Editor;

    constructor(basePath: string, projectProvider: ProjectProvider, fs: Editor) {
        this.basePath = basePath;
        this.projectProvider = projectProvider;
        this.fs = fs;
    }

    public static async init(basePath: string, fs?: Editor): Promise<PromptsAPI> {
        if (!fs) {
            fs = create(createStorage());
        }
        const projectProvider = await ProjectProvider.createProject(basePath, fs);
        return new PromptsAPI(basePath, projectProvider, fs);
    }

    /**
     * Returns a list of prompts for passed type.
     *
     * @param {Editor} fs the memfs editor instance
     * @param {Editor} fs the memfs editor instance
     * @returns List of prompts for passed type
     */
    public async getPrompts<N extends SupportedPrompts['type']>(
        promptType: N,
        fs: Editor
    ): Promise<Prompts<NarrowPrompt<typeof promptType>['answers']>> {
        const method = promptType in PromptsMap ? PromptsMap[promptType] : unsupportedPrompts;
        if (typeof method === 'function') {
            return method(fs, this.basePath, this.projectProvider) as Promise<
                Prompts<NarrowPrompt<typeof promptType>['answers']>
            >;
        }
        return {
            questions: []
        };
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
    public async getChoices<T extends Answers>(
        buildingBlockType: BuildingBlockType,
        fieldName: string,
        answers: T
    ): Promise<PromptListChoices> {
        try {
            // todo - cache questions
            const prompt = await this.getPrompts(buildingBlockType, this.fs);
            const question = prompt.questions.find((question) => question.name === fieldName);
            if (question && question.type === 'list') {
                const choices =
                    typeof question.choices === 'function' ? await question.choices(answers) : question.choices;
                if (choices && Array.isArray(choices)) {
                    return choices.map((choice) =>
                        typeof choice === 'string' ? { value: choice, name: choice } : choice
                    );
                }
            }
        } catch (error) {
            console.error(error);
        }
        return [];
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
        let originalPrompts = await this.getPrompts(type, fs);
        let result: ValidationResults = {};
        for (const q of questions) {
            const question = originalPrompts.questions.find((blockQuestion) => q.name === blockQuestion.name);
            if (!question || !question.name) {
                continue;
            }
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

    public submitAnswers = <
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
