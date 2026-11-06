import type { Prompts, AppWizard } from '@sap-devx/yeoman-ui-types';
import type { UI5LibraryAnswers } from '@sap-ux/ui5-library-inquirer';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
import type { BaseOptions } from 'yeoman-generator';

export interface Ui5LibGenerator {
    appWizard: AppWizard;
    answers: UI5LibraryAnswers;
    prompts: Prompts;
}

/**
 * Options accepted by this generator on top of the base Yeoman options. Yeoman v8's `BaseOptions`
 * is a union without an index signature, so the custom options read here are declared explicitly.
 */
export type Ui5LibGeneratorOptions = BaseOptions & {
    vscode?: unknown;
    logger?: IVSCodeExtLogger;
    logLevel?: LogLevel;
    skipInstall?: boolean;
};
