import type { Answers, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { BuildingBlockConfig } from '../types';
import { BuildingBlockType } from '../types';
import { ProjectProvider, getAnswer } from './utils';
import type {
    Prompts,
    ValidationResults,
    SupportedPrompts,
    SupportedPromptsMap,
    NarrowPrompt,
    PromptListChoices,
    SupportedAnswers
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
    [PromptsType.FilterBar]: generateBuildingBlock,
    [PromptsType.BuildingBlocks]: undefined
};

const PromptsCodePreviewMap = {
    [PromptsType.Chart]: getSerializedFileContent,
    [PromptsType.Table]: getSerializedFileContent,
    [PromptsType.FilterBar]: getSerializedFileContent,
    [PromptsType.BuildingBlocks]: undefined
};

const TEMP_MAP: Map<PromptsType, BuildingBlockType> = new Map([
    [PromptsType.Chart, BuildingBlockType.Chart],
    [PromptsType.Table, BuildingBlockType.Table],
    [PromptsType.FilterBar, BuildingBlockType.FilterBar]
]);

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
        await initI18n();
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
    public submitAnswers<T extends SupportedAnswers>(type: PromptsType, answers: T): Editor {
        // ToDo 'buildingBlockType' - should be different( support initial values for answers?)
        const buildingBlockType = TEMP_MAP.get(type);
        if (answers.buildingBlockData && buildingBlockType) {
            answers.buildingBlockData.buildingBlockType = buildingBlockType;
        }
        const generator = PromptsGeneratorsMap.hasOwnProperty(type) ? PromptsGeneratorsMap[type] : undefined;
        return generator?.(this.basePath, answers, this.fs) ?? this.fs;
    }

    /**
     * Method returns code snippet for passed answers and prompt type.
     *
     * @param type The prompt type
     * @param answers The answers object
     * @returns Code snippet content.
     */
    public getCodeSnippet<T extends SupportedAnswers>(type: PromptsType, answers: T): string {
        // ToDo 'buildingBlockType' - should be different( support initial values for answers?)
        const buildingBlockType = TEMP_MAP.get(type);
        if (answers.buildingBlockData && buildingBlockType) {
            answers.buildingBlockData.buildingBlockType = buildingBlockType;
        }
        const codePreviewGenerator = PromptsCodePreviewMap.hasOwnProperty(type)
            ? PromptsCodePreviewMap[type]
            : undefined;
        return codePreviewGenerator?.(this.basePath, answers) ?? '';
    }
}
