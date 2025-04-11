import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { VSCodeInstance, TelemetryData, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Quick deploy app config are applicable only in scenarios where an application
 * deployed via ADT Quick Deploy is being downloaded from a BSP repository.
 */
export interface QuickDeployedAppConfig {
    /**  application Id to be downloaded. */
    appId: string;
    /**  appUrl is the URL pointing to the application */
    appUrl?: string;
    /**  service provider is used to identify the system from which the app is downloaded from. */
    serviceProvider: AbapServiceProvider;
}
/**
 * Options for downloading a BSP application.
 */
export interface BspAppDownloadOptions extends Generator.GeneratorOptions {
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
}

/**
 * Answers related to system selection in the BSP application download process.
 */
export interface SystemSelectionAnswers {
    /**
     * Details of the connected system allowing downstream consumers to access it without creating new connections.
     */
    connectedSystem?: {
        /** Service provider for the connected ABAP system. */
        serviceProvider: AbapServiceProvider;

        /**
         * Persistable backend system representation of the connected service provider.
         * `newOrUpdated` is true if the system was newly created or updated during connection validation.
         */
        backendSystem?: BackendSystem & { newOrUpdated?: boolean };

        /** Destination details of the connected system. */
        destination?: Destination;
    };
}

/**
 * Represents a question in the app download process.
 * Extends `YUIQuestion` with optional autocomplete functionality.
 */
export type BspAppDownloadQuestions = YUIQuestion<BspAppDownloadAnswers> &
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
 * Enum representing the names of prompts used in the BSP application download process.
 */
export enum PromptNames {
    selectedApp = 'selectedApp',
    systemSelection = 'systemSelection',
    targetFolder = 'targetFolder'
}

/**
 * Structure of answers provided by the user for BSP application download prompts.
 */
export interface BspAppDownloadAnswers {
    /** Selected backend system connection details. */
    [PromptNames.systemSelection]: SystemSelectionAnswers;
    /** Information about the selected application for download. */
    [PromptNames.selectedApp]: AppInfo;
    /** Target folder where the BSP application will be generated. */
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
        master_language?: string;
    };
    service_binding_details: {
        name?: string;
        service_name: string;
        service_version: string;
        main_entity_name: string;
        navigation_entity?: string;
    };
    project_attribute: {
        module_name: string;
        application_title?: string;
        minimum_ui5_version?: string;
        template?: string;
    };
    deployment_details: {
        repository_name: string;
        repository_description?: string;
        transport_request?: string;
    };
    fiori_launchpad_configuration: {
        semantic_object: string;
        action: string;
        title: string;
        subtitle?: string;
    };
}
