import type { PromptContext, Prompts, Subset } from './types.js';
import { PromptsType } from './types.js';
import {
    getChartBuildingBlockPrompts,
    getTableBuildingBlockPrompts,
    getPageBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts,
    getFormBuildingBlockPrompts,
    getKPITagBuildingBlockPrompts,
    getBuildingBlockTypePrompts,
    getRichTextEditorBuildingBlockPrompts,
    getRichTextEditorButtonGroupsBuildingBlockPrompts
} from '../building-block/prompts/questions/index.js';
import type {
    ChartPromptsAnswer,
    TablePromptsAnswer,
    PagePromptsAnswer,
    FilterBarPromptsAnswer,
    FormPromptsAnswer,
    KPITagPromptsAnswer,
    BuildingBlockTypePromptsAnswer,
    RichTextEditorPromptsAnswer,
    RichTextEditorButtonGroupsPromptsAnswer
} from '../building-block/prompts/questions/index.js';
import { generateBuildingBlock, getSerializedFileContent } from '../building-block/index.js';

type AnswerMapping = {
    [PromptsType.Chart]: ChartPromptsAnswer;
    [PromptsType.Table]: TablePromptsAnswer;
    [PromptsType.Page]: PagePromptsAnswer;
    [PromptsType.FilterBar]: FilterBarPromptsAnswer;
    [PromptsType.Form]: FormPromptsAnswer;
    [PromptsType.KPITag]: KPITagPromptsAnswer;
    [PromptsType.RichTextEditor]: RichTextEditorPromptsAnswer;
    [PromptsType.RichTextEditorButtonGroups]: RichTextEditorButtonGroupsPromptsAnswer;
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
    | BasePrompt<PromptsType.Form>
    | BasePrompt<PromptsType.KPITag>
    | BasePrompt<PromptsType.Page>
    | BasePrompt<PromptsType.BuildingBlocks>
    | BasePrompt<PromptsType.RichTextEditor>
    | BasePrompt<PromptsType.RichTextEditorButtonGroups>;

export type SupportedGeneratorPrompts =
    | BasePrompt<PromptsType.Chart>
    | BasePrompt<PromptsType.Table>
    | BasePrompt<PromptsType.Page>
    | BasePrompt<PromptsType.FilterBar>
    | BasePrompt<PromptsType.Form>
    | BasePrompt<PromptsType.KPITag>
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
    [PromptsType.Form]: getFormBuildingBlockPrompts,
    [PromptsType.KPITag]: getKPITagBuildingBlockPrompts,
    [PromptsType.BuildingBlocks]: getBuildingBlockTypePrompts,
    [PromptsType.Page]: getPageBuildingBlockPrompts,
    [PromptsType.RichTextEditor]: getRichTextEditorBuildingBlockPrompts,
    [PromptsType.RichTextEditorButtonGroups]: getRichTextEditorButtonGroupsBuildingBlockPrompts
};

export const PromptsGeneratorsMap = {
    [PromptsType.Chart]: generateBuildingBlock,
    [PromptsType.Table]: generateBuildingBlock,
    [PromptsType.FilterBar]: generateBuildingBlock,
    [PromptsType.Form]: generateBuildingBlock,
    [PromptsType.KPITag]: generateBuildingBlock,
    [PromptsType.RichTextEditor]: generateBuildingBlock,
    [PromptsType.RichTextEditorButtonGroups]: generateBuildingBlock,
    [PromptsType.Page]: generateBuildingBlock
};

export const PromptsCodePreviewMap = {
    [PromptsType.Chart]: getSerializedFileContent,
    [PromptsType.Table]: getSerializedFileContent,
    [PromptsType.FilterBar]: getSerializedFileContent,
    [PromptsType.Form]: getSerializedFileContent,
    [PromptsType.KPITag]: getSerializedFileContent,
    [PromptsType.RichTextEditor]: getSerializedFileContent,
    [PromptsType.RichTextEditorButtonGroups]: getSerializedFileContent,
    [PromptsType.Page]: getSerializedFileContent
};

export type SupportedGeneratorAnswers =
    | TablePromptsAnswer
    | ChartPromptsAnswer
    | FilterBarPromptsAnswer
    | FormPromptsAnswer
    | KPITagPromptsAnswer
    | PagePromptsAnswer
    | RichTextEditorPromptsAnswer
    | RichTextEditorButtonGroupsPromptsAnswer;
