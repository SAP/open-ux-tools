import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { VSCodeInstance, TelemetryData, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { AppIndex, AbapServiceProvider } from '@sap-ux/axios-extension';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Identifies which download flow is active.
 * ADTQuickDeploy: app was quick-deployed via ADT; uses qfa.json for config.
 * AbapRepository: app lives in ABAP UI5 repository; config is read from manifest.
 */
export const AppDownloadType = {
    ADTQuickDeploy: 'adtQuickDeploy',
    AbapRepository: 'abapRepository'
};

export type AppDownloadType = (typeof AppDownloadType)[keyof typeof AppDownloadType];

/**
 * Context for the ADT Quick Deploy download flow.
 */
export interface AdtQuickDeployContext {
    appDownloadType: typeof AppDownloadType.ADTQuickDeploy;
    qfaJson: QfaJsonConfig;
    serviceProvider?: AbapServiceProvider;
}

/**
 * Context for the ABAP Repository download flow.
 */
export interface AbapRepositoryContext {
    appDownloadType: typeof AppDownloadType.AbapRepository;
    serviceProvider?: AbapServiceProvider;
}

/**
 * Union of download contexts.
 */
export type AppDownloadContext = AdtQuickDeployContext | AbapRepositoryContext;

/**
 * Quick deploy app config are applicable only in scenarios where an application
 * deployed via ADT Quick Deploy is being downloaded from a repository.
 */
export interface QuickDeployedAppConfig {
    /**  application Id to be downloaded. */
    appId: string;
    /**  appUrl is the URL pointing to the application */
    appUrl?: string;
    /**
     * Information about the system from which the application is to be downloaded.
     */
    serviceProviderInfo?: {
        /**
         * The base URL of the system providing the application.
         */
        serviceUrl?: string;
        /**
         * The name of the system providing the application.
         */
        name: string;
    };
}

/**
 * Options for downloading an application from repository.
 */
export interface RepoAppDownloadOptions extends Generator.GeneratorOptions {
    /** VSCode instance for interacting with the VSCode environment. */
    vscode?: VSCodeInstance;

    /** The quick deploy config is provided only when an ADT quick deployed app is being downloaded */
    quickDeployedAppConfig?: QuickDeployedAppConfig;

    /** AppWizard instance for managing the application download flow. */
    appWizard?: AppWizard;

    /** Path to the application root where the Fiori launchpad configuration will be added. */
    appRootPath?: string;

    /** Telemetry data for tracking events post deployment configuration. */
    telemetryData?: TelemetryData;

    /** Logger instance for logging operations. */
    logWrapper?: LogWrapper;

    /** The type of app download. */
    appDownloadType?: AppDownloadType;
}

/**
 * Represents a question in the app download process.
 * Extends `YUIQuestion` with optional autocomplete functionality.
 */
export type RepoAppDownloadQuestions = YUIQuestion<RepoAppDownloadAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

// Extract the type of a single element in the AppIndex array
export type AppItem = AppIndex extends (infer U)[] ? U : never;

export interface AppInfo {
    appId: string;
    title: string;
    description: string;
    repoName: string;
    url: string;
}

/**
 * Enum representing the names of prompts used in the application download process.
 */
export enum PromptNames {
    selectedApp = 'selectedApp',
    systemSelection = 'systemSelection',
    targetFolder = 'targetFolder'
}

/**
 * Structure of answers provided by the user for application download prompts.
 */
export interface RepoAppDownloadAnswers {
    /** Selected backend system connection details. */
    [PromptNames.systemSelection]: OdataServiceAnswers;
    /** Information about the selected application for download. */
    [PromptNames.selectedApp]: AppInfo;
    /** Target folder where the application will be generated. */
    [PromptNames.targetFolder]: string;
}

/**
 * Interface representing the configuration of a QFA JSON file.
 * This QFA JSON file is used for configuring the application download process
 * and contains user inputs.
 */
export interface QfaJsonConfig {
    metadata: {
        package: string;
        masterLanguage?: string;
    };
    serviceBindingDetails: {
        name?: string;
        serviceName: string;
        serviceVersion: string;
        mainEntityName: string;
        navigationEntity?: string;
    };
    projectAttribute: {
        moduleName: string;
        applicationTitle?: string;
        minimumUi5Version?: string;
        template?: string;
    };
    deploymentDetails: {
        repositoryName: string;
        repositoryDescription?: string;
    };
    fioriLaunchpadConfiguration: {
        semanticObject: string;
        action: string;
        title: string;
        subtitle?: string;
    };
}
