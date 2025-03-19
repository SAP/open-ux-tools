import type Generator from 'yeoman-generator';
import { ListQuestionOptions } from 'inquirer';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import { Application } from '@sap-ux/adp-tooling';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';
import { YUIQuestion, GuiOptions, PromptSeverityMessage } from '@sap-ux/inquirer-common';

export interface AdpGeneratorOptions extends Generator.GeneratorOptions {
    /**
     * VSCode instance
     */
    vscode?: unknown;
    /**
     * Option to force the conflicter property of the yeoman environment (prevents additional prompt for overwriting files)
     */
    force?: boolean;
    /**
     * AppWizard instance
     */
    appWizard?: AppWizard;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Additional data for the generator
     */
    data?: {
        projectRootPath: string;
    };
}

/**
 * Enumeration of prompt names used in the configuration.
 */
export enum configPromptNames {
    system = 'system',
    username = 'username',
    password = 'password',
    application = 'application'
}

/**
 * Interface representing the answers collected from the configuration prompts.
 */
export interface ConfigAnswers {
    system: string;
    username: string;
    password: string;
    application: Application;
}

/**
 * The question type specific to configuration prompts.
 */
export interface ConfigQuestion extends YUIQuestion<ConfigAnswers>, Partial<Pick<ListQuestionOptions, 'choices'>> {
    name: configPromptNames;
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
    mask?: string;
}

/**
 * Options for individual prompts.
 */
export interface SystemPromptOptions {
    default?: string;
    hide?: boolean;
}

export interface UsernamePromptOptions {
    default?: string;
    hide?: boolean;
}

export interface PasswordPromptOptions {
    hide?: boolean;
}

export interface ApplicationPromptOptions {
    default?: string;
    hide?: boolean;
}

/**
 * Common options for the configuration inquirer.
 */
export interface ConfigPromptCommonOptions {}

/**
 * Options for the configuration inquirer & the prompts.
 */
export type ConfigPromptOptions = Partial<{
    [configPromptNames.system]: SystemPromptOptions;
    [configPromptNames.username]: UsernamePromptOptions;
    [configPromptNames.password]: PasswordPromptOptions;
    [configPromptNames.application]: ApplicationPromptOptions;
}> &
    ConfigPromptCommonOptions;
