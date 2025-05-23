import type { ReadMe } from '@sap-ux/fiori-generator-shared';
import type {
    DatasourceType,
    OdataServicePromptOptions,
    OdataVersion,
    promptNames
} from '@sap-ux/odata-service-inquirer';
import type { UI5ApplicationPromptOptions } from '@sap-ux/ui5-application-inquirer';

/**
 * package.json script entries (commands and tasks)
 */
export type Script = {
    name: string;
    command: string;
};

/**
 * workspace folder
 */
export type WorkspaceFolder = {
    folderName: string;
    path: string;
};

// Union type of all `@sap-ux/ui5-application-inquirer` and selected `@sap-ux/odata-service-inquirer` prompt options
export type FioriAppGeneratorPromptSettings = UI5ApplicationPromptOptions &
    Pick<OdataServicePromptOptions, promptNames.systemSelection>;

/**
 * Custom environment type until yeoman-environment provides one
 */
export interface YeomanEnvironment {
    conflicter: {
        force: boolean;
    };
    adapter: {
        actualAdapter: unknown;
    };
}
/**
 * Defines the options required for generating a launch configuration for a project.
 */
export interface GenerateLaunchConfigOptions {
    /** The type of data source used by the project (e.g. metadata file or OData source URL). */
    datasourceType: DatasourceType;
    /** SAP client parameter. */
    sapClientParam?: string;
    /** The file path to the root directory of the project. */
    targetFolder: string;
    /** The name of the project. */
    projectName: string;
    /** The application ID for the project. */
    flpAppId?: string;
    /** Optional OData service version (e.g. v2 or v4). */
    odataVersion?: OdataVersion;
}

/**
 * Metadata for an ABAP CSN (Core Schema Notation)
 */
export interface AbapCsn {
    packageUri: string;
    csnName: string;
    serviceNameCsn: string;
    datasourceKey?: string;
}

/**
 * Interface for .appGenInfo file
 */
export interface AppGenInfo {
    generationParameters?: Partial<ReadMe>;
    abapCSN?: AbapCsn[];
}
