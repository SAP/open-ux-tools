import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { AttributesAnswers, ConfigAnswers } from '@sap-ux/adp-tooling';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';

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
    systemValidationCli = 'systemValidationCli',
    username = 'username',
    password = 'password',
    application = 'application',
    appValidationCli = 'appValidationCli'
}

/**
 * The question type specific to configuration prompts.
 */
export type ConfigQuestion = YUIQuestion<ConfigAnswers>;

/**
 * Options for individual prompts.
 */
export interface SystemPromptOptions {
    default?: string;
    hide?: boolean;
}

export interface CliValidationPromptOptions {
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
    [configPromptNames.systemValidationCli]: CliValidationPromptOptions;
    [configPromptNames.username]: UsernamePromptOptions;
    [configPromptNames.password]: PasswordPromptOptions;
    [configPromptNames.application]: ApplicationPromptOptions;
    [configPromptNames.appValidationCli]: CliValidationPromptOptions;
}>;

export enum attributePromptNames {
    projectName = 'projectName',
    title = 'title',
    namespace = 'namespace',
    targetFolder = 'targetFolder',
    ui5Version = 'ui5Version',
    ui5ValidationCli = 'ui5ValidationCli',
    enableTypeScript = 'enableTypeScript'
}

export type AttributesQuestion = YUIQuestion<AttributesAnswers>;

export interface ProjectNamePromptOptions {
    hide?: boolean;
}

export interface ApplicationTitlePromptOptions {
    default?: string;
    hide?: boolean;
}

export interface NamespacePromptOptions {
    default?: string;
    hide?: boolean;
}

export interface TargetFolderPromptOptions {
    default?: string;
}

export interface UI5VersionPromptOptions {
    default?: string;
}

export interface EnableTypeScriptPromptOptions {
    hide?: boolean;
}

export type AttributePromptOptions = Partial<{
    [attributePromptNames.projectName]: ProjectNamePromptOptions;
    [attributePromptNames.title]: ApplicationTitlePromptOptions;
    [attributePromptNames.namespace]: NamespacePromptOptions;
    [attributePromptNames.targetFolder]: TargetFolderPromptOptions;
    [attributePromptNames.ui5Version]: UI5VersionPromptOptions;
    [attributePromptNames.ui5ValidationCli]: CliValidationPromptOptions;
    [attributePromptNames.enableTypeScript]: EnableTypeScriptPromptOptions;
}>;

/**
 * An interface representing the json input used to store the complete adaptation project
 * generator configurations. The json is passed as an CLI argument.
 */
export interface AdpJsonInput {
    system: string;
    client: string;
    username: string;
    password: string;

    application: string;
    applicationTitle: string;
    targetFolder?: string;
    projectName?: string;
    namespace?: string;
}
