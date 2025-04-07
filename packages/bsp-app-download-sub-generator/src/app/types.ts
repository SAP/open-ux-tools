import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { VSCodeInstance, TelemetryData, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import type { AbapServiceProvider, AppIndex } from '@sap-ux/axios-extension';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import type { SystemSelectionAnswerType } from '@sap-ux/odata-service-inquirer';

/**
 * Options for downloading a BSP application.
 */
export interface BspAppDownloadOptions extends Generator.GeneratorOptions {
    /** VSCode instance for interacting with the VSCode environment. */
    vscode?: VSCodeInstance;

    /** AppWizard instance for managing the application download flow. */
    appWizard?: AppWizard;

    /** Indicates if the generator is launched as a subgenerator. */
    launchAppDownloaderAsSubGenerator?: boolean; // TODO: Verify this option.

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
    [PromptNames.systemSelection]: SystemSelectionAnswerType;
    /** Information about the selected application for download. */
    [PromptNames.selectedApp]: AppInfo;
    /** Target folder where the BSP application will be generated. */
    [PromptNames.targetFolder]: string;
}

interface Metadata {
    package: string;
    masterLanguage?: string;
}

export interface EntityConfig {
    mainEntityName: string;
    navigationEntity?: {
        EntitySet: string;
        Name: string;
    };
}

interface ServiceBindingDetails extends EntityConfig {
    name?: string;
    serviceName: string;
    serviceVersion: string;
}

interface ProjectAttribute {
    moduleName: string;
    applicationTitle?: string;
    template?: string;
    minimumUi5Version?: string;
}

interface DeploymentDetails {
    repositoryName: string;
    repositoryDescription?: string;
}

interface FioriLaunchpadConfiguration {
    semanticObject: string;
    action: string;
    title: string;
    subtitle?: string;
}

export interface AppContentConfig {
    metadata: Metadata;
    serviceBindingDetails: ServiceBindingDetails;
    projectAttribute: ProjectAttribute;
    deploymentDetails: DeploymentDetails;
    fioriLaunchpadConfiguration: FioriLaunchpadConfiguration;
}
