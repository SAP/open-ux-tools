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
import type { Chart, FilterBar, Table } from '../../types';

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
    questions: PromptQuestion<Partial<T>>[];
    groups?: PromptsGroup[];
}

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: PromptsType;
}

export interface BaseBuildingBlockPromptAnswer extends Answers {
    viewOrFragmentFile: string;
    aggregationPath: string;
    entity: string;
    qualifier: string;
}

// ToDo - not sure if should extend from Table
export interface TablePromptsAnswer extends Table, BaseBuildingBlockPromptAnswer {}

// ToDo - not sure if should extend from Chart
export interface ChartPromptsAnswer extends Chart, BaseBuildingBlockPromptAnswer {}

// ToDo - not sure if should extend from FilterBar
export interface FilterBarPromptsAnswer extends FilterBar, BaseBuildingBlockPromptAnswer {}

export type SupportedAnswers = TablePromptsAnswer | ChartPromptsAnswer | FilterBarPromptsAnswer;
