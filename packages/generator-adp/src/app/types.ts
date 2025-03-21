import type Generator from 'yeoman-generator';
import type { ListQuestionOptions } from 'inquirer';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { ConfigAnswers } from '@sap-ux/adp-tooling';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';
import type { YUIQuestion, GuiOptions, PromptSeverityMessage } from '@sap-ux/inquirer-common';

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
     * A boolean flag indicating whether node_modules should be installed after project generation.
     */
    shouldInstallDeps?: boolean;
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
 * Options for the configuration inquirer & the prompts.
 */
export type ConfigPromptOptions = Partial<{
    [configPromptNames.system]: SystemPromptOptions;
    [configPromptNames.username]: UsernamePromptOptions;
    [configPromptNames.password]: PasswordPromptOptions;
    [configPromptNames.application]: ApplicationPromptOptions;
}>;
