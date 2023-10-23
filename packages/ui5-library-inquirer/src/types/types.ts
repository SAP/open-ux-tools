import type { UI5Version } from '@sap-ux/ui5-info';
import type { ListChoiceOptions } from 'inquirer';

export interface UI5LibraryAnswers {
    libraryName?: string;
    namespace?: string;
    targetFolder?: string;
    ui5Version?: string;
    enableTypescript?: boolean;
}

export interface UI5LibraryPromptInput {
    versions?: UI5Version[];
    targetFolder?: string;
}

export interface UI5VersionChoice extends ListChoiceOptions {
    version: UI5Version;
}
