import { Prompts, type AppWizard } from '@sap-devx/yeoman-ui-types';
import type { UI5LibraryAnswers } from '@sap-ux/ui5-library-inquirer';

export interface LibAnswers {
    libraryName?: string;
    namespace?: string;
    targetFolder?: string;
    ui5Version?: string;
    enableTypescript?: boolean;
}

export interface Ui5LibGenerator {
    appWizard: AppWizard;
    answers: UI5LibraryAnswers;
    prompts: Prompts;
}
