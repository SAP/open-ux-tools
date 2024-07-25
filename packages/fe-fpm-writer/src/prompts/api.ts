import type { Answers, Question } from 'inquirer';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { getProject, type Project } from '@sap-ux/project-access';
import { getAnswer } from './common';
import type {
    Prompts,
    ValidationResults,
    SupportedPrompts,
    NarrowPrompt,
    PromptListChoices,
    SupportedGeneratorPrompts,
    PromptQuestion,
    PromptContext,
    CodeSnippet
} from './types';
import type { PromptsType } from './types';
import { i18nNamespaces, initI18n, translate } from '../i18n';
import { join } from 'path';

import { PromptsQuestionsMap, PromptsGeneratorsMap, PromptsCodePreviewMap } from './types/map';

const unsupportedPrompts = (): Prompts<Answers> => ({
    questions: []
});

/**
 *
 */
export class PromptsAPI {
    // Prompts context containing information about project and other reusable properties
    public context: PromptContext;
    // Cached questions
    private cache: { [N in SupportedPrompts as N['type']]?: Prompts<N['answers']> } = {};

    /**
     *
     * @param fs the file system object for reading files
     * @param project
     * @param appId app id in CAP project
     */
    constructor(fs: Editor, project: Project | undefined, appId = '') {
        this.context = {
            fs,
            project: project,
            appId: appId,
            appPath: project ? join(project.root, appId) : ''
        };
    }

    /**
     * Static method to initialize prompt api.
     *
     * @param projectPath project path
     * @param appId app id in CAP project
     * @param fs the file system object for reading files
     * @returns Instance of prompt api.
     */
    public static async init(projectPath: string, appId?: string, fs?: Editor): Promise<PromptsAPI> {
        if (!fs) {
            fs = create(createStorage());
        }
        await initI18n();
        const project = projectPath ? await getProject(projectPath) : undefined;
        return new PromptsAPI(fs, project, appId);
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
        const prompt = await (method(this.context) as Promise<Prompts<NarrowPrompt<typeof type>['answers']>>);
        // Update cache
        this.cache = {
            ...this.cache,
            [type]: prompt
        };
        return prompt;
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
            const prompt = this.cache[type] ?? (await this.getPrompts(type));
            const question = prompt.questions.find((question) => question.name === fieldName);
            if (question && question.type === 'list') {
                const choices =
                    typeof question.choices === 'function' ? await question.choices(answers) : question.choices;
                return choices ?? [];
            }
        } catch (error) {
            // In case of issues, fall back to the defaults
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
        const originalPrompts = this.cache[type] ?? (await this.getPrompts(type));
        const result: ValidationResults = {};
        if (!questions) {
            questions = originalPrompts.questions;
        }
        for (const q of questions) {
            const question: PromptQuestion | undefined = originalPrompts.questions.find(
                (blockQuestion) => q.name === blockQuestion.name
            );
            if (!question) {
                continue;
            }
            const t = translate(i18nNamespaces.buildingBlock, 'prompts.common.');
            const { name, required, type, validate } = question;
            result[name] = { isValid: true };
            const answer = getAnswer(answers, name);
            if (required && !answer) {
                result[name] = {
                    isValid: false,
                    errorMessage:
                        type === 'input' ? t('validation.errorMessage.input') : t('validation.errorMessage.select')
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
            return this.context.fs;
        }
        const generator = PromptsGeneratorsMap.hasOwnProperty(config.type)
            ? PromptsGeneratorsMap[config.type]
            : undefined;
        return generator?.(this.context.appPath, config.answers, this.context.fs) ?? this.context.fs;
    }

    /**
     * Method returns code snippet for passed answers and prompt type.
     *
     * @param type The prompt type
     * @param answers The answers object
     * @returns Code snippet content.
     */
    public getCodeSnippets<N extends SupportedPrompts['type']>(
        type: N,
        answers: NarrowPrompt<typeof type>['answers']
    ): { [questionName: string]: CodeSnippet } {
        const config = { type, answers };
        if (!this.isGenerationSupported(config)) {
            return {};
        }
        const x = PromptsCodePreviewMap;
        const codePreviewGenerator = PromptsCodePreviewMap.hasOwnProperty(config.type)
            ? PromptsCodePreviewMap[config.type]
            : undefined;
        return codePreviewGenerator?.(this.context.appPath, config.answers) ?? {};
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
