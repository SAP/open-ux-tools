import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import type { Project } from '@sap-ux/project-access';
import type {
    PromptQuestion,
    CheckboxPromptQuestion,
    InputPromptQuestion,
    ListPromptQuestion,
    PromptListChoices,
    PromptsGroup,
    ValidationResults
} from '@sap-ux/ui-prompting';

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

export interface PromptContext {
    fs: Editor;
    project?: Project;
    appPath: string;
    appId: string;
}

// Apply Partial on all nested level in object
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

export enum CodeSnippetLanguage {
    JSON = 'json',
    CDS = 'cds',
    XML = 'xml',
    JS = 'javascript',
    TS = 'typescript',
    ABAPCDS = 'abapCds'
}

export interface FilePathProps {
    fileName?: string;
    relativePath?: string;
    fullPath?: string;
}

export interface CodeSnippet {
    language: CodeSnippetLanguage;
    content: string;
    index?: number;
    filePathProps?: FilePathProps;
}
