import type { Answers as IAnswers } from 'inquirer';
import type { PromptQuestion } from '@sap-ux/ui-prompting';
import type { BuildingBlockType, Chart, FilterBar, Table } from '../types';

export interface PromptsGroup {
    id: string;
    title: string;
    description: string[];
}

export type Answers = IAnswers;

export interface Prompts<T extends Answers> {
    questions: PromptQuestion<T>[];
    groups?: PromptsGroup[];
}

export interface BuildingBlockTypePromptsAnswer extends Answers {
    buildingBlockType: BuildingBlockType;
}

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

export interface FilterBarPromptsAnswer extends FilterBar, Answers {
    qualifier: string;
    entity: string;
    viewOrFragmentFile: string;
}

// ToDo - import from ui types
export type ValidationResults = { [questionName: string]: { isValid: boolean; errorMessage?: string } };

export interface AdditionalPromptProperties {
    required?: boolean;
    groupId?: string;
    additionalInfo?: string;
    placeholder?: string;
}
