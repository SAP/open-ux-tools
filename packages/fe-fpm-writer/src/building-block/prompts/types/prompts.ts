import type { Editor } from 'mem-fs-editor';
import type {
    BuildingBlockTypePromptsAnswer,
    ChartPromptsAnswer,
    FilterBarPromptsAnswer,
    Prompts,
    Subset,
    TablePromptsAnswer,
    PromptsType
} from './basic';
import type { ProjectProvider } from '../utils';

// ToDo constand or new enum instead of BuildingBlockType enum?
type AnswerMapping = {
    [PromptsType.Chart]: ChartPromptsAnswer;
    [PromptsType.Table]: TablePromptsAnswer;
    [PromptsType.FilterBar]: FilterBarPromptsAnswer;
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
    | BasePrompt<PromptsType.BuildingBlocks>;

export type SupportedGeneratorPrompts =
    | BasePrompt<PromptsType.Chart>
    | BasePrompt<PromptsType.Table>
    | BasePrompt<PromptsType.FilterBar>;

export type NarrowPrompt<T, N = SupportedPrompts> = N extends { type: T } ? N : never;

export type SupportedPromptsMap = {
    [N in SupportedPrompts as N['type']]: (
        fs: Editor,
        basePath: string,
        projectProvider: ProjectProvider
    ) => Promise<Prompts<N['answers']>> | Prompts<N['answers']>;
};
