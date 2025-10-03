import type { PromptContext, Prompts, Subset } from './types';
import { PromptsType } from './types';
import {
    getChartBuildingBlockPrompts,
    getTableBuildingBlockPrompts,
    getPageBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts,
    getBuildingBlockTypePrompts,
    getRichTextEditorBuildingBlockPrompts
} from '../building-block/prompts/questions';
import type {
    ChartPromptsAnswer,
    TablePromptsAnswer,
    PagePromptsAnswer,
    FilterBarPromptsAnswer,
    BuildingBlockTypePromptsAnswer,
    RichTextEditorPromptsAnswer
} from '../building-block/prompts/questions';
import { generateBuildingBlock, getSerializedFileContent } from '../building-block';

type AnswerMapping = {
    [PromptsType.Chart]: ChartPromptsAnswer;
    [PromptsType.Table]: TablePromptsAnswer;
    [PromptsType.Page]: PagePromptsAnswer;
    [PromptsType.FilterBar]: FilterBarPromptsAnswer;
    [PromptsType.RichTextEditor]: RichTextEditorPromptsAnswer;
    [PromptsType.BuildingBlocks]: BuildingBlockTypePromptsAnswer;
};

type BasePrompt<T extends keyof AnswerMapping> = {
    type: T;
    answers: AnswerMapping[T];
    initialAnswers?: Subset<AnswerMapping[T]>;
};

export type SupportedPrompts =
    | BasePrompt<PromptsType.Chart>
    | BasePrompt<PromptsType.Table>
    | BasePrompt<PromptsType.FilterBar>
    | BasePrompt<PromptsType.Page>
    | BasePrompt<PromptsType.BuildingBlocks>
    | BasePrompt<PromptsType.RichTextEditor>;

export type SupportedGeneratorPrompts =
    | BasePrompt<PromptsType.Chart>
    | BasePrompt<PromptsType.Table>
    | BasePrompt<PromptsType.Page>
    | BasePrompt<PromptsType.FilterBar>
    | BasePrompt<PromptsType.RichTextEditor>;

export type NarrowPrompt<T, N = SupportedPrompts> = N extends { type: T } ? N : never;

export type SupportedPromptsMap = {
    [N in SupportedPrompts as N['type']]: (
        context: PromptContext
    ) => Promise<Prompts<N['answers']>> | Prompts<N['answers']>;
};

export const PromptsQuestionsMap: SupportedPromptsMap = {
    [PromptsType.Chart]: getChartBuildingBlockPrompts,
    [PromptsType.Table]: getTableBuildingBlockPrompts,
    [PromptsType.FilterBar]: getFilterBarBuildingBlockPrompts,
    [PromptsType.BuildingBlocks]: getBuildingBlockTypePrompts,
    [PromptsType.Page]: getPageBuildingBlockPrompts,
    [PromptsType.RichTextEditor]: getRichTextEditorBuildingBlockPrompts
};

export const PromptsGeneratorsMap = {
    [PromptsType.Chart]: generateBuildingBlock,
    [PromptsType.Table]: generateBuildingBlock,
    [PromptsType.FilterBar]: generateBuildingBlock,
    [PromptsType.RichTextEditor]: generateBuildingBlock,
    [PromptsType.Page]: generateBuildingBlock
};

export const PromptsCodePreviewMap = {
    [PromptsType.Chart]: getSerializedFileContent,
    [PromptsType.Table]: getSerializedFileContent,
    [PromptsType.FilterBar]: getSerializedFileContent,
    [PromptsType.RichTextEditor]: getSerializedFileContent,
    [PromptsType.Page]: getSerializedFileContent
};

export type SupportedGeneratorAnswers =
    | TablePromptsAnswer
    | ChartPromptsAnswer
    | FilterBarPromptsAnswer
    | PagePromptsAnswer
    | RichTextEditorPromptsAnswer;
