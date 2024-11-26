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
