import type { Prompts, AppWizard } from '@sap-devx/yeoman-ui-types';
import type { UI5LibraryReferenceAnswers } from '@sap-ux/ui5-library-reference-inquirer';

export interface UI5ReferenceLibGenerator {
    appWizard: AppWizard;
    answers: UI5LibraryReferenceAnswers;
    prompts: Prompts;
}
