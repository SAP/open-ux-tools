import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { i18nNamespaces, initI18n, translate } from '../../i18n';
import { BuildingBlockType } from '../types';
import type { BuildingBlockConfig } from '../types';
import { ProjectProvider } from './utils';
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
import { PromptsType } from './types';
import { generateBuildingBlock, getSerializedFileContent } from '..';
import {
    getChartBuildingBlockPrompts,
    getTableBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts,
    getBuildingBlockTypePrompts
} from './questions';

const unsupportedPrompts = (_fs: Editor, _basePath: string, _projectProvider: ProjectProvider): Prompts<Answers> => ({
    questions: []
});

const PromptsMap: SupportedPromptsMap = {
    [PromptsType.Chart]: getChartBuildingBlockPrompts,
    [PromptsType.Table]: getTableBuildingBlockPrompts,
    [PromptsType.FilterBar]: getFilterBarBuildingBlockPrompts,
    [PromptsType.BuildingBlocks]: getBuildingBlockTypePrompts
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
     * @param type Prompt type
     * @returns List of prompts for passed type
     */
    public async getPrompts<N extends SupportedPrompts['type']>(
        type: N
    ): Promise<Prompts<NarrowPrompt<typeof type>['answers']>> {
        const method = type in PromptsMap ? PromptsMap[type] : unsupportedPrompts;
        if (typeof method === 'function') {
            return method(this.fs, this.basePath, this.projectProvider) as Promise<
                Prompts<NarrowPrompt<typeof type>['answers']>
            >;
        }
        return {
            questions: []
        };
    }

    /**
     * Gets prompt choices.
     *
     * @param type - The prompt type
     * @param fieldName - The field name
     * @param answers - The answers object
     * @returns
     */
    public async getChoices<T extends Answers>(
        type: PromptsType,
        fieldName: string,
        answers: T
    ): Promise<PromptListChoices> {
        try {
            // todo - cache questions
            const prompt = await this.getPrompts(type);
            const question = prompt.questions.find((question) => question.name === fieldName);
            if (question && question.type === 'list') {
                const choices =
                    typeof question.choices === 'function' ? await question.choices(answers) : question.choices;
                if (choices && Array.isArray(choices)) {
                    return choices
                        .map((choice) => (typeof choice === 'string' ? { value: choice, name: choice } : choice))
                        .sort((a, b) => a.name.localeCompare(b.name));
                }
            }
        } catch (error) {
            console.error(error);
        }
        return [];
    }

    /**
     * Validates answers: checks if required prompts have values and runs validate() if exists on prompt
     *
     * @param type The prompt type
     * @param answers The answers object
     * @param questions Questions to validate. If param is not passed, then all question will be validated.
     * @returns {ValidationResults} Object with question names and answer validation results
     */
    public async validateAnswers(
        type: PromptsType,
        answers: Answers,
        questions?: Question[]
    ): Promise<ValidationResults> {
        let originalPrompts = await this.getPrompts(type);
        let result: ValidationResults = {};
        if (!questions) {
            questions = (await this.getPrompts(type)).questions;
        }
        for (const q of questions) {
            const question = originalPrompts.questions.find((blockQuestion) => q.name === blockQuestion.name);
            if (!question?.name) {
                continue;
            }
            const { name, required, type, validate } = question;
            result[name] = { isValid: true };
            if (required && (answers[name] === undefined || answers[name] === '')) {
                result[name] = {
                    isValid: false,
                    // ToDo - translation
                    errorMessage: type === 'input' ? 'Please enter a value' : 'Please select a value'
                };
            } else if (typeof validate === 'function') {
                const validationResult = await validate(answers[name], answers);
                if (typeof validationResult === 'string') {
                    result[name] = { isValid: false, errorMessage: validationResult };
                }
            }
        }
        return result;
    }

    /**
     * Method submits answers by generating content in project for passed prompt type.
     *
     * @param type The prompt type
     * @param answers The answers object
     * @returns The updated memfs editor instance
     */
    public submitAnswers = <T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer>(
        type: PromptsType,
        answers: T
    ): Editor => {
        const configData = this.getBuildingBlockConfig(answers, type);
        if (!configData) {
            throw new Error(`No writer found for building block type: ${type}`);
        }
        return generateBuildingBlock(this.basePath, configData, this.fs);
    };

    /**
     * Method returns code snippet for passed answers and prompt type.
     *
     * @param type The prompt type
     * @param answers The answers object
     * @returns Code snippet content.
     */
    public getCodeSnippet<T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer>(
        type: PromptsType,
        answers: T
    ): string {
        const configData = this.getBuildingBlockConfig(answers, type, true);
        return getSerializedFileContent(this.basePath, configData);
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
        type: PromptsType,
        placeholders = false
    ): BuildingBlockConfig<T> {
        const { aggregationPath, viewOrFragmentFile, entity, qualifier } = answers;

        const id = answers.id || (placeholders ? 'REPLACE_WITH_BUILDING_BLOCK_ID' : '');
        const metaPath = this.getMetaPath(entity, qualifier, placeholders);
        return {
            aggregationPath,
            viewOrFragmentPath: viewOrFragmentFile,
            buildingBlockData: {
                ...answers,
                id,
                metaPath,
                type,
                // ToDo - temp fix
                buildingBlockType: type
            }
        };
    }
}
