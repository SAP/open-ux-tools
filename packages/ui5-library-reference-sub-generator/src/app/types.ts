import type { Prompts, AppWizard } from '@sap-devx/yeoman-ui-types';
import type { UI5LibraryReferenceAnswers } from '@sap-ux/ui5-library-reference-inquirer';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import type { BaseOptions } from 'yeoman-generator';

export interface UI5ReferenceLibGenerator {
    appWizard: AppWizard;
    answers: UI5LibraryReferenceAnswers;
    prompts: Prompts;
}

/**
 * Options accepted by this generator on top of the base Yeoman options. Yeoman v8's `BaseOptions`
 * no longer carries an index signature, so the custom options read here must be declared explicitly.
 */
export type UI5ReferenceLibGeneratorOptions = BaseOptions & {
    appWizard?: AppWizard;
    vscode?: unknown;
    logger?: IVSCodeExtLogger;
    logLevel?: LogLevel;
};
