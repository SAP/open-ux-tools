import type { Answers } from 'inquirer';
import type {
    PromptQuestion,
    CheckboxPromptQuestion,
    InputPromptQuestion,
    ListPromptQuestion,
    PromptListChoices,
    PromptsGroup,
    ValidationResults
} from '@sap-ux/ui-prompting';
import type { Chart, FilterBar, Table, BuildingBlockConfig } from '../../types';

export type Subset<K> = {
    [attr in keyof K]?: K[attr] extends object
        ? Subset<K[attr]>
        : K[attr] extends object | null
        ? Subset<K[attr]> | null
        : K[attr] extends object | null | undefined
        ? Subset<K[attr]> | null | undefined
        : K[attr];
};

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export {
    PromptQuestion,
    PromptListChoices,
    CheckboxPromptQuestion,
    InputPromptQuestion,
    ListPromptQuestion,
    Answers,
    PromptsGroup,
    ValidationResults
};

export enum PromptsType {
    FilterBar = 'filter-bar',
    Chart = 'chart',
    Table = 'table',
    BuildingBlocks = 'building-blocks'
}

export interface Prompts<T extends Answers = Answers> {
    questions: PromptQuestion<Subset<T>>[];
    groups?: PromptsGroup[];
    initialAnswers?: Subset<T>;
}

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: PromptsType;
}

export type TablePromptsAnswer = BuildingBlockConfig<Table> & Answers;
export type ChartPromptsAnswer = BuildingBlockConfig<Chart> & Answers;
export type FilterBarPromptsAnswer = BuildingBlockConfig<FilterBar> & Answers;

export type SupportedAnswers = TablePromptsAnswer | ChartPromptsAnswer | FilterBarPromptsAnswer;
