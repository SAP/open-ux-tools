/**
 * Interface representing additional entries for the README file.
 */
interface AdditionalEntries {
    /** The label for the additional entry. */
    label: string;
    /** The value corresponding to the label of the additional entry. */
    value: string;
}

/**
 * Interface representing the configuration for generating a README file.
 * Extends OptionalEntries to include dynamic properties along with the core properties.
 */
export interface ReadMe {
    /** The name of the application. */
    appName: string;
    /** The title of the application. */
    appTitle: string;
    /** The namespace of the application. */
    appNamespace: string;
    /** The description of the application. */
    appDescription: string;
    /** The UI5 theme used in the application. */
    ui5Theme: string;
    /** The name of generator used. */
    generatorName: string;
    /** The version of the generator used. */
    generatorVersion: string;
    /** The ui5 version used in the application. */
    ui5Version: string;
    /** The floorplan template name used to generate the application. */
    template: string;
    /** The date when the generator was run. */
    generationDate?: string;
    /** The service URL of the application */
    serviceUrl?: string;
    /** The service type for the application. */
    serviceType?: string;
    /** The platform on which the generator was run.  */
    generatorPlatform?: string;
    /** The filename of the metadata file */
    metadataFilename?: string;
    /** Flag indicating whether code assistance is enabled. */
    enableCodeAssist?: boolean;
    /** Flag indicating whether TypeScript is enabled. */
    enableTypeScript?: boolean;
    /** Flag indicating whether ESLint is enabled. */
    enableEslint?: boolean;
    /** Flag indicating whether to show mock data info. */
    showMockDataInfo?: boolean;
    /** Text used to launch the application */
    launchText?: string;
    /** Additional custom entries for the application. */
    additionalEntries?: AdditionalEntries[];
}
/**
 * Interface for the yeoman environment.
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
 * Interface for the VSCode instance.
 */
export interface VSCodeInstance {
    commands: { executeCommand: (command: string, ...rest: any[]) => Promise<void> };
}

/**
 * Defines the structure for the `package.json` scripts section.
 */
export interface PackageJsonScripts {
    /** The command to start the application. */
    start: string;
    /** The command to start the application with local configuration */
    'start-local': string;
    /** Optional command to start the application without flp command. */
    'start-noflp'?: string;
    /** Optional command to start the application with a mock server configuration. */
    'start-mock'?: string;
    /** Optional command to run tests. */
    'int-test'?: string;
    /** Optional command to add the variants management script. */
    'start-variants-management'?: string;
}

/**
 * Defines the options for generating `package.json` scripts.
 */
export interface PackageScriptsOptions {
    /** Specifies whether only a local server is available. If true, certain scripts may display a warning message. */
    localOnly: boolean;
    /** Indicates if a script for using a mock server should be added. Defaults to true. */
    addMock?: boolean;
    /** Indicates if a script for running integration tests should be added. Defaults to false. */
    addTest?: boolean;
    /** The SAP client to be used, if applicable. */
    sapClient?: string;
    /** The flp app ID to be used in URLs. */
    flpAppId?: string;
    /** The path to the file that should be opened with the `start` script. */
    startFile?: string;
    /** The path to the file that should be opened with the `start-local` script. */
    localStartFile?: string;
    /** If true, a script for starting the app without flp will be generated. Defaults to true. */
    generateIndex?: boolean;
}
