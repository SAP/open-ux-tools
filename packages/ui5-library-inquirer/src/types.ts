import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { UI5Version } from '@sap-ux/ui5-info';

export interface UI5LibraryAnswers {
    libraryName?: string;
    namespace?: string;
    targetFolder?: string;
    ui5Version?: string;
    enableTypescript?: boolean;
}

export interface Options extends UI5LibraryAnswers {
    // YUI only
    appWizard?: AppWizard;
    skipInstall?: boolean;
}

export interface UI5LibraryPromptInput {
    versions?: UI5Version[];
    targetFolder?: string;
}
