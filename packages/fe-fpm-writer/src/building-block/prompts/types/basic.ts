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

export const enum PromptsType {
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

// ToDo - I think should not extend from Table
export interface TablePromptsAnswer extends Table, Answers {
    viewOrFragmentFile: string;
    aggregationPath: string;
    id: string;
    entity: string;
    filterBar: string;
    selectionChange: string;
    bindingContextType: 'relative' | 'absolute';
    qualifier: string;
    type: 'ResponsiveTable' | 'GridTable';
    displayHeader: boolean;
    tableHeaderText: string;
}

// ToDo - I think should not extend from Chart
export interface ChartPromptsAnswer extends Chart, Answers {
    viewOrFragmentFile: string;
    aggregationPath: string;
    id: string;
    entity: string;
    filterBar: string;
    selectionMode: string;
    selectionChange: string;
    qualifier: string;
    bindingContextType: 'relative' | 'absolute';
}

// ToDo - I think should not extend from FilterBar
export interface FilterBarPromptsAnswer extends FilterBar, Answers {
    qualifier: string;
    entity: string;
    viewOrFragmentFile: string;
}
