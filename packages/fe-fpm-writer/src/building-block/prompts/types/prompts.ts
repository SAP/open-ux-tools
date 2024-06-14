import type { Editor } from 'mem-fs-editor';
import type { Answers, ChartPromptsAnswer, FilterBarPromptsAnswer, Prompts, TablePromptsAnswer } from './basic';
import type { ProjectProvider } from '../utils';
import { BuildingBlockType } from '../../types';

interface Chart {
    // ToDo constand or new enum instead of BuildingBlockType enum?
    type: BuildingBlockType.Chart;
    answers: ChartPromptsAnswer;
}

interface Table {
    type: BuildingBlockType.Table;
    answers: TablePromptsAnswer;
}

interface FilterBar {
    type: BuildingBlockType.FilterBar;
    answers: FilterBarPromptsAnswer;
}

interface Field {
    type: BuildingBlockType.Field;
    answers: Answers;
}

export type SupportedPrompts = Chart | Table | FilterBar | Field;

export type NarrowPrompt<T, N = SupportedPrompts> = N extends { type: T } ? N : never;

export type SupportedPromptsMap = {
    [N in SupportedPrompts as N['type']]: (
        fs: Editor,
        basePath: string,
        projectProvider: ProjectProvider
    ) => Promise<Prompts<N['answers']>> | Prompts<N['answers']>;
};
