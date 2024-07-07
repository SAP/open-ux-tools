import type { Answers, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { BuildingBlockType } from '../types';
import { ProjectProvider, getAnswer } from './utils';
import type {
    Prompts,
    ValidationResults,
    SupportedPrompts,
    SupportedPromptsMap,
    NarrowPrompt,
    PromptListChoices,
    SupportedGeneratorPrompts
} from './types';
import { PromptsType } from './types';
import { generateBuildingBlock, getSerializedFileContent } from '..';
import {
    getChartBuildingBlockPrompts,
    getTableBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts,
    getBuildingBlockTypePrompts
} from './questions';
import { initI18n } from '../../i18n';

const unsupportedPrompts = (_fs: Editor, _basePath: string, _projectProvider: ProjectProvider): Prompts<Answers> => ({
    questions: []
});

const PromptsQuestionsMap: SupportedPromptsMap = {
    [PromptsType.Chart]: getChartBuildingBlockPrompts,
    [PromptsType.Table]: getTableBuildingBlockPrompts,
    [PromptsType.FilterBar]: getFilterBarBuildingBlockPrompts,
    [PromptsType.BuildingBlocks]: getBuildingBlockTypePrompts
};

const PromptsGeneratorsMap = {
    [PromptsType.Chart]: generateBuildingBlock,
    [PromptsType.Table]: generateBuildingBlock,
    [PromptsType.FilterBar]: generateBuildingBlock
};

const PromptsCodePreviewMap = {
    [PromptsType.Chart]: getSerializedFileContent,
    [PromptsType.Table]: getSerializedFileContent,
    [PromptsType.FilterBar]: getSerializedFileContent
};

const TEMP_MAP: Map<PromptsType, BuildingBlockType> = new Map([
    [PromptsType.Chart, BuildingBlockType.Chart],
    [PromptsType.Table, BuildingBlockType.Table],
    [PromptsType.FilterBar, BuildingBlockType.FilterBar]
]);

/**
 *
 */
export class PromptsAPI {
    basePath: string;
    projectProvider: ProjectProvider;
    fs: Editor;

    /**
     *
     * @param basePath
     * @param projectProvider
     * @param fs
     */
    constructor(basePath: string, projectProvider: ProjectProvider, fs: Editor) {
        this.basePath = basePath;
        this.projectProvider = projectProvider;
        this.fs = fs;
    }

    /**
     * Static method to initialize prompt api.
     *
     * @param basePath application path
     * @param fs the file system object for reading files
     * @returns Instance of prompt api.
     */
    public static async init(basePath: string, fs?: Editor): Promise<PromptsAPI> {
        if (!fs) {
            fs = create(createStorage());
        }
        const projectProvider = await ProjectProvider.createProject(basePath, fs);
        await initI18n();
        return new PromptsAPI(basePath, projectProvider, fs);
    }

    /**
     * Returns a list of prompts for passed type.
     *
     * @param type Prompt type
     * @returns List of prompts for passed type.
     */
    public async getPrompts<N extends SupportedPrompts['type']>(
        type: N
    ): Promise<Prompts<NarrowPrompt<typeof type>['answers']>> {
        const method = type in PromptsQuestionsMap ? PromptsQuestionsMap[type] : unsupportedPrompts;
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
                return choices ?? [];
            }
        } catch (error) {
            console.error(error);
        }
        return [];
    }

    /**
     * Validates answers: checks if required prompts have values and runs validate() if exists on prompt.
     *
     * @param type The prompt type
     * @param answers The answers object
     * @param questions Questions to validate - If param is not passed, then all question will be validated
     * @returns Object with question names and answer validation results
     */
    public async validateAnswers(
        type: PromptsType,
        answers: Answers,
        questions?: Question[]
    ): Promise<ValidationResults> {
        const originalPrompts = await this.getPrompts(type);
        const result: ValidationResults = {};
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
            const answer = getAnswer(answers, name);
            if (required && (answer === undefined || answer === '')) {
                result[name] = {
                    isValid: false,
                    // ToDo - translation
                    errorMessage: type === 'input' ? 'Please enter a value' : 'Please select a value'
                };
            } else if (typeof validate === 'function') {
                const validationResult = await validate(answer, answers);
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
    public submitAnswers<N extends SupportedPrompts['type']>(
        type: N,
        answers: NarrowPrompt<typeof type>['answers']
    ): Editor {
        const config = { type, answers };
        if (!this.isGenerationSupported(config)) {
            return this.fs;
        }
        // ToDo 'buildingBlockType' - should be different( support initial values for answers?)
        const buildingBlockType = TEMP_MAP.get(type);
        if (answers.buildingBlockData && buildingBlockType) {
            answers.buildingBlockData.buildingBlockType = buildingBlockType;
        }
        const generator = PromptsGeneratorsMap.hasOwnProperty(config.type)
            ? PromptsGeneratorsMap[config.type]
            : undefined;
        return generator?.(this.basePath, config.answers, this.fs) ?? this.fs;
    }

    /**
     * Method returns code snippet for passed answers and prompt type.
     *
     * @param type The prompt type
     * @param answers The answers object
     * @returns Code snippet content.
     */
    public getCodeSnippet<N extends SupportedPrompts['type']>(
        type: N,
        answers: NarrowPrompt<typeof type>['answers']
    ): string {
        const config = { type, answers };
        if (!this.isGenerationSupported(config)) {
            return '';
        }
        // ToDo 'buildingBlockType' - should be different( support initial values for answers?)
        const buildingBlockType = TEMP_MAP.get(type);
        if (answers.buildingBlockData && buildingBlockType) {
            answers.buildingBlockData.buildingBlockType = buildingBlockType;
        }
        const codePreviewGenerator = PromptsCodePreviewMap.hasOwnProperty(config.type)
            ? PromptsCodePreviewMap[config.type]
            : undefined;
        return codePreviewGenerator?.(this.basePath, config.answers) ?? '';
    }

    /**
     * Method checks if passed type of prompt supports generation and code preview.
     *
     * @param config Prompt configuration
     * @param config.type
     * @param config.answers
     * @returns true if code generation is supported.
     */
    private isGenerationSupported(config: {
        type: SupportedPrompts['type'];
        answers: SupportedPrompts['answers'];
    }): config is SupportedGeneratorPrompts {
        return config.type in PromptsCodePreviewMap;
    }
}
