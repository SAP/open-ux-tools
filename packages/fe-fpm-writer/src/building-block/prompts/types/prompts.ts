import type { Editor } from 'mem-fs-editor';
import type { Answers, ChartPromptsAnswer, FilterBarPromptsAnswer, Prompts, TablePromptsAnswer } from './basic';
import type { ProjectProvider } from '../utils';
import { BuildingBlockType } from '../../types';

// ToDo constand or new enum instead of BuildingBlockType enum?
type AnswerMapping = {
    [BuildingBlockType.Chart]: ChartPromptsAnswer;
    [BuildingBlockType.Table]: TablePromptsAnswer;
    [BuildingBlockType.FilterBar]: FilterBarPromptsAnswer;
    [BuildingBlockType.Field]: Answers;
};

type BasePrompt<T extends keyof AnswerMapping> = {
    type: T;
    answers: AnswerMapping[T];
};

export type SupportedPrompts =
    | BasePrompt<BuildingBlockType.Chart>
    | BasePrompt<BuildingBlockType.Table>
    | BasePrompt<BuildingBlockType.FilterBar>
    | BasePrompt<BuildingBlockType.Field>;

export type NarrowPrompt<T, N = SupportedPrompts> = N extends { type: T } ? N : never;

export type SupportedPromptsMap = {
    [N in SupportedPrompts as N['type']]: (
        fs: Editor,
        basePath: string,
        projectProvider: ProjectProvider
    ) => Promise<Prompts<N['answers']>> | Prompts<N['answers']>;
};
