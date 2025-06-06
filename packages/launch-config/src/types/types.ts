import type { ODataVersion } from '@sap-ux/project-access';
import type { FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';

export enum Arguments {
    FrameworkVersion = '--framework-version',
    Open = '--open',
    Config = '--config'
}

export interface FioriOptions {
    name: string;
    projectRoot: string;
    oDataVersion?: ODataVersion;
    useMockData?: boolean;
    ui5Version?: string;
    ui5VersionUri?: string;
    ui5Local?: boolean;
    ui5LocalVersion?: string;
    startFile?: string;
    backendConfigs?: FioriToolsProxyConfigBackend[];
    urlParameters?: string;
    visible?: boolean;
    debugOptions?: DebugOptions;
    /**
     * Controls whether VS Code should reload when updating workspace folders.
     *
     * VS Code automatically reloads when workspace folders change and no files are open.
     * This flag allows you to override that behavior.
     *
     * - true (default) - Triggers a VS Code reload when updating workspace folders and no files are open.
     * - false - Prevents automatic reloads.
     *
     * Use this flag to dynamically manage workspace modifications.
     */
    enableVSCodeReload?: boolean;
}

export interface LaunchJSON {
    version: string;
    configurations: LaunchConfig[];
}

export interface LaunchConfig {
    name: string;
    cwd: string;
    runtimeArgs: string[];
    type: 'node';
    request: 'launch';
    runtimeExecutable: string;
    args?: string[];
    windows: {
        runtimeExecutable: string;
        args?: string[];
    };
    console: 'internalConsole';
    internalConsoleOptions: 'openOnSessionStart';
    outputCapture: 'std';
    env: LaunchConfigEnv;
}

export interface LaunchConfigEnv {
    FIORI_TOOLS_UI5_VERSION?: string;
    FIORI_TOOLS_UI5_URI?: string;
    FIORI_TOOLS_BACKEND_CONFIG?: string;
    FIORI_TOOLS_URL_PARAMS?: string;
    'run.config'?: string;
    DEBUG?: string;
}

export interface LaunchConfigInfo {
    launchConfigs: LaunchConfig[];
    filePath: string;
}

/**
 * Configuration options for debugging launch configurations.
 */
export interface DebugOptions {
    /** SAP client parameter for the connection. */
    sapClientParam?: string;
    /** FLP application ID. */
    flpAppId: string;
    /** Indicates if the FLP sandbox environment is available. */
    flpSandboxAvailable: boolean;
    /** Version of the OData service. */
    odataVersion?: ODataVersion;
    /** Indicates if the project is a Fiori Element. */
    isFioriElement?: boolean;
    /** Intent parameter for the migrator mock. */
    migratorMockIntent?: string;
    /** Indicates if the project is a migrator. */
    isMigrator?: boolean;
    /**
     * Determines the HTML file to be used,
     * and is set to `test/flpSandboxMockServer.html` if the project includes `test/flpSandboxMockServer.html`.
     * If targetMockHtmlFile is not provided, run time args defaults to use `test/flpSandbox.html` instead.
     */
    targetMockHtmlFile?: string;
    /** Indicates if the environment is SAP App Studio. */
    isAppStudio?: boolean;
    /** If true, write to the app only. */
    writeToAppOnly?: boolean;
    /** Reference to the VS Code instance. */
    vscode?: any;
    /**
     * Specifies whether start command configurations should be added to the `launch.json` file.
     *
     * - When `true`, start command configurations will be included in the `launch.json`.
     * - When `false` or undefined, start command configurations will not be added.
     * By default this is set to `true`.
     */
    addStartCmd?: boolean;
}

/**
 * Options for updating the workspace folder.
 */
export interface UpdateWorkspaceFolderOptions {
    /** Name of the project. */
    projectName: string;
    /** Reference to the VS Code instance. */
    vscode: any;
    /** URI of the workspace folder. */
    uri?: string;
}

/**
 * Information related to the workspace handler.
 */
export interface WorkspaceHandlerInfo {
    /** Path to the launch.json file in the workspace. */
    launchJsonPath: string;
    /** Current working directory of the workspace. */
    cwd: string;
    /** URI of the workspace folder. */
    workspaceFolderUri?: string;
    /** replace file and dont update if app is outside workspace */
    appNotInWorkspace?: boolean;
}
